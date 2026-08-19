import * as THREE from 'three'
import { STUDIO_V2_ANCHORS } from './studioV2Anchors'
import { createStudioV2GltfLoader } from './studioV2GltfLoader'
import { createStudioV2PhotoPackagingPreview } from './studioV2PhotoPackaging'
import { STUDIO_V2_PHOTO_BOARD_SURFACE } from './studioV2PhotoBoardLayout'

export const STUDIO_V2_SCENE_EXPANSION_IDS = Object.freeze({
  photoBoard: 'PHOTO_BOARD_01',
  photoBoardSurface: 'PHOTO_BOARD_SURFACE',
  photoBoardFrame: 'PHOTO_BOARD_FRAME',
  camera: 'POLAROID_CAMERA_01',
})

const ASSET_CONFIG = Object.freeze({
  photoBoard: Object.freeze({
    id: STUDIO_V2_SCENE_EXPANSION_IDS.photoBoard,
    resourceKey: 'photoBoardUrl',
    targetAxis: 'x',
    targetSize: 1.35,
    canonicalBasis: Object.freeze({
      width: Object.freeze([1, 0, 0]),
      height: Object.freeze([0, 1, 0]),
      normal: Object.freeze([0, 0, 1]),
    }),
    role: 'photoBoard',
  }),
  camera: Object.freeze({
    id: STUDIO_V2_SCENE_EXPANSION_IDS.camera,
    resourceKey: 'polaroidCameraUrl',
    targetAxis: 'x',
    targetSize: 0.17,
    role: 'camera',
  }),
})

const TEXTURE_PROPERTIES = Object.freeze([
  'map',
  'emissiveMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
])

function roundedVector(vector, digits = 4) {
  return vector.toArray().map((value) => Number(value.toFixed(digits)))
}

function boundsRecord(bounds) {
  return {
    min: roundedVector(bounds.min),
    max: roundedVector(bounds.max),
    size: roundedVector(bounds.getSize(new THREE.Vector3())),
    center: roundedVector(bounds.getCenter(new THREE.Vector3())),
  }
}

function textureFormatName(texture) {
  if (!texture || texture.format === undefined) return null
  return Object.entries(THREE).find(([name, value]) => (
    name.endsWith('Format') && value === texture.format
  ))?.[0] ?? `FORMAT_${texture.format}`
}

function tuneMaterial(source, role) {
  const material = source.clone()
  material.name = `StudioV2Expansion_${role}_${source.name || 'Material'}`
  if ('envMapIntensity' in material) material.envMapIntensity = 0.72
  if (role === 'photo') {
    if ('metalness' in material) material.metalness = 0
    if ('roughness' in material) material.roughness = source.name === 'initialShadingGroup' ? 0.48 : 0.72
  } else if (role === 'camera') {
    if ('roughness' in material) material.roughness = source.name === 'metal' ? 0.38 : Math.max(0.5, material.roughness)
    if ('metalness' in material && source.name !== 'metal') material.metalness = 0
    if ('envMapIntensity' in material) material.envMapIntensity = source.name === 'metal' ? 0.88 : 0.68
  } else if (role === 'photoBoard') {
    const isSurface = source.name.includes('SURFACE')
    if ('metalness' in material) material.metalness = 0
    if ('roughness' in material) material.roughness = isSurface ? 0.94 : 0.72
    if ('envMapIntensity' in material) material.envMapIntensity = isSurface ? 0.42 : 0.58
  }
  material.needsUpdate = true
  return material
}

function configureModel(model, role, renderer) {
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  const materialMap = new Map()
  const textures = new Set()
  let meshes = 0
  let triangles = 0
  const shadowDisabledMeshes = []
  model.traverse((object) => {
    if (!object.isMesh) return
    meshes += 1
    triangles += (object.geometry?.index?.count ?? object.geometry?.attributes?.position?.count ?? 0) / 3
    object.castShadow = role !== 'photo' && role !== 'photoBoard'
    object.receiveShadow = true
    if (!object.castShadow) shadowDisabledMeshes.push(object.name)
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const refinedMaterials = sourceMaterials.map((source) => {
      if (!materialMap.has(source)) materialMap.set(source, tuneMaterial(source, role))
      const refined = materialMap.get(source)
      TEXTURE_PROPERTIES.forEach((property) => {
        const texture = refined[property]
        if (!texture) return
        texture.anisotropy = maxAnisotropy
        texture.needsUpdate = true
        textures.add(texture)
      })
      return refined
    })
    object.material = Array.isArray(object.material) ? refinedMaterials : refinedMaterials[0]
  })
  return {
    allMaterials: new Set([...materialMap.keys(), ...materialMap.values()]),
    anisotropy: maxAnisotropy,
    materials: materialMap.size,
    meshes,
    shadowDisabledMeshes,
    textureFormats: [...new Set([...textures].map(textureFormatName).filter(Boolean))].sort(),
    textures: textures.size,
    triangles: Math.round(triangles),
  }
}

function normalizeAsset(model, { targetAxis, targetSize, canonicalBasis = null }) {
  const normalized = new THREE.Group()
  normalized.name = 'NORMALIZED_ASSET'
  const oriented = new THREE.Group()
  oriented.name = 'CANONICAL_ORIENTATION'
  if (canonicalBasis) {
    const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3().fromArray(canonicalBasis.width),
      new THREE.Vector3().fromArray(canonicalBasis.height),
      new THREE.Vector3().fromArray(canonicalBasis.normal),
    )
    oriented.quaternion.setFromRotationMatrix(basis.invert())
  }
  oriented.add(model)
  normalized.add(oriented)
  normalized.updateMatrixWorld(true)
  const orientedBounds = new THREE.Box3().setFromObject(oriented, true)
  const orientedSize = orientedBounds.getSize(new THREE.Vector3())
  const scale = targetSize / orientedSize[targetAxis]
  const center = orientedBounds.getCenter(new THREE.Vector3())
  if (canonicalBasis) oriented.position.set(-center.x, -center.y, -center.z)
  else oriented.position.set(-center.x, -orientedBounds.min.y, -center.z)
  normalized.scale.setScalar(scale)
  normalized.updateMatrixWorld(true)
  return {
    group: normalized,
    rawBounds: boundsRecord(orientedBounds),
    scale,
  }
}

function placementRecord({ anchor, config, gltf, normalized, placement, resources, semanticIds }) {
  placement.updateMatrixWorld(true)
  return {
    anchorName: config.id,
    anchorScale: anchor.scale,
    assetScale: normalized.scale,
    animations: gltf.animations.length,
    position: [...anchor.position],
    rotation: [...anchor.rotation],
    surfaceNormal: [...anchor.surfaceNormal],
    sourceBounds: normalized.rawBounds,
    worldBounds: boundsRecord(new THREE.Box3().setFromObject(placement, true)),
    semanticIds,
    resources: {
      anisotropy: resources.anisotropy,
      materialOverrides: [],
      materials: resources.materials,
      meshes: resources.meshes,
      shadowDisabledMeshes: resources.shadowDisabledMeshes,
      textures: resources.textures,
      textureFormats: resources.textureFormats,
      triangles: resources.triangles,
    },
    url: config.url,
  }
}

function createStaticPlacement(gltf, renderer, config, url) {
  const anchor = STUDIO_V2_ANCHORS[config.id]
  const model = gltf.scene
  model.name = `${config.id}_MODEL`
  model.userData.studioV2Id = `${config.id}_MODEL`
  const resources = configureModel(model, config.role, renderer)
  if (config.role === 'photoBoard') {
    model.traverse((object) => {
      if (!object.isMesh) return
      const materialName = Array.isArray(object.material)
        ? object.material.map((material) => material.name).join(' ')
        : object.material?.name ?? ''
      const semanticId = materialName.includes('SURFACE')
        ? STUDIO_V2_SCENE_EXPANSION_IDS.photoBoardSurface
        : STUDIO_V2_SCENE_EXPANSION_IDS.photoBoardFrame
      object.name = semanticId
      object.userData.studioV2Id = semanticId
    })
  }
  const normalized = normalizeAsset(model, config)
  normalized.group.name = `${config.id}_NORMALIZED_ASSET`
  let scaleAnchor = null
  if (config.role === 'photoBoard') {
    normalized.group.updateMatrixWorld(true)
    const normalizedBounds = new THREE.Box3().setFromObject(normalized.group, true)
    const viewFacingTopLeft = new THREE.Vector3(
      normalizedBounds.max.x,
      normalizedBounds.max.y,
      normalizedBounds.getCenter(new THREE.Vector3()).z,
    )
    normalized.group.position.x -= viewFacingTopLeft.x
    normalized.group.position.y -= viewFacingTopLeft.y
    scaleAnchor = Object.freeze({
      corner: 'VIEW_FACING_TOP_LEFT',
      localOffsetApplied: Object.freeze([
        Number((-viewFacingTopLeft.x).toFixed(4)),
        Number((-viewFacingTopLeft.y).toFixed(4)),
        0,
      ]),
      uniformScale: anchor.scale,
    })
  }
  const placement = new THREE.Group()
  placement.name = config.id
  placement.userData.studioV2Id = config.id
  placement.userData.studioV2Anchor = config.id
  placement.position.fromArray(anchor.position)
  placement.rotation.fromArray(anchor.rotation)
  placement.scale.setScalar(anchor.scale)
  placement.add(normalized.group)
  const semanticIds = [config.id]
  if (config.role === 'photoBoard') {
    const futurePlacementPlane = STUDIO_V2_PHOTO_BOARD_SURFACE
    placement.userData.futurePlacementPlane = futurePlacementPlane
    placement.userData.scaleAnchor = scaleAnchor
    placement.userData.sourceCleanup = Object.freeze({
      decorativeComponentsRemoved: 112,
      embeddedImagesRetained: 0,
      retainedStructuralComponents: 14,
    })
    semanticIds.push(
      STUDIO_V2_SCENE_EXPANSION_IDS.photoBoardSurface,
      STUDIO_V2_SCENE_EXPANSION_IDS.photoBoardFrame,
    )
  }
  const record = placementRecord({
    anchor,
    config: { ...config, url },
    gltf,
    normalized,
    placement,
    resources,
    semanticIds,
  })
  if (config.role === 'photoBoard') {
    record.futurePlacementPlane = placement.userData.futurePlacementPlane
    record.scaleAnchor = placement.userData.scaleAnchor
    record.sourceCleanup = placement.userData.sourceCleanup
  }
  return { placement, record, resources }
}

function entryDelay(testConfig, id) {
  const delay = Number(testConfig?.delays?.[id] ?? 0)
  return Number.isFinite(delay) ? Math.max(0, delay) : 0
}

async function loadAsset(loader, url, id, testConfig) {
  const delay = entryDelay(testConfig, id)
  const [gltf] = await Promise.all([
    loader.loadAsync(url),
    delay > 0 ? new Promise((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve(),
  ])
  if (testConfig?.failAsset === id) {
    const error = new Error(`Entry-critical asset test failure: ${id}`)
    error.assetId = id
    throw error
  }
  return gltf
}

function disposeGroup(group, additionalMaterials) {
  const geometries = new Set()
  const materials = new Set(additionalMaterials)
  const textures = new Set()
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      if (!material) return
      materials.add(material)
      TEXTURE_PROPERTIES.forEach((property) => {
        if (material[property]?.isTexture) textures.add(material[property])
      })
    })
  })
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
}

export async function loadStudioV2SceneExpansion(scene, renderer, deliveryConfig, {
  onAssetReady,
  photoBoardGrid = false,
  photoSlotOverlay = false,
  testConfig,
} = {}) {
  const loaderSupport = await createStudioV2GltfLoader(renderer, deliveryConfig)
  let disposed = false
  const urls = {
    photoBoard: deliveryConfig.photoBoardUrl,
    camera: deliveryConfig.polaroidCameraUrl,
  }
  const photoBoardGltf = await loadAsset(
    loaderSupport.loader,
    urls.photoBoard,
    STUDIO_V2_SCENE_EXPANSION_IDS.photoBoard,
    testConfig,
  )
  const photoBoardPlacement = createStaticPlacement(
    photoBoardGltf,
    renderer,
    ASSET_CONFIG.photoBoard,
    urls.photoBoard,
  )
  const unavailablePhotoPackaging = (error = null) => {
    const emptyGroup = new THREE.Group()
    emptyGroup.name = 'PHOTO_PACKAGING_PREVIEW_UNAVAILABLE'
    return {
      group: emptyGroup,
      records: [],
      report: Object.freeze({
        arbitraryCountSupported: true,
        bootstrap: false,
        debugCoordinateOverlay: false,
        error: error ? (error instanceof Error ? error.message : String(error)) : null,
        positionedCount: 0,
        previewCount: 0,
      }),
    }
  }

  const createRoomPhotoPackaging = async () => {
    try {
      return await createStudioV2PhotoPackagingPreview({
        boardScale: STUDIO_V2_ANCHORS[ASSET_CONFIG.photoBoard.id].scale,
        debugCoordinateOverlay: photoBoardGrid,
        debugSlotOverlay: photoSlotOverlay,
        manifestUrl: deliveryConfig.photoManifestUrl,
        renderer,
      })
    } catch (error) {
      return unavailablePhotoPackaging(error)
    }
  }

  const photoPackaging = await createRoomPhotoPackaging()
  const photoWallState = photoPackaging.report.error ? 'error' : 'ready'
  photoBoardPlacement.placement.add(photoPackaging.group)
  if (photoWallState === 'ready') {
    onAssetReady?.('PHOTO_WALL_PHOTOS', {
      positionedCount: photoPackaging.report.positionedCount,
      qualityTier: 'room',
      semanticIds: photoPackaging.records.map(({ id }) => id),
      url: deliveryConfig.photoManifestUrl,
    })
  }
  photoBoardPlacement.placement.userData.photoPackaging = photoPackaging.report
  photoBoardPlacement.record.photoPackaging = photoPackaging.report
  photoBoardPlacement.record.semanticIds.push(...photoPackaging.records.map(({ id }) => id))

  const visualReadyGltfPromise = loadAsset(
    loaderSupport.loader,
    urls.camera,
    STUDIO_V2_SCENE_EXPANSION_IDS.camera,
    testConfig,
  )
  visualReadyGltfPromise.catch(() => {})

  const placements = [photoBoardPlacement]
  const records = placements.map(({ record }) => record)
  const textureFormats = [...new Set(
    placements.flatMap(({ resources }) => resources.textureFormats),
  )].sort()
  let visualReadyPromise = null
  let visualReadyState = 'loading'
  const group = new THREE.Group()
  group.name = 'FredStudioV2SceneExpansion'
  group.userData.studioV2Id = 'SCENE_EXPANSION_STAGE5B'
  placements.forEach(({ placement }) => group.add(placement))
  scene.add(group)
  placements.forEach(({ record }) => onAssetReady?.(record.anchorName, {
    semanticIds: record.semanticIds,
    url: record.url,
  }))

  const loadVisualReadyAssets = () => {
    if (disposed) return Promise.resolve({ records: [], status: 'disposed' })
    if (visualReadyPromise) return visualReadyPromise
    visualReadyPromise = visualReadyGltfPromise.then((cameraGltf) => {
      if (disposed) return { records: [], status: 'disposed' }
      const visualReadyPlacements = [
        createStaticPlacement(cameraGltf, renderer, ASSET_CONFIG.camera, urls.camera),
      ]
      visualReadyPlacements.forEach(({ placement }) => group.add(placement))
      visualReadyPlacements.forEach(({ record }) => onAssetReady?.(record.anchorName, {
        semanticIds: record.semanticIds,
        url: record.url,
        visualReady: true,
      }))
      placements.push(...visualReadyPlacements)
      records.push(...visualReadyPlacements.map(({ record }) => record))
      textureFormats.splice(0, textureFormats.length, ...new Set(
        placements.flatMap(({ resources }) => resources.textureFormats),
      ))
      visualReadyState = 'ready'
      return { records: visualReadyPlacements.map(({ record }) => record), status: visualReadyState }
    }).catch((error) => {
      visualReadyState = 'error'
      throw error
    })
    return visualReadyPromise
  }

  return {
    group,
    records,
    textureFormats,
    getVisualReadyState: () => visualReadyState,
    getPhotoWallState: () => photoWallState,
    getPhotoWallTextureState: () => photoPackaging.textureTiers?.getState() ?? null,
    getMaterialMode: () => 'refined',
    activatePhotoDetailQuality: (id) => (
      photoPackaging.textureTiers?.activateDetailQuality(id) ?? false
    ),
    activatePhotoWallFocusQuality: () => (
      photoPackaging.textureTiers?.activateFocusQuality() ?? false
    ),
    activatePhotoWallRoomQuality: () => (
      photoPackaging.textureTiers?.activateRoomQuality() ?? false
    ),
    loadVisualReadyAssets,
    preloadPhotoWallFocusQuality: () => (
      photoPackaging.textureTiers?.preloadFocusQuality() ?? Promise.resolve(false)
    ),
    preparePhotoDetailQuality: (id) => (
      photoPackaging.textureTiers?.prepareDetailQuality(id) ?? Promise.resolve(false)
    ),
    restorePhotoDetailQuality: (id) => (
      photoPackaging.textureTiers?.restoreDetailQuality(id) ?? false
    ),
    setMaterialMode: () => 'refined',
    dispose() {
      disposed = true
      photoPackaging.textureTiers?.dispose()
      group.removeFromParent()
      disposeGroup(
        group,
        new Set(placements.flatMap(({ resources }) => [...resources.allMaterials])),
      )
      loaderSupport.dispose()
    },
  }
}

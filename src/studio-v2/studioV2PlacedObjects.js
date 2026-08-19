import * as THREE from 'three'
import { STUDIO_V2_ANCHORS } from './studioV2Anchors'
import { createStudioV2GltfLoader } from './studioV2GltfLoader'

const MAP_PROPERTIES = Object.freeze([
  'map',
  'emissiveMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
])

const override = (definition) => Object.freeze({
  ...definition,
  original: Object.freeze({ source: 'GLTFLoader runtime snapshot before refinement' }),
  preservedMaps: MAP_PROPERTIES,
  refined: Object.freeze(definition.refined),
})

export const MACBOOK_MATERIAL_OVERRIDES = Object.freeze([
  override({
    id: 'macbook-aluminium-deck',
    meshNames: Object.freeze(['Object_4']),
    refinedMaterialName: 'StudioV2MacBookAluminium',
    reason: 'Separate the shared source material for a controlled anodized-aluminium chassis and deck response.',
    refined: {
      anisotropy: 0.16,
      anisotropyRotation: 0,
      clearcoat: 0.04,
      clearcoatRoughness: 0.68,
      emissiveIntensity: 0.05,
      envMapIntensity: 0.92,
      metalness: 0.88,
      normalScale: 0.48,
      roughness: 0.36,
      usePhysicalMaterial: true,
    },
  }),
  override({
    id: 'macbook-display-glass',
    meshNames: Object.freeze(['Object_6']),
    refinedMaterialName: 'StudioV2MacBookDisplayGlass',
    reason: 'Keep the embedded Mac desktop readable with a restrained screen surface and minimal environment reflection.',
    refined: {
      clearcoat: 0.08,
      clearcoatRoughness: 0.62,
      emissiveIntensity: 0.62,
      envMapIntensity: 0.16,
      metalness: 0,
      normalScale: 0.18,
      roughness: 0.38,
      usePhysicalMaterial: true,
    },
  }),
  override({
    id: 'macbook-hinge',
    meshNames: Object.freeze(['Object_8']),
    refinedMaterialName: 'StudioV2MacBookHinge',
    reason: 'Give the audited hinge mesh a denser metal response without affecting the screen or chassis.',
    refined: {
      emissiveIntensity: 0.02,
      envMapIntensity: 1,
      metalness: 0.9,
      normalScale: 0.4,
      roughness: 0.32,
    },
  }),
])

export const MARSHALL_MATERIAL_OVERRIDES = Object.freeze([
  override({
    id: 'marshall-cabinet-tolex-grille-atlas',
    materialNames: Object.freeze(['Marshall_Amp_Body']),
    refinedMaterialName: 'StudioV2MarshallCabinet',
    reason: 'Reuse the shared cabinet/grille colour atlas as a low-level emissive map so its existing tolex/grille separation remains visible without a uniform black lift.',
    refined: {
      emissive: '#ffffff',
      emissiveIntensity: 0.3,
      emissiveMapFromMap: true,
      envMapIntensity: 0.78,
      metalness: 0,
      normalScale: 0.68,
      roughness: 0.64,
    },
  }),
  override({
    id: 'marshall-control-panel',
    materialNames: Object.freeze(['Marshall_Amp_Panel']),
    refinedMaterialName: 'StudioV2MarshallControlPanel',
    reason: 'Separate the metal control-panel response from the soft cabinet atlas.',
    refined: { envMapIntensity: 1.02, metalness: 0.84, normalScale: 0.55, roughness: 0.34 },
  }),
  override({
    id: 'marshall-hardware',
    materialNames: Object.freeze(['Anis']),
    refinedMaterialName: 'StudioV2MarshallHardware',
    reason: 'Use the audited repeated detail meshes for restrained metallic corners, controls, and hardware.',
    refined: { envMapIntensity: 1.04, metalness: 0.86, normalScale: 0.48, roughness: 0.34 },
  }),
  override({
    id: 'marshall-small-accessory',
    materialNames: Object.freeze(['Material']),
    refinedMaterialName: 'StudioV2MarshallAccessory',
    reason: 'Keep the small non-textured accessory readable without making it chrome.',
    refined: { envMapIntensity: 0.5, metalness: 0.08, roughness: 0.5 },
  }),
  override({
    id: 'marshall-label',
    materialNames: Object.freeze(['Label']),
    refinedMaterialName: 'StudioV2MarshallLabel',
    reason: 'Preserve the original non-emissive label colour with enough matte contrast to remain readable.',
    refined: { emissiveIntensity: 0, envMapIntensity: 0.42, metalness: 0, roughness: 0.48 },
  }),
])

export const GUITAR_MATERIAL_OVERRIDES = Object.freeze([
  override({
    id: 'guitar-lacquered-lower-body',
    materialNames: Object.freeze(['Body_Bottom']),
    refinedMaterialName: 'StudioV2GuitarBodyBottom',
    reason: 'Retain the body colour atlas and add a controlled lacquer layer to the curved lower shell.',
    refined: { clearcoat: 0.62, clearcoatRoughness: 0.2, envMapIntensity: 0.9, metalness: 0, normalScale: 0.58, roughness: 0.36 },
  }),
  override({
    id: 'guitar-body-detail-hardware-atlas',
    materialNames: Object.freeze(['Body_Detail']),
    refinedMaterialName: 'StudioV2GuitarBodyDetail',
    reason: 'Balance the source atlas shared by body detail, pickups, pickguard, and hardware without forcing all pixels fully metallic.',
    refined: { clearcoat: 0.28, clearcoatRoughness: 0.22, envMapIntensity: 1.02, metalness: 0.52, normalScale: 0.55, roughness: 0.32 },
  }),
  override({
    id: 'guitar-neck',
    materialNames: Object.freeze(['Neck']),
    refinedMaterialName: 'StudioV2GuitarNeck',
    reason: 'Preserve wood grain with a softer neck finish than the lacquered body.',
    refined: { clearcoat: 0.12, clearcoatRoughness: 0.42, envMapIntensity: 0.62, metalness: 0, normalScale: 0.58, roughness: 0.5 },
  }),
  override({
    id: 'guitar-fretboard',
    materialNames: Object.freeze(['FretBoard']),
    refinedMaterialName: 'StudioV2GuitarFretboard',
    reason: 'Keep the fretboard darker and less reflective than the lacquered body while preserving its map detail.',
    refined: { clearcoat: 0, envMapIntensity: 0.4, metalness: 0, normalScale: 0.55, roughness: 0.68 },
  }),
  override({
    id: 'guitar-strings-hardware',
    materialNames: Object.freeze(['Strings']),
    refinedMaterialName: 'StudioV2GuitarStrings',
    reason: 'Give the dedicated string and metal-hardware atlas narrow controlled highlights.',
    refined: { clearcoat: 0, envMapIntensity: 1.16, metalness: 0.95, normalScale: 0.5, roughness: 0.24 },
  }),
  override({
    id: 'guitar-lacquered-body',
    materialNames: Object.freeze(['Body']),
    refinedMaterialName: 'StudioV2GuitarBody',
    reason: 'Add a restrained lacquer clearcoat while preserving the original sunburst colour and PBR maps.',
    refined: { clearcoat: 0.62, clearcoatRoughness: 0.2, envMapIntensity: 0.94, metalness: 0, normalScale: 0.58, roughness: 0.36 },
  }),
  override({
    id: 'guitar-cable-jacket',
    materialNames: Object.freeze(['Material.006']),
    refinedMaterialName: 'StudioV2GuitarCableJacket',
    reason: 'Keep the red cable jacket non-metallic and softly integrated with the floor lighting.',
    refined: { envMapIntensity: 0.42, metalness: 0, roughness: 0.74 },
  }),
  override({
    id: 'guitar-cable-detail',
    materialNames: Object.freeze(['Strings.001']),
    refinedMaterialName: 'StudioV2GuitarCableDetail',
    reason: 'Treat the separately audited BezierCurve detail as accessory hardware rather than the guitar strings.',
    refined: { clearcoat: 0, envMapIntensity: 0.72, metalness: 0.28, normalScale: 0.5, roughness: 0.46 },
  }),
])

const MATERIAL_OVERRIDES_BY_ANCHOR = Object.freeze({
  MACBOOK_ISLAND_01: MACBOOK_MATERIAL_OVERRIDES,
  MARSHALL_GUITAR_FLOOR_01: Object.freeze([
    ...MARSHALL_MATERIAL_OVERRIDES,
    ...GUITAR_MATERIAL_OVERRIDES,
  ]),
})

export const STUDIO_V2_PLACED_OBJECTS = Object.freeze({
  MARSHALL_GUITAR: Object.freeze({
    anchorName: 'MARSHALL_GUITAR_FLOOR_01',
    dimensionAxes: Object.freeze({ depth: 'x', height: 'y', width: 'z' }),
    measurementRootName: 'Cube.027',
    targetWidth: 0.77,
    targetWidthTolerance: 0.02,
    url: '/models/fred-studio-v2/objects/marshall_amp.glb',
  }),
  MACBOOK_PRO_2021: Object.freeze({
    anchorName: 'MACBOOK_ISLAND_01',
    dimensionAxes: Object.freeze({ depth: 'x', height: 'y', width: 'z' }),
    targetWidth: 0.3557,
    targetWidthTolerance: 0,
    url: '/models/fred-studio-v2/objects/macbook_pro_2021.glb',
  }),
})

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(4)))
}

function boundsRecord(bounds) {
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  return {
    min: roundedVector(bounds.min),
    max: roundedVector(bounds.max),
    size: roundedVector(size),
    center: roundedVector(center),
  }
}

const AXIS_INDEX = Object.freeze({ x: 0, y: 1, z: 2 })

function physicalDimensions(size, axes) {
  return {
    width: Number(size.getComponent(AXIS_INDEX[axes.width]).toFixed(8)),
    height: Number(size.getComponent(AXIS_INDEX[axes.height]).toFixed(8)),
    depth: Number(size.getComponent(AXIS_INDEX[axes.depth]).toFixed(8)),
  }
}

function calculateUniformScale(config, rawDimensions) {
  const widthDerivedScale = config.targetWidth / rawDimensions.width
  const withinNativeTolerance = Math.abs(rawDimensions.width - config.targetWidth)
    <= config.targetWidthTolerance
  const scale = withinNativeTolerance ? 1 : widthDerivedScale
  return {
    scale,
    widthDerivedScale,
    withinNativeTolerance,
    targetWidth: config.targetWidth,
    targetWidthTolerance: config.targetWidthTolerance,
    finalDimensions: Object.fromEntries(
      Object.entries(rawDimensions).map(([name, value]) => [
        name,
        Number((value * scale).toFixed(8)),
      ]),
    ),
  }
}

function guitarLengthRecord(model, scale) {
  let guitarRoot = null
  model.traverse((object) => {
    if (guitarRoot || object.children.length === 0) return
    if (object.name.startsWith('Les_Paul_Body')) guitarRoot = object
  })
  if (!guitarRoot) return null
  const raw = new THREE.Box3().setFromObject(guitarRoot).getSize(new THREE.Vector3()).y
  return {
    raw: Number(raw.toFixed(8)),
    final: Number((raw * scale).toFixed(8)),
  }
}

function findMeasurementRoot(model, requestedName) {
  if (!requestedName) return model
  const normalizedRequestedName = requestedName.replace(/[^a-z0-9]/gi, '').toLowerCase()
  let match = null
  model.traverse((object) => {
    if (match || object.children.length === 0) return
    const normalizedName = object.name.replace(/[^a-z0-9]/gi, '').toLowerCase()
    if (normalizedName === normalizedRequestedName) match = object
  })
  if (!match) throw new Error(`Missing measurement root: ${requestedName}`)
  return match
}

function findMaterialOverride(anchorName, mesh, material) {
  const overrides = MATERIAL_OVERRIDES_BY_ANCHOR[anchorName] ?? []
  return overrides.find((candidate) => (
    candidate.meshNames?.includes(mesh.name)
    || candidate.materialNames?.includes(material.name)
  )) ?? null
}

function textureRecord(texture) {
  if (!texture) return null
  const image = texture.image ?? texture.source?.data
  return {
    anisotropy: texture.anisotropy,
    colorSpace: texture.colorSpace || THREE.NoColorSpace,
    height: image?.height ?? null,
    name: texture.name || null,
    width: image?.width ?? null,
  }
}

function textureFormatName(texture) {
  if (!texture || texture.format === undefined) return null
  return Object.entries(THREE).find(([name, value]) => (
    name.endsWith('Format') && value === texture.format
  ))?.[0] ?? `FORMAT_${texture.format}`
}

function materialSnapshot(material) {
  return {
    clearcoat: 'clearcoat' in material ? material.clearcoat : null,
    clearcoatRoughness: 'clearcoatRoughness' in material ? material.clearcoatRoughness : null,
    color: material.color?.getHexString?.() ?? null,
    emissive: material.emissive?.getHexString?.() ?? null,
    emissiveIntensity: material.emissiveIntensity ?? null,
    emissiveMap: material.emissiveMap?.name || null,
    envMapIntensity: material.envMapIntensity ?? null,
    flatShading: Boolean(material.flatShading),
    metalness: material.metalness ?? null,
    name: material.name,
    normalScale: material.normalScale?.x ?? null,
    opacity: material.opacity,
    roughness: material.roughness ?? null,
    transparent: material.transparent,
    type: material.type,
  }
}

function cloneAsPhysicalMaterial(source) {
  const material = new THREE.MeshPhysicalMaterial()
  THREE.MeshStandardMaterial.prototype.copy.call(material, source)
  material.defines = { STANDARD: '', PHYSICAL: '' }
  return material
}

function createRefinedMaterial(source, materialOverride) {
  const values = materialOverride?.refined ?? {}
  const usePhysical = values.usePhysicalMaterial || (
    ('clearcoat' in values || 'anisotropy' in values) && !source.isMeshPhysicalMaterial
  )
  const material = usePhysical ? cloneAsPhysicalMaterial(source) : source.clone()
  if (materialOverride?.refinedMaterialName) material.name = materialOverride.refinedMaterialName
  const scalarProperties = [
    'anisotropy',
    'anisotropyRotation',
    'clearcoat',
    'clearcoatRoughness',
    'emissiveIntensity',
    'envMapIntensity',
    'metalness',
    'roughness',
  ]
  scalarProperties.forEach((property) => {
    if (Number.isFinite(values[property]) && property in material) {
      material[property] = values[property]
    }
  })
  if (Number.isFinite(values.normalScale) && material.normalScale) {
    material.normalScale.setScalar(values.normalScale)
  }
  if (values.color && material.color) material.color.set(values.color)
  if (values.emissive && material.emissive) material.emissive.set(values.emissive)
  if (values.emissiveMapFromMap && material.map) material.emissiveMap = material.map
  material.needsUpdate = true
  return material
}

function configureTexture(texture, property, maxAnisotropy, corrections, textures) {
  if (!texture) return
  const expectedColorSpace = property === 'map' || property === 'emissiveMap'
    ? THREE.SRGBColorSpace
    : THREE.NoColorSpace
  if (texture.colorSpace !== expectedColorSpace) {
    corrections.push({
      from: texture.colorSpace || THREE.NoColorSpace,
      property,
      texture: texture.name || texture.uuid,
      to: expectedColorSpace,
    })
    texture.colorSpace = expectedColorSpace
  }
  texture.anisotropy = maxAnisotropy
  texture.needsUpdate = true
  textures.add(texture)
}

function configureObjectMeshes(model, anchorName, renderer, {
  assetRole = 'combined',
  selectiveShadows = false,
} = {}) {
  let meshes = 0
  let materialMode = 'refined'
  const maxAnisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() ?? 1, 8)
  const bindings = []
  const materialPairs = new Map()
  const sourceMaterials = new Set()
  const textures = new Set()
  const colorSpaceCorrections = []
  const shadowDisabledMeshes = []

  model.traverse((object) => {
    if (!object.isMesh) return
    meshes += 1
    const guitarMicroDetail = assetRole === 'guitar'
      && (object.name.includes('Strings') || object.name.includes('BezierCurve'))
    const marshallMicroDetail = assetRole === 'marshall'
      && object.name.includes('Anis_0')
      && (object.geometry?.index?.count ?? 0) <= 6000
    object.castShadow = !(selectiveShadows && (guitarMicroDetail || marshallMicroDetail))
    object.receiveShadow = true
    if (!object.castShadow) shadowDisabledMeshes.push(object.name)
    const sourceArray = Array.isArray(object.material) ? object.material : [object.material]
    const pairs = sourceArray.map((source) => {
      const materialOverride = findMaterialOverride(anchorName, object, source)
      const cacheKey = `${source.uuid}:${materialOverride?.id ?? 'unmodified'}`
      if (!materialPairs.has(cacheKey)) {
        sourceMaterials.add(source)
        MAP_PROPERTIES.forEach((property) => {
          configureTexture(source[property], property, maxAnisotropy, colorSpaceCorrections, textures)
        })
        const original = source.clone()
        const refined = createRefinedMaterial(source, materialOverride)
        materialPairs.set(cacheKey, {
          id: materialOverride?.id ?? 'unmodified',
          original,
          originalSnapshot: materialSnapshot(original),
          preservedMaps: Object.fromEntries(MAP_PROPERTIES.map((property) => [
            property,
            textureRecord(source[property]),
          ])),
          reason: materialOverride?.reason ?? 'No scalar override required.',
          refined,
          refinedSnapshot: materialSnapshot(refined),
          source,
          targetMeshes: [],
        })
      }
      const pair = materialPairs.get(cacheKey)
      pair.targetMeshes.push(object.name)
      return pair
    })
    bindings.push({ mesh: object, pairs, wasArray: Array.isArray(object.material) })
    const refined = pairs.map((pair) => pair.refined)
    object.material = Array.isArray(object.material) ? refined : refined[0]
  })

  const setMode = (nextMode) => {
    materialMode = nextMode === 'original' ? 'original' : 'refined'
    bindings.forEach(({ mesh, pairs, wasArray }) => {
      const nextMaterials = pairs.map((pair) => pair[materialMode])
      mesh.material = wasArray ? nextMaterials : nextMaterials[0]
    })
    return materialMode
  }

  const pairs = [...materialPairs.values()]
  return {
    allMaterials: new Set([
      ...sourceMaterials,
      ...pairs.flatMap((pair) => [pair.original, pair.refined]),
    ]),
    getMode: () => materialMode,
    record: {
      anisotropy: maxAnisotropy,
      colorSpaceCorrections,
      materialOverrides: pairs.map((pair) => ({
        id: pair.id,
        original: pair.originalSnapshot,
        preservedMaps: pair.preservedMaps,
        reason: pair.reason,
        refined: pair.refinedSnapshot,
        targetMeshes: [...new Set(pair.targetMeshes)],
      })),
      materials: pairs.length,
      meshes,
      normalCorrections: [],
      shadowDisabledMeshes,
      textures: textures.size,
      textureFormats: [...new Set([...textures].map(textureFormatName).filter(Boolean))].sort(),
      tunedMaterials: pairs
        .filter((pair) => pair.id !== 'unmodified')
        .map((pair) => pair.refined.name),
    },
    setMode,
  }
}

function createPlacedObject(config, gltf, renderer) {
  const anchor = STUDIO_V2_ANCHORS[config.anchorName]
  if (!anchor) throw new Error(`Missing Studio V2 anchor: ${config.anchorName}`)

  const placementGroup = new THREE.Group()
  placementGroup.name = config.anchorName
  placementGroup.position.fromArray(anchor.position)
  placementGroup.rotation.fromArray(anchor.rotation)
  placementGroup.scale.setScalar(anchor.scale)
  placementGroup.userData.studioV2Anchor = config.anchorName
  placementGroup.userData.studioV2Id = config.anchorName

  const normalizedAsset = new THREE.Group()
  normalizedAsset.name = `${config.anchorName}_NORMALIZED_ASSET`
  placementGroup.add(normalizedAsset)

  const model = gltf.scene
  model.name = `${config.anchorName}_MODEL`
  const sourceBounds = new THREE.Box3().setFromObject(model)
  const measurementRoot = findMeasurementRoot(model, config.measurementRootName)
  const measurementBounds = new THREE.Box3().setFromObject(measurementRoot)
  const measurementSize = measurementBounds.getSize(new THREE.Vector3())
  const rawDimensions = physicalDimensions(measurementSize, config.dimensionAxes)
  const calibration = calculateUniformScale(config, rawDimensions)
  normalizedAsset.scale.setScalar(calibration.scale)
  const guitarLength = guitarLengthRecord(model, calibration.scale)
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3())
  model.position.add(new THREE.Vector3(-sourceCenter.x, -sourceBounds.min.y, -sourceCenter.z))
  normalizedAsset.add(model)

  const materialConfiguration = configureObjectMeshes(model, config.anchorName, renderer)
  placementGroup.updateMatrixWorld(true)
  const worldBounds = new THREE.Box3().setFromObject(placementGroup)

  return {
    allMaterials: materialConfiguration.allMaterials,
    group: placementGroup,
    getMaterialMode: materialConfiguration.getMode,
    record: {
      anchorName: config.anchorName,
      anchorScale: anchor.scale,
      assetScale: calibration.scale,
      scaleCalibration: {
        rawDimensions,
        finalDimensions: calibration.finalDimensions,
        targetWidth: calibration.targetWidth,
        targetWidthTolerance: calibration.targetWidthTolerance,
        widthDerivedScale: calibration.widthDerivedScale,
        withinNativeTolerance: calibration.withinNativeTolerance,
      },
      position: [...anchor.position],
      rotation: [...anchor.rotation],
      surfaceNormal: [...anchor.surfaceNormal],
      sourceBounds: boundsRecord(sourceBounds),
      measurementBounds: boundsRecord(measurementBounds),
      worldBounds: boundsRecord(worldBounds),
      resources: materialConfiguration.record,
      guitarRetained: config.anchorName === 'MARSHALL_GUITAR_FLOOR_01',
      guitarLength,
      url: config.url,
    },
    setMaterialMode: materialConfiguration.setMode,
  }
}

function combinedResourceRecord(configurations) {
  return {
    anisotropy: Math.max(...configurations.map((configuration) => configuration.record.anisotropy)),
    colorSpaceCorrections: configurations.flatMap((configuration) => configuration.record.colorSpaceCorrections),
    materialOverrides: configurations.flatMap((configuration) => configuration.record.materialOverrides),
    materials: configurations.reduce((total, configuration) => total + configuration.record.materials, 0),
    meshes: configurations.reduce((total, configuration) => total + configuration.record.meshes, 0),
    normalCorrections: configurations.flatMap((configuration) => configuration.record.normalCorrections),
    shadowDisabledMeshes: configurations.flatMap((configuration) => configuration.record.shadowDisabledMeshes),
    textures: configurations.reduce((total, configuration) => total + configuration.record.textures, 0),
    textureFormats: [...new Set(configurations.flatMap((configuration) => configuration.record.textureFormats))].sort(),
    tunedMaterials: configurations.flatMap((configuration) => configuration.record.tunedMaterials),
  }
}

function createSplitMusicPlacement(deliveryConfig, marshallGltf, guitarGltf, renderer) {
  const anchorName = 'MARSHALL_GUITAR_FLOOR_01'
  const anchor = STUDIO_V2_ANCHORS[anchorName]
  const placementGroup = new THREE.Group()
  placementGroup.name = anchorName
  placementGroup.position.fromArray(anchor.position)
  placementGroup.rotation.fromArray(anchor.rotation)
  placementGroup.scale.setScalar(anchor.scale)
  placementGroup.userData.studioV2Anchor = anchorName
  placementGroup.userData.studioV2Id = anchorName

  const normalizedAsset = new THREE.Group()
  normalizedAsset.name = `${anchorName}_NORMALIZED_ASSET`
  normalizedAsset.scale.setScalar(deliveryConfig.musicNormalisation.scale)
  placementGroup.add(normalizedAsset)

  const models = new THREE.Group()
  models.name = `${anchorName}_SPLIT_MODELS`
  models.position.fromArray(deliveryConfig.musicNormalisation.offset)
  normalizedAsset.add(models)

  const marshallModel = marshallGltf.scene
  marshallModel.name = 'MARSHALL_AMP'
  marshallModel.userData.studioV2Id = 'MARSHALL_AMP'
  const guitarModel = guitarGltf.scene
  guitarModel.name = 'GIBSON_GUITAR'
  guitarModel.userData.studioV2Id = 'GIBSON_GUITAR'
  models.add(marshallModel, guitarModel)

  const configurations = [
    configureObjectMeshes(marshallModel, anchorName, renderer, {
      assetRole: 'marshall',
      selectiveShadows: deliveryConfig.selectiveShadows,
    }),
    configureObjectMeshes(guitarModel, anchorName, renderer, {
      assetRole: 'guitar',
      selectiveShadows: deliveryConfig.selectiveShadows,
    }),
  ]
  placementGroup.updateMatrixWorld(true)
  const worldBounds = new THREE.Box3().setFromObject(placementGroup)
  const resources = combinedResourceRecord(configurations)

  return {
    allMaterials: new Set(configurations.flatMap((configuration) => [...configuration.allMaterials])),
    group: placementGroup,
    getMaterialMode: () => configurations[0].getMode(),
    record: {
      anchorName,
      anchorScale: anchor.scale,
      assetScale: deliveryConfig.musicNormalisation.scale,
      scaleCalibration: {
        rawDimensions: { width: 0.75507191, height: 0.97626678, depth: 0.40000771 },
        finalDimensions: { width: 0.75507191, height: 0.97626678, depth: 0.40000771 },
        targetWidth: 0.77,
        targetWidthTolerance: 0.02,
        widthDerivedScale: 1.019771745,
        withinNativeTolerance: true,
      },
      position: [...anchor.position],
      rotation: [...anchor.rotation],
      surfaceNormal: [...anchor.surfaceNormal],
      sourceBounds: deliveryConfig.musicNormalisation.sourceCombinedBounds,
      worldBounds: boundsRecord(worldBounds),
      resources,
      guitarRetained: true,
      guitarLength: guitarLengthRecord(guitarModel, deliveryConfig.musicNormalisation.scale),
      delivery: {
        guitar: deliveryConfig.guitar,
        marshall: deliveryConfig.marshall,
        textures: deliveryConfig.textures,
        meshCompression: deliveryConfig.meshCompression,
        selectiveShadows: deliveryConfig.selectiveShadows,
      },
      urls: [deliveryConfig.marshallUrl, deliveryConfig.guitarUrl],
    },
    setMaterialMode(mode) {
      configurations.forEach((configuration) => configuration.setMode(mode))
      return mode === 'original' ? 'original' : 'refined'
    },
  }
}

function disposePlacedGroup(group, additionalMaterials = new Set()) {
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()
  group.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      if (!material) return
      materials.add(material)
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value)
      })
    })
  })
  additionalMaterials.forEach((material) => materials.add(material))
  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
}

function entryDelay(testConfig, assetIds) {
  return Math.max(...assetIds.map((assetId) => testConfig?.delays?.[assetId] ?? 0), 0)
}

async function loadEntryAsset(
  loader,
  url,
  assetIds,
  testConfig,
  onAssetReady,
  onAssetProgress,
) {
  const request = loader.loadAsync(url, (event) => {
    assetIds.forEach((assetId) => onAssetProgress?.(assetId, event))
  })
  const delay = entryDelay(testConfig, assetIds)
  const [gltf] = await Promise.all([
    request,
    delay > 0 ? new Promise((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve(),
  ])
  const failedAsset = assetIds.find((assetId) => testConfig?.failAsset === assetId)
  if (failedAsset) {
    const error = new Error(`Entry-critical asset test failure: ${failedAsset}`)
    error.assetId = failedAsset
    throw error
  }
  assetIds.forEach((assetId) => onAssetReady?.(assetId, { url }))
  return gltf
}

export async function loadStudioV2PlacedObjects(scene, renderer, deliveryConfig, {
  onAssetProgress,
  onAssetReady,
  onPlacementReady,
  testConfig,
} = {}) {
  const loaderSupport = await createStudioV2GltfLoader(renderer, deliveryConfig)
  const loader = loaderSupport.loader
  const macbookGltf = await loadEntryAsset(
    loader,
    deliveryConfig.macbookUrl,
    ['MACBOOK_ISLAND_01'],
    testConfig,
    onAssetReady,
    onAssetProgress,
  )
  const placements = [createPlacedObject({
    ...STUDIO_V2_PLACED_OBJECTS.MACBOOK_PRO_2021,
    url: deliveryConfig.macbookUrl,
  }, macbookGltf, renderer)]
  const group = new THREE.Group()
  group.name = 'FredStudioV2PlacedObjects'
  placements.forEach((placement) => group.add(placement.group))
  scene.add(group)
  placements.forEach((placement) => {
    onPlacementReady?.(placement.record.anchorName, {
      semanticId: placement.group.userData.studioV2Id,
    })
  })
  let materialMode = 'refined'

  const setMaterialMode = (mode) => {
    materialMode = mode === 'original' ? 'original' : 'refined'
    placements.forEach((placement) => placement.setMaterialMode(materialMode))
    return materialMode
  }

  return {
    group,
    getMaterialMode: () => materialMode,
    records: placements.map((placement) => placement.record),
    selectedGpuTextureFormat: loaderSupport.selectedGpuTextureFormat,
    textureFormats: [...new Set(placements.flatMap((placement) => placement.record.resources.textureFormats ?? []))].sort(),
    setMaterialMode,
    dispose() {
      group.removeFromParent()
      disposePlacedGroup(
        group,
        new Set(placements.flatMap((placement) => [...placement.allMaterials])),
      )
      loaderSupport.dispose()
    },
  }
}

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import {
  OFFICIAL_CAMERA_SAFE_VOLUME,
  OFFICIAL_REAR_VIRTUAL_WALL,
  OFFICIAL_VIEW_MAX_AZIMUTH,
  OFFICIAL_VIEW_MIN_AZIMUTH,
  OFFICIAL_VIEW_SECTOR,
  STUDIO_V2_CAMERA_PRESETS,
  STUDIO_V2_CONTROLS,
  STUDIO_V2_DEFAULT_CAMERA,
  STUDIO_V2_LIGHTING,
  STUDIO_V2_LIGHTING_CANDIDATES,
  STUDIO_V2_SELECTED_LIGHTING,
  STUDIO_V2_MODEL_TRANSFORM,
  STUDIO_V2_OFFICIAL_CONTROLS,
  STUDIO_V2_RENDERING,
} from './studioV2Config'
import { createStudioV2CameraSafety } from './studioV2CameraSafety'
import { auditStudioV2Model } from './studioV2ModelAudit'
import {
  applyStudioV2MaterialTuning,
  findStudioV2EnvironmentMesh,
} from './studioV2MaterialTuning'
import {
  removeStudioV2DiningSet,
  removeStudioV2WindowDecoration,
} from './studioV2ModelPruning'
import { acquireStudioV2Model } from './studioV2ModelResource'
import { loadStudioV2PlacedObjects } from './studioV2PlacedObjects'
import { createStudioV2DeliveryConfig } from './studioV2DerivativeConfig'
import { createStudioV2GltfLoader } from './studioV2GltfLoader'
import { createStudioV2EntryGate } from './studioV2EntryGate'

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)))
}

function cameraConfigForPreset(presetName) {
  return STUDIO_V2_CAMERA_PRESETS[presetName] ?? STUDIO_V2_CAMERA_PRESETS[STUDIO_V2_DEFAULT_CAMERA]
}

function applyCameraConfig(camera, controls, config) {
  camera.position.fromArray(config.position)
  camera.fov = config.fov
  camera.near = config.near ?? camera.near
  camera.far = config.far ?? camera.far
  camera.updateProjectionMatrix()
  controls.target.fromArray(config.target)
  controls.update()
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2
}

function responsiveFov(baseFov, width) {
  return width < 700 ? Math.min(74, baseFov + 22) : baseFov
}

export function createStudioV2Scene({
  mount,
  capture = false,
  debug = false,
  onDiagnostics,
  onEntryState,
  onError,
  onProgress,
  onReady,
  onRoomReady,
  onStudioV2Ready,
  deliveryConfig,
  entryTestConfig,
  initialCameraPreset = STUDIO_V2_DEFAULT_CAMERA,
  initialAssetMaterialMode = 'refined',
  initialLightingCandidate,
  pixelRatioCap = STUDIO_V2_RENDERING.maxPixelRatio,
  forcedViewport,
}) {
  const activeDeliveryConfig = deliveryConfig ?? createStudioV2DeliveryConfig({}, false)
  const initialLighting = STUDIO_V2_LIGHTING_CANDIDATES[initialLightingCandidate]
    ?? STUDIO_V2_LIGHTING
  const indirectLighting = STUDIO_V2_LIGHTING
  const officialPresentation = !debug && !capture
  const stableOrbitMode = !capture
  const renderSize = () => ({
    width: forcedViewport?.[0] ?? Math.max(1, mount.clientWidth),
    height: forcedViewport?.[1] ?? Math.max(1, mount.clientHeight),
  })
  const initialRenderSize = renderSize()
  RectAreaLightUniformsLib.init()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(STUDIO_V2_RENDERING.clearColor)
  scene.environmentIntensity = initialLighting.environmentIntensity
  const entryRoot = new THREE.Group()
  entryRoot.name = 'STUDIO_V2_ENTRY_ROOT'
  entryRoot.userData.studioV2Id = 'STUDIO_V2_ENTRY_ROOT'
  scene.add(entryRoot)

  const renderer = new THREE.WebGLRenderer({
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioCap))
  renderer.setSize(initialRenderSize.width, initialRenderSize.height)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = initialLighting.exposure
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  mount.appendChild(renderer.domElement)

  const cameraSafety = createStudioV2CameraSafety({
    safeOrbit: stableOrbitMode,
    furnitureCollisionExperimental: false,
  })
  const initialPreset = cameraSafety.clampConfig(cameraConfigForPreset(initialCameraPreset))
  let activeBaseFov = initialPreset.fov
  const initialResponsivePreset = {
    ...initialPreset,
    fov: responsiveFov(initialPreset.fov, initialRenderSize.width),
  }
  const camera = new THREE.PerspectiveCamera(
    initialResponsivePreset.fov,
    initialRenderSize.width / initialRenderSize.height,
    initialPreset.near,
    initialPreset.far,
  )
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = stableOrbitMode
    ? STUDIO_V2_OFFICIAL_CONTROLS.dampingFactor
    : STUDIO_V2_CONTROLS.dampingFactor
  controls.enableRotate = true
  controls.enablePan = false
  controls.enableZoom = true
  controls.minDistance = stableOrbitMode
    ? STUDIO_V2_OFFICIAL_CONTROLS.minDistance
    : STUDIO_V2_CONTROLS.minDistance
  controls.maxDistance = stableOrbitMode
    ? STUDIO_V2_OFFICIAL_CONTROLS.maxDistance
    : STUDIO_V2_CONTROLS.maxDistance
  controls.minPolarAngle = stableOrbitMode
    ? STUDIO_V2_OFFICIAL_CONTROLS.minPolarAngle
    : STUDIO_V2_CONTROLS.minPolarAngle
  controls.maxPolarAngle = stableOrbitMode
    ? STUDIO_V2_OFFICIAL_CONTROLS.maxPolarAngle
    : STUDIO_V2_CONTROLS.maxPolarAngle
  controls.minAzimuthAngle = officialPresentation ? OFFICIAL_VIEW_MIN_AZIMUTH : -Infinity
  controls.maxAzimuthAngle = officialPresentation ? OFFICIAL_VIEW_MAX_AZIMUTH : Infinity
  controls.rotateSpeed = STUDIO_V2_CONTROLS.rotateSpeed
  controls.zoomSpeed = STUDIO_V2_CONTROLS.zoomSpeed
  controls.panSpeed = STUDIO_V2_CONTROLS.panSpeed
  controls.enabled = false
  let orbitStabilizations = 0
  let rearWallPreviewEnabled = false
  let rearClampState = 'CLEAR'
  let currentAzimuth = OFFICIAL_VIEW_SECTOR.openingAzimuth
  let minRearWallDistance = 0
  let maxRearWallDistance = 0
  const rearWallAnchor = new THREE.Vector3().fromArray(OFFICIAL_REAR_VIRTUAL_WALL.anchor)
  const minRearWallPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    new THREE.Vector3().fromArray(OFFICIAL_REAR_VIRTUAL_WALL.normals.min),
    rearWallAnchor,
  )
  const maxRearWallPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    new THREE.Vector3().fromArray(OFFICIAL_REAR_VIRTUAL_WALL.normals.max),
    rearWallAnchor,
  )

  function rearWallApplied() {
    return OFFICIAL_REAR_VIRTUAL_WALL.enabled
      && (officialPresentation || rearWallPreviewEnabled)
  }

  function applyRearWallLimits() {
    const applied = rearWallApplied()
    controls.minAzimuthAngle = applied ? OFFICIAL_VIEW_MIN_AZIMUTH : -Infinity
    controls.maxAzimuthAngle = applied ? OFFICIAL_VIEW_MAX_AZIMUTH : Infinity
    return applied
  }

  function updateRearClampState() {
    currentAzimuth = controls.getAzimuthalAngle()
    minRearWallDistance = minRearWallPlane.distanceToPoint(camera.position)
    maxRearWallDistance = maxRearWallPlane.distanceToPoint(camera.position)
    if (!rearWallApplied()) {
      rearClampState = 'OFF / DEBUG UNRESTRICTED'
    } else if (Math.abs(currentAzimuth - OFFICIAL_VIEW_MIN_AZIMUTH) < 0.0001) {
      rearClampState = 'ACTIVE / MIN / RIGHT-REAR'
    } else if (Math.abs(currentAzimuth - OFFICIAL_VIEW_MAX_AZIMUTH) < 0.0001) {
      rearClampState = 'ACTIVE / MAX / LEFT-REAR'
    } else {
      rearClampState = 'CLEAR / INSIDE HALF-SPACES'
    }
  }

  function clearBlockedOrbitMotion({ preserveTangential = false } = {}) {
    const preservedTheta = preserveTangential ? controls._sphericalDelta?.theta ?? 0 : 0
    const preservedPanX = preserveTangential ? controls._panOffset?.x ?? 0 : 0
    const preservedPanZ = preserveTangential ? controls._panOffset?.z ?? 0 : 0
    controls._sphericalDelta?.set(0, 0, 0)
    controls._panOffset?.set(0, 0, 0)
    controls._dollyDirection?.set(0, 0, 0)
    controls._scale = 1
    controls._performCursorZoom = false
    return { preservedPanX, preservedPanZ, preservedTheta }
  }

  function restoreTangentialOrbitMotion({ preservedPanX, preservedPanZ, preservedTheta }) {
    if (controls._sphericalDelta) controls._sphericalDelta.theta = preservedTheta
    if (controls._panOffset) {
      controls._panOffset.x = preservedPanX
      controls._panOffset.z = preservedPanZ
    }
  }

  function acceptCameraCandidate() {
    const result = cameraSafety.accept(camera, controls)
    if (result.stableOrbit) {
      cameraSafety.setDampingCleared(false)
      return result.blocked
    }
    if (!result.blocked) {
      cameraSafety.setDampingCleared(false)
      return false
    }
    const dampingEnabled = controls.enableDamping
    const preservedMotion = clearBlockedOrbitMotion({ preserveTangential: result.floorContact })
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = dampingEnabled
    if (result.floorContact) restoreTangentialOrbitMotion(preservedMotion)
    cameraSafety.setDampingCleared(true)
    orbitStabilizations += 1
    return true
  }

  applyCameraConfig(camera, controls, initialResponsivePreset)
  acceptCameraCandidate()

  const hemisphere = new THREE.HemisphereLight(
    initialLighting.hemisphere.sky,
    initialLighting.hemisphere.ground,
    initialLighting.hemisphere.intensity,
  )
  hemisphere.name = 'StudioV2HemisphereLight'
  const keyLight = new THREE.DirectionalLight(
    initialLighting.key.color,
    initialLighting.key.intensity,
  )
  keyLight.name = 'StudioV2KeyLight'
  keyLight.position.set(...initialLighting.key.position)
  keyLight.castShadow = true
  const shadowMapSize = initialLighting.key.shadowMapSize ?? 2048
  keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize)
  keyLight.shadow.camera.left = -9
  keyLight.shadow.camera.right = 9
  keyLight.shadow.camera.top = 8
  keyLight.shadow.camera.bottom = -5
  keyLight.shadow.camera.near = 0.5
  keyLight.shadow.camera.far = 28
  keyLight.shadow.radius = initialLighting.key.shadowRadius ?? 1
  keyLight.shadow.bias = initialLighting.key.shadowBias ?? -0.00035
  keyLight.shadow.normalBias = initialLighting.key.shadowNormalBias ?? 0.025
  keyLight.shadow.intensity = initialLighting.key.shadowIntensity
  const fillLight = new THREE.DirectionalLight(
    initialLighting.fill.color,
    initialLighting.fill.intensity,
  )
  fillLight.name = 'StudioV2FillLight'
  fillLight.position.set(...initialLighting.fill.position)
  const windowFill = new THREE.RectAreaLight(
    indirectLighting.windowFill.color,
    indirectLighting.windowFill.intensity,
    indirectLighting.windowFill.width,
    indirectLighting.windowFill.height,
  )
  windowFill.name = 'StudioV2WindowFill'
  windowFill.position.set(...indirectLighting.windowFill.position)
  windowFill.lookAt(...indirectLighting.windowFill.target)
  const ceilingBounce = new THREE.RectAreaLight(
    indirectLighting.ceilingBounce.color,
    indirectLighting.ceilingBounce.intensity,
    indirectLighting.ceilingBounce.width,
    indirectLighting.ceilingBounce.height,
  )
  ceilingBounce.name = 'StudioV2CeilingBounce'
  ceilingBounce.position.set(...indirectLighting.ceilingBounce.position)
  ceilingBounce.lookAt(...indirectLighting.ceilingBounce.target)
  const lighting = new THREE.Group()
  lighting.name = 'StudioV2Lighting'
  lighting.add(hemisphere, keyLight, fillLight, windowFill, ceilingBounce)
  scene.add(lighting)

  const hemisphereHelper = new THREE.HemisphereLightHelper(hemisphere, 1)
  const keyHelper = new THREE.DirectionalLightHelper(keyLight, 1.5)
  const fillHelper = new THREE.DirectionalLightHelper(fillLight, 1.2)
  const lightHelpers = [hemisphereHelper, keyHelper, fillHelper]
  lightHelpers.forEach((helper) => {
    helper.visible = false
    scene.add(helper)
  })

  let disposed = false
  let modelRoot = null
  let spatialDebug = null
  let modelAudit = null
  let environmentRenderTarget = null
  let pmremGenerator = null
  let exploreEnabled = !debug
  let cameraTween = null
  let diningSetRemoval = null
  let windowDecorationRemoval = null
  let materialTuningReport = []
  let placedObjectsResource = null
  let placedObjectRecords = []
  let maximumAnisotropy = 1
  let modelResource = null
  let roomLoaderSupport = null
  let roomTextureFormats = []
  const visualState = {
    ibl: true,
    shadows: true,
    ao: false,
    bloom: false,
    lightingCandidate: initialLightingCandidate in STUDIO_V2_LIGHTING_CANDIDATES
      ? initialLightingCandidate
      : `${STUDIO_V2_SELECTED_LIGHTING}_FINAL`,
    environmentIntensity: initialLighting.environmentIntensity,
    exposure: initialLighting.exposure,
    keyIntensity: initialLighting.key.intensity,
    keyPosition: [...initialLighting.key.position],
    fillIntensity: initialLighting.fill.intensity,
    fillPosition: [...initialLighting.fill.position],
    windowFillIntensity: indirectLighting.windowFill.intensity,
    windowFillPosition: [...indirectLighting.windowFill.position],
    windowFillSize: [indirectLighting.windowFill.width, indirectLighting.windowFill.height],
    ceilingBounceIntensity: indirectLighting.ceilingBounce.intensity,
    ceilingBouncePosition: [...indirectLighting.ceilingBounce.position],
    ceilingBounceSize: [indirectLighting.ceilingBounce.width, indirectLighting.ceilingBounce.height],
    shadowIntensity: initialLighting.key.shadowIntensity,
    shadowType: 'PCFSoftShadowMap',
    shadowRadius: keyLight.shadow.radius,
    shadowMapSize,
    shadowBias: keyLight.shadow.bias,
    shadowNormalBias: keyLight.shadow.normalBias,
    shadowCasters: 1,
  }
  const loadStartedAt = performance.now()
  const parallelEntryLoading = officialPresentation
    || capture
    || activeDeliveryConfig.loading !== 'lazy'
  const entryGate = createStudioV2EntryGate({
    deliveryConfig: activeDeliveryConfig,
    onChange: (state) => {
      mount.dataset.entryPhase = state.phase
      mount.dataset.sceneReady = String(state.sceneReady)
      onEntryState?.(state)
    },
    startedAt: loadStartedAt,
    testConfig: entryTestConfig,
  })
  mount.dataset.interactionsEnabled = 'false'

  function textureFormatsFor(root) {
    const formats = new Set()
    root?.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if (!material) return
        Object.values(material).forEach((value) => {
          if (!value?.isTexture || value.format === undefined) return
          const match = Object.entries(THREE).find(([name, constant]) => (
            name.endsWith('Format') && constant === value.format
          ))
          formats.add(match?.[0] ?? `FORMAT_${value.format}`)
        })
      })
    })
    return [...formats].sort()
  }

  function configureEnvironment() {
    const candidate = findStudioV2EnvironmentMesh(modelRoot, modelAudit)
    if (!candidate) return null
    candidate.object.visible = true
    const equirectangularTexture = candidate.texture.clone()
    equirectangularTexture.mapping = THREE.EquirectangularReflectionMapping
    equirectangularTexture.colorSpace = THREE.SRGBColorSpace
    equirectangularTexture.needsUpdate = true
    pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    environmentRenderTarget = pmremGenerator.fromEquirectangular(equirectangularTexture)
    scene.environment = environmentRenderTarget.texture
    equirectangularTexture.dispose()
    return {
      mesh: candidate.object.name,
      material: candidate.material.name,
      texture: [candidate.width, candidate.height],
      signals: candidate.score,
    }
  }

  function configureShadows() {
    const casters = new Set([
      'Material.005',
      'Material.007',
      'StudioV2KitchenPainted',
      'StudioV2KitchenMetal',
      'StudioV2KitchenHandle',
      'StudioV2KitchenAppliance',
      'StudioV2KitchenGlass',
      'StudioV2StoolLegMetal',
      'StudioV2CoffeeTableFrame',
      'Material.011',
    ])
    const receivers = new Set([
      'Material.002',
      'Material.012',
      'StudioV2LightTimber',
      'StudioV2DarkCeilingTimber',
      'StudioV2KitchenTimber',
      'StudioV2IslandTimber',
      'StudioV2StoolTimber',
      'StudioV2CoffeeTableTop',
      'StudioV2CoffeeTableFrame',
      'StudioV2IslandPainted',
      'material',
    ])
    modelRoot.traverse((object) => {
      if (!object.isMesh || !object.visible) return
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      const names = materials.map((material) => material?.name)
      object.castShadow = names.some((name) => casters.has(name))
      object.receiveShadow = names.some((name) => receivers.has(name))
    })
  }

  async function waitForEntryAsset(assetId, promise) {
    const delay = entryTestConfig?.delays?.[assetId] ?? 0
    const [asset] = await Promise.all([
      promise,
      delay > 0 ? new Promise((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve(),
    ])
    if (entryTestConfig?.failAsset === assetId) {
      const error = new Error(`Entry-critical asset test failure: ${assetId}`)
      error.assetId = assetId
      throw error
    }
    return asset
  }

  function prepareRoom(gltf) {
    if (disposed) return null
    modelRoot = gltf.scene
    modelRoot.name = 'FredStudioV2ImportedLoft'
    modelRoot.userData.studioV2Id = 'ROOM_ENVIRONMENT'
    modelRoot.position.set(...STUDIO_V2_MODEL_TRANSFORM.position)
    modelRoot.rotation.set(...STUDIO_V2_MODEL_TRANSFORM.rotation)
    modelRoot.scale.setScalar(STUDIO_V2_MODEL_TRANSFORM.scale)
    diningSetRemoval = removeStudioV2DiningSet(modelRoot)
    windowDecorationRemoval = removeStudioV2WindowDecoration(modelRoot)
    entryRoot.add(modelRoot)
    modelAudit = auditStudioV2Model(modelRoot)

    const tuned = applyStudioV2MaterialTuning(modelRoot, renderer)
    materialTuningReport = tuned.report
    maximumAnisotropy = tuned.anisotropy
    roomTextureFormats = textureFormatsFor(modelRoot)
    const environment = configureEnvironment()
    configureShadows()
    const firstRoomFrameMs = performance.now() - loadStartedAt
    mount.dataset.roomReady = 'true'
    entryGate.markAssetReady('ROOM_ENVIRONMENT', { url: activeDeliveryConfig.roomUrl })
    onRoomReady?.({
      ...modelAudit,
      firstRoomFrameMs: Number(firstRoomFrameMs.toFixed(1)),
      delivery: activeDeliveryConfig,
    })
    return { environment, firstRoomFrameMs, gltf, tuned }
  }

  const loadPlacedObjects = () => loadStudioV2PlacedObjects(
    entryRoot,
    renderer,
    activeDeliveryConfig,
    {
      onAssetReady: (assetId, detail) => {
        if (assetId !== 'MACBOOK_ISLAND_01') entryGate.markAssetReady(assetId, detail)
      },
      onPlacementReady: (anchorName, detail) => entryGate.markAssetReady(anchorName, detail),
      parallel: parallelEntryLoading,
      testConfig: entryTestConfig,
    },
  )

  const readyPromise = (async () => {
    entryGate.setPhase('loading-entry-assets')
    const placedObjectsPromise = parallelEntryLoading ? loadPlacedObjects() : null
    roomLoaderSupport = await createStudioV2GltfLoader(renderer, activeDeliveryConfig)
    modelResource = acquireStudioV2Model(
      activeDeliveryConfig.roomUrl,
      onProgress,
      roomLoaderSupport.loader,
    )
    const roomPreparationPromise = waitForEntryAsset(
      'ROOM_ENVIRONMENT',
      modelResource.promise,
    ).then(prepareRoom)
    let roomPreparation
    if (parallelEntryLoading) {
      [roomPreparation, placedObjectsResource] = await Promise.all([
        roomPreparationPromise,
        placedObjectsPromise,
      ])
    } else {
      roomPreparation = await roomPreparationPromise
      await new Promise((resolve) => requestAnimationFrame(() => resolve()))
      placedObjectsResource = await loadPlacedObjects()
    }
    if (!roomPreparation || disposed) {
      placedObjectsResource?.dispose()
      placedObjectsResource = null
      return null
    }

    const { environment, firstRoomFrameMs, gltf, tuned } = roomPreparation
    placedObjectsResource.setMaterialMode(initialAssetMaterialMode)
    placedObjectRecords = placedObjectsResource.records
    entryGate.markCondition('texturesReady', {
      formats: [...new Set([...roomTextureFormats, ...placedObjectsResource.textureFormats])],
    })
    entryGate.markCondition('materialsReady', {
      roomMaterials: materialTuningReport.length,
      placedMaterials: placedObjectRecords.reduce(
        (total, record) => total + (record.resources?.materials ?? 0),
        0,
      ),
    })
    entryGate.markCondition('anchorsReady', {
      anchors: placedObjectRecords.map(({ anchorName }) => anchorName),
    })
    entryRoot.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    entryGate.markCondition('worldMatricesReady')
    entryGate.markCondition('shadowsReady')

    const openingSemanticIds = new Set()
    entryRoot.traverse((object) => {
      if (object.userData.studioV2Id) openingSemanticIds.add(object.userData.studioV2Id)
    })
    const openingGroupsPresent = [
      'ROOM_ENVIRONMENT',
      'MACBOOK_ISLAND_01',
      'MARSHALL_GUITAR_FLOOR_01',
    ].every((semanticId) => openingSemanticIds.has(semanticId))
    if (!openingGroupsPresent) {
      throw new Error('Entry-critical opening groups were not all registered before warm-up.')
    }
    entryGate.markCondition('openingVisibleGroupsReady', {
      semanticIds: [...openingSemanticIds].sort(),
    })

    if (debug) {
      const { createStudioV2SpatialDebug } = await import('./studioV2SpatialDebug')
      spatialDebug = createStudioV2SpatialDebug({
        scene,
        camera,
        renderer,
        modelRoot,
        interiorBounds: modelAudit.interiorBounds,
        cameraBounds: cameraSafety.cameraBounds,
        targetBounds: cameraSafety.targetBounds,
        environmentMeshName: environment?.mesh,
      })
    }

    entryGate.setPhase('compiling-shaders')
    entryRoot.updateMatrixWorld(true)
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    if (typeof renderer.compileAsync === 'function') {
      await renderer.compileAsync(scene, camera)
    } else {
      renderer.compile(scene, camera)
    }
    entryGate.markCondition('shaderReady', {
      method: typeof renderer.compileAsync === 'function' ? 'compileAsync' : 'compile',
    })
    entryGate.setPhase('warming-first-frame')
    renderer.render(scene, camera)
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    if (disposed) return null
    entryGate.markCondition('warmupReady', { hiddenFrames: 2, warmupRender: true })
    const entry = entryGate.markSceneReady()
    controls.enabled = exploreEnabled
    mount.dataset.interactionsEnabled = String(controls.enabled)

    const loadTimeMs = performance.now() - loadStartedAt
    mount.dataset.completeReadyMs = loadTimeMs.toFixed(1)
    mount.dataset.firstVisibleFrameMs = loadTimeMs.toFixed(1)
    mount.dataset.criticalRequests = String(entry.requests.length)
    const audit = {
      ...modelAudit,
      animations: gltf.animations.length,
      loadTimeMs: Number(loadTimeMs.toFixed(1)),
      completeReadyMs: Number(loadTimeMs.toFixed(1)),
      firstVisibleFrameMs: Number(loadTimeMs.toFixed(1)),
      firstRoomFrameMs: Number(firstRoomFrameMs.toFixed(1)),
      delivery: {
        ...activeDeliveryConfig,
        entryLoading: parallelEntryLoading ? 'parallel-atomic' : 'debug-room-first-sequential',
        selectedGpuTextureFormat: [...new Set([
          ...roomTextureFormats,
          ...placedObjectsResource.textureFormats,
        ])].join(', '),
        gpuTextureFormats: [...new Set([
          ...roomTextureFormats,
          ...placedObjectsResource.textureFormats,
        ])],
      },
      entry,
      environment,
      maximumAnisotropy,
      materialTuningReport,
      materialSegmentation: tuned.segmentation,
      diningSetRemoval,
      windowDecorationRemoval,
      placedObjects: placedObjectRecords,
      cameraSafety: cameraSafety.record(),
      root: {
        position: STUDIO_V2_MODEL_TRANSFORM.position,
        rotation: STUDIO_V2_MODEL_TRANSFORM.rotation,
        scale: STUDIO_V2_MODEL_TRANSFORM.scale,
      },
    }
    mount.dataset.modelReady = 'true'
    onStudioV2Ready?.(audit)
    onReady?.(audit)
    return audit
  })().catch((error) => {
    if (!disposed) {
      controls.enabled = false
      mount.dataset.interactionsEnabled = 'false'
      entryGate.fail(error.assetId ?? null, error)
      onError?.(error)
    }
    return null
  })

  const resize = () => {
    const { width, height } = renderSize()
    camera.aspect = width / height
    if (!cameraTween) camera.fov = responsiveFov(activeBaseFov, width)
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.35 : pixelRatioCap))
    renderer.setSize(width, height)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)

  function startCameraTween(config, duration = 900) {
    clearBlockedOrbitMotion()
    const safeConfig = cameraSafety.clampConfig(config)
    activeBaseFov = safeConfig.fov
    const responsiveConfig = {
      ...safeConfig,
      fov: responsiveFov(safeConfig.fov, mount.clientWidth),
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || duration === 0) {
      applyCameraConfig(camera, controls, responsiveConfig)
      acceptCameraCandidate()
      cameraTween = null
      return
    }
    cameraTween = {
      fromPosition: camera.position.clone(),
      fromTarget: controls.target.clone(),
      fromFov: camera.fov,
      toPosition: new THREE.Vector3().fromArray(responsiveConfig.position),
      toTarget: new THREE.Vector3().fromArray(responsiveConfig.target),
      toFov: responsiveConfig.fov,
      near: responsiveConfig.near ?? camera.near,
      far: responsiveConfig.far ?? camera.far,
      startedAt: performance.now(),
      duration,
    }
  }

  function updateCameraTween(time) {
    if (!cameraTween) return
    const progress = Math.min(1, (time - cameraTween.startedAt) / cameraTween.duration)
    const eased = easeInOutCubic(progress)
    camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased)
    controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased)
    camera.fov = THREE.MathUtils.lerp(cameraTween.fromFov, cameraTween.toFov, eased)
    camera.near = cameraTween.near
    camera.far = cameraTween.far
    camera.updateProjectionMatrix()
    if (progress >= 1) cameraTween = null
  }

  const diagnostics = {
    fps: 0,
    calls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
  }
  if (debug) window.__FRED_STUDIO_V2_DIAGNOSTICS__ = diagnostics
  let animationFrame = 0
  let frameCount = 0
  let lastSampleAt = performance.now()
  const render = (time) => {
    updateCameraTween(time)
    // The invisible rear half-spaces are converted into OrbitControls limits
    // before it calculates a candidate, so an invalid rear view is never rendered.
    applyRearWallLimits()
    cameraSafety.prepareControls(camera, controls)
    controls.update()
    updateRearClampState()
    acceptCameraCandidate()
    lightHelpers.forEach((helper) => helper.update())
    renderer.render(scene, camera)
    frameCount += 1
    if (time - lastSampleAt >= 1000) {
      diagnostics.fps = Math.round(frameCount * 1000 / (time - lastSampleAt))
      diagnostics.calls = renderer.info.render.calls
      diagnostics.triangles = renderer.info.render.triangles
      diagnostics.geometries = renderer.info.memory.geometries
      diagnostics.textures = renderer.info.memory.textures
      onDiagnostics?.({
        ...diagnostics,
        camera: {
          position: roundedVector(camera.position),
          target: roundedVector(controls.target),
          fov: Number(camera.fov.toFixed(1)),
          safe: cameraSafety.isCameraSafe(camera.position),
        },
        orbit: {
          enabled: controls.enabled,
          pan: controls.enablePan,
          zoom: controls.enableZoom,
          target: stableOrbitMode ? 'FIXED SAFE TARGET' : 'BOUNDED CAPTURE TARGET',
          azimuth: rearWallApplied()
            ? `${OFFICIAL_VIEW_SECTOR.minAzimuthDegrees}° — ${OFFICIAL_VIEW_SECTOR.maxAzimuthDegrees}°`
            : '360°',
          officialViewSector: { ...OFFICIAL_VIEW_SECTOR },
          rearWall: {
            ...OFFICIAL_REAR_VIRTUAL_WALL,
            applied: rearWallApplied(),
            previewEnabled: rearWallPreviewEnabled,
            activeClampState: rearClampState,
            currentAzimuth,
            currentAzimuthDegrees: currentAzimuth * 180 / Math.PI,
            minPlaneDistance: minRearWallDistance,
            maxPlaneDistance: maxRearWallDistance,
          },
        },
        visual: { ...visualState },
        safety: {
          ...cameraSafety.record(),
          stabilizations: orbitStabilizations,
        },
        spatial: spatialDebug?.getState() ?? null,
        entry: entryGate.snapshot(),
        viewport: [renderSize().width, renderSize().height],
      })
      frameCount = 0
      lastSampleAt = time
    }
    animationFrame = requestAnimationFrame(render)
  }
  animationFrame = requestAnimationFrame(render)

  const runtime = {
    readyPromise,
    sceneReadyPromise: readyPromise,
    resetCamera({ smooth = true } = {}) {
      startCameraTween(cameraConfigForPreset(STUDIO_V2_DEFAULT_CAMERA), smooth ? 900 : 0)
    },
    setCameraPreset(presetName, { smooth = false } = {}) {
      startCameraTween(cameraConfigForPreset(presetName), smooth ? 700 : 0)
    },
    setCameraConfig(config, { smooth = false } = {}) {
      startCameraTween({
        ...runtime.getCameraConfig(),
        ...config,
      }, smooth ? 700 : 0)
    },
    setExplore(enabled) {
      exploreEnabled = enabled
      applyRearWallLimits()
      controls.enableRotate = true
      controls.enablePan = false
      controls.enableZoom = stableOrbitMode ? OFFICIAL_CAMERA_SAFE_VOLUME.zoom : true
      controls.enabled = entryGate.snapshot().sceneReady && Boolean(modelRoot) && enabled
      mount.dataset.interactionsEnabled = String(controls.enabled)
    },
    setOfficialRearWallPreview(enabled) {
      if (!debug) return false
      rearWallPreviewEnabled = Boolean(enabled)
      applyRearWallLimits()
      controls.update()
      updateRearClampState()
      return rearWallPreviewEnabled
    },
    setAxes(visible) {
      return spatialDebug?.setAxes(visible) ?? false
    },
    setGrid(visible) {
      return spatialDebug?.setGrid(visible) ?? false
    },
    setBounds(visible) {
      return spatialDebug?.setBounds(visible) ?? false
    },
    setPickPosition(enabled) {
      return spatialDebug?.setPickEnabled(enabled) ?? false
    },
    clearPick() {
      spatialDebug?.clearPick()
    },
    copyPickedPosition() {
      return spatialDebug?.copyPosition() ?? 'position: null'
    },
    copyPickedPositionAndNormal() {
      return spatialDebug?.copyPositionAndNormal() ?? 'position: null\nsurfaceNormal: null'
    },
    setPlaceholderVisible(visible) {
      return spatialDebug?.setPlaceholderVisible(visible) ?? false
    },
    setPlaceholderPosition(axis, value) {
      spatialDebug?.setPlaceholderPosition(axis, value)
    },
    setPlaceholderRotationDegrees(axis, value) {
      spatialDebug?.setPlaceholderRotationDegrees(axis, value)
    },
    setPlaceholderSize(axis, value) {
      spatialDebug?.setPlaceholderSize(axis, value)
    },
    setPlaceholderUniformScale(value) {
      spatialDebug?.setPlaceholderUniformScale(value)
    },
    resetPlaceholder() {
      spatialDebug?.resetPlaceholder()
    },
    movePlaceholderToPick() {
      return spatialDebug?.movePlaceholderToPick() ?? false
    },
    alignPlaceholderToPick() {
      return spatialDebug?.alignPlaceholderToPick() ?? false
    },
    copyPlaceholderTransform() {
      return spatialDebug?.copyPlaceholderTransform() ?? ''
    },
    savePlaceholderAsAnchor(name) {
      return spatialDebug?.saveAnchorDraft(name) ?? ''
    },
    copyAnchor() {
      return spatialDebug?.copyAnchor() ?? ''
    },
    clearUnsavedAnchor() {
      spatialDebug?.clearAnchorDraft()
    },
    getSpatialState() {
      return spatialDebug?.getState() ?? null
    },
    setLightHelpers(visible) {
      lightHelpers.forEach((helper) => { helper.visible = visible })
    },
    setIbl(enabled) {
      visualState.ibl = enabled
      scene.environment = enabled ? environmentRenderTarget?.texture ?? null : null
    },
    setShadows(enabled) {
      visualState.shadows = enabled
      renderer.shadowMap.enabled = enabled
      keyLight.castShadow = enabled
    },
    setEnvironmentIntensity(value) {
      visualState.environmentIntensity = Number(value)
      scene.environmentIntensity = Number(value)
    },
    setExposure(value) {
      visualState.exposure = Number(value)
      renderer.toneMappingExposure = Number(value)
    },
    setKeyIntensity(value) {
      visualState.keyIntensity = Number(value)
      keyLight.intensity = Number(value)
    },
    setWindowFillIntensity(value) {
      visualState.windowFillIntensity = Number(value)
      windowFill.intensity = Number(value)
    },
    setCeilingBounceIntensity(value) {
      visualState.ceilingBounceIntensity = Number(value)
      ceilingBounce.intensity = Number(value)
    },
    setLightingCandidate(candidateName) {
      const candidate = STUDIO_V2_LIGHTING_CANDIDATES[candidateName]
      if (!candidate) return false
      visualState.lightingCandidate = candidateName
      visualState.environmentIntensity = candidate.environmentIntensity
      visualState.exposure = candidate.exposure
      visualState.keyIntensity = candidate.key.intensity
      visualState.keyPosition = [...candidate.key.position]
      visualState.fillIntensity = candidate.fill.intensity
      visualState.fillPosition = [...candidate.fill.position]
      visualState.shadowIntensity = candidate.key.shadowIntensity
      scene.environmentIntensity = candidate.environmentIntensity
      renderer.toneMappingExposure = candidate.exposure
      hemisphere.color.set(candidate.hemisphere.sky)
      hemisphere.groundColor.set(candidate.hemisphere.ground)
      hemisphere.intensity = candidate.hemisphere.intensity
      keyLight.color.set(candidate.key.color)
      keyLight.intensity = candidate.key.intensity
      keyLight.position.set(...candidate.key.position)
      keyLight.shadow.intensity = candidate.key.shadowIntensity
      fillLight.color.set(candidate.fill.color)
      fillLight.intensity = candidate.fill.intensity
      fillLight.position.set(...candidate.fill.position)
      return true
    },
    getCameraConfig() {
      return {
        position: roundedVector(camera.position),
        target: roundedVector(controls.target),
        fov: Number(camera.fov.toFixed(2)),
        near: camera.near,
        far: camera.far,
      }
    },
    getCameraSafety() {
      return {
        ...cameraSafety.record(),
        stabilizations: orbitStabilizations,
      }
    },
    getDiningSetRemoval() {
      return diningSetRemoval
    },
    getWindowDecorationRemoval() {
      return windowDecorationRemoval
    },
    getPlacedObjects() {
      return placedObjectRecords
    },
    getAssetDeliveryConfig() {
      return {
        ...activeDeliveryConfig,
        selectedGpuTextureFormat: [...new Set([
          ...roomTextureFormats,
          ...(placedObjectsResource?.textureFormats ?? []),
        ])].join(', ') || roomLoaderSupport?.selectedGpuTextureFormat,
        gpuTextureFormats: [...new Set([
          ...roomTextureFormats,
          ...(placedObjectsResource?.textureFormats ?? []),
        ])],
      }
    },
    getSceneReadyState() {
      return entryGate.snapshot()
    },
    getAssetMaterialMode() {
      return placedObjectsResource?.getMaterialMode() ?? 'refined'
    },
    setAssetMaterialMode(mode) {
      return placedObjectsResource?.setMaterialMode(mode) ?? 'refined'
    },
    getVisualConfig() {
      return {
        ...visualState,
        orbitEnabled: controls.enabled,
        azimuth: rearWallApplied()
          ? `${OFFICIAL_VIEW_SECTOR.minAzimuthDegrees}° — ${OFFICIAL_VIEW_SECTOR.maxAzimuthDegrees}°`
          : '360°',
        rearWall: {
          ...OFFICIAL_REAR_VIRTUAL_WALL,
          applied: rearWallApplied(),
          previewEnabled: rearWallPreviewEnabled,
          activeClampState: rearClampState,
        },
        anisotropy: maximumAnisotropy,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      placedObjectsResource?.dispose()
      modelResource?.release()
      roomLoaderSupport?.dispose()
      entryRoot.removeFromParent()
      scene.environment = null
      environmentRenderTarget?.dispose()
      pmremGenerator?.dispose()
      spatialDebug?.dispose()
      lightHelpers.forEach((helper) => helper.dispose?.())
      renderer.dispose()
      renderer.domElement.remove()
      delete mount.dataset.modelReady
      delete mount.dataset.roomReady
      delete mount.dataset.entryPhase
      delete mount.dataset.completeReadyMs
      delete mount.dataset.criticalRequests
      delete mount.dataset.firstVisibleFrameMs
      delete mount.dataset.interactionsEnabled
      delete mount.dataset.sceneReady
      if (window.__FRED_STUDIO_V2_DIAGNOSTICS__ === diagnostics) {
        delete window.__FRED_STUDIO_V2_DIAGNOSTICS__
      }
      if (window.__FRED_STUDIO_V2_RUNTIME__ === runtime) {
        delete window.__FRED_STUDIO_V2_RUNTIME__
      }
    },
  }

  if (debug) window.__FRED_STUDIO_V2_RUNTIME__ = runtime
  return runtime
}

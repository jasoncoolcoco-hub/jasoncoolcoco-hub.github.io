import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
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
  STUDIO_V2_SELECTED_SHADOW_PROFILE,
  STUDIO_V2_SHADOW_PROFILES,
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
import { createStudioV2MarshallInteraction } from './createStudioV2MarshallInteraction'
import { createStudioV2RadioPanel } from './createStudioV2RadioPanel'
import {
  createStudioV2FloorReflection,
  STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
} from './studioV2FloorReflection'
import { createStudioV2CameraDirector } from './studioV2CameraDirector'
import { createStudioV2MacbookFocus } from './studioV2MacbookFocus'
import {
  STUDIO_V2_MACBOOK_SITE_STATES,
  studioV2MacbookSiteLocksStudio,
} from './macbook-site/studioV2MacbookPortal'
import { createStudioV2PhotoWallFocus } from './studioV2PhotoWallFocus'
import { createStudioV2PhotoHover } from './studioV2PhotoHover'
import { createStudioV2PhotoDetail } from './studioV2PhotoDetail'
import {
  loadStudioV2SceneExpansion,
  STUDIO_V2_SCENE_EXPANSION_IDS,
} from './studioV2SceneExpansion'
import { STUDIO_V2_MAJOR_CAMERA_OBSTACLES } from './studioV2CameraSafetyVolume'
import {
  STUDIO_V2_CAMERA_STATES,
  STUDIO_V2_ROOM_WIDE_START_POSE,
  STUDIO_V2_TABLE_OVERVIEW_CANDIDATES,
} from './studioV2CameraPoses'
import {
  STUDIO_V2_RADIO_PANEL_ID,
  STUDIO_V2_RADIO_PANEL_METADATA_TIMEOUT_MS,
} from './studioV2RadioPanelConfig'

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)))
}

function cameraConfigForPreset(presetName) {
  return STUDIO_V2_TABLE_OVERVIEW_CANDIDATES[presetName]
    ?? STUDIO_V2_CAMERA_PRESETS[presetName]
    ?? STUDIO_V2_CAMERA_PRESETS[STUDIO_V2_DEFAULT_CAMERA]
}

function projectBoundsRecord(boundsRecord, camera, viewport) {
  if (!boundsRecord?.min || !boundsRecord?.max) return null
  const [minX, minY, minZ] = boundsRecord.min
  const [maxX, maxY, maxZ] = boundsRecord.max
  const points = []
  for (const x of [minX, maxX]) for (const y of [minY, maxY]) for (const z of [minZ, maxZ]) {
    const point = new THREE.Vector3(x, y, z).project(camera)
    points.push({ x: (point.x * 0.5 + 0.5) * viewport.width, y: (-point.y * 0.5 + 0.5) * viewport.height, z: point.z })
  }
  const visiblePoints = points.filter(({ z }) => z >= -1 && z <= 1)
  if (!visiblePoints.length) return { visible: false, points }
  const left = Math.min(...visiblePoints.map(({ x }) => x))
  const right = Math.max(...visiblePoints.map(({ x }) => x))
  const top = Math.min(...visiblePoints.map(({ y }) => y))
  const bottom = Math.max(...visiblePoints.map(({ y }) => y))
  const width = right - left
  const height = bottom - top
  const visibleLeft = THREE.MathUtils.clamp(left, 0, viewport.width)
  const visibleRight = THREE.MathUtils.clamp(right, 0, viewport.width)
  const visibleTop = THREE.MathUtils.clamp(top, 0, viewport.height)
  const visibleBottom = THREE.MathUtils.clamp(bottom, 0, viewport.height)
  const visibleWidth = Math.max(0, visibleRight - visibleLeft)
  const visibleHeight = Math.max(0, visibleBottom - visibleTop)
  return {
    visible: right > 0 && left < viewport.width && bottom > 0 && top < viewport.height,
    left: Number(left.toFixed(3)), right: Number(right.toFixed(3)),
    top: Number(top.toFixed(3)), bottom: Number(bottom.toFixed(3)),
    width: Number(width.toFixed(3)), height: Number(height.toFixed(3)),
    viewportWidthPercent: Number((width / viewport.width * 100).toFixed(3)),
    viewportHeightPercent: Number((height / viewport.height * 100).toFixed(3)),
    viewportAreaPercent: Number((width * height / (viewport.width * viewport.height) * 100).toFixed(3)),
    visibleViewportWidthPercent: Number((visibleWidth / viewport.width * 100).toFixed(3)),
    visibleViewportHeightPercent: Number((visibleHeight / viewport.height * 100).toFixed(3)),
    visibleViewportAreaPercent: Number((visibleWidth * visibleHeight / (viewport.width * viewport.height) * 100).toFixed(3)),
    points,
  }
}

function tableOverviewCompositionRecord({ camera, controls, placedObjectRecords, viewport, safetyInspection }) {
  const macbook = placedObjectRecords.find(({ anchorName }) => anchorName === 'MACBOOK_ISLAND_01')
  const kitchenIsland = STUDIO_V2_MAJOR_CAMERA_OBSTACLES.find(({ id }) => id === 'KITCHEN ISLAND / BODY')
  const stoolRow = STUDIO_V2_MAJOR_CAMERA_OBSTACLES.find(({ id }) => id === 'KITCHEN STOOLS / ROW')
  const stoolSeatSlab = stoolRow ? {
    min: [stoolRow.min[0], 1.03, stoolRow.min[2]],
    max: [stoolRow.max[0], stoolRow.max[1], stoolRow.max[2]],
  } : null
  const kitchenCabinetProxy = {
    min: [1.9, 0.5, -4.65],
    max: [4.85, 2.82, 0.72],
  }
  const direction = controls.target.clone().sub(camera.position)
  const lookRadius = direction.length()
  const downwardAngleDegrees = THREE.MathUtils.radToDeg(Math.asin(Math.abs(direction.y) / lookRadius))
  return {
    poseId: camera.userData.studioV2PoseId ?? null,
    position: camera.position.toArray(),
    target: controls.target.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
    lookRadius: Number(lookRadius.toFixed(6)),
    downwardAngleDegrees: Number(downwardAngleDegrees.toFixed(4)),
    signedDistancePastStoolPlaneM: Number(camera.position.x.toFixed(4)),
    macbookProjectedBounds: projectBoundsRecord(macbook?.worldBounds, camera, viewport),
    islandProjectedBounds: projectBoundsRecord(kitchenIsland, camera, viewport),
    stoolSeatProjectedBounds: projectBoundsRecord(stoolSeatSlab, camera, viewport),
    kitchenCabinetProxyProjectedBounds: projectBoundsRecord(kitchenCabinetProxy, camera, viewport),
    safety: safetyInspection,
    viewport,
  }
}

function responsiveFov(baseFov, width) {
  return width < 700 ? Math.min(74, baseFov + 22) : baseFov
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) return 0
  const index = (sortedValues.length - 1) * percentileValue
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  return THREE.MathUtils.lerp(sortedValues[lower], sortedValues[upper], index - lower)
}

function createTableInteractionTarget() {
  const island = STUDIO_V2_MAJOR_CAMERA_OBSTACLES.find(({ id }) => id === 'KITCHEN ISLAND / BODY')
  if (!island) return null
  const min = new THREE.Vector3().fromArray(island.min)
  const max = new THREE.Vector3().fromArray(island.max)
  const size = max.clone().sub(min)
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
  const material = new THREE.MeshBasicMaterial()
  material.visible = false
  const target = new THREE.Mesh(geometry, material)
  target.name = 'TABLE_ISLAND_INTERACTION_TARGET'
  target.userData.studioV2SemanticId = 'TABLE_ISLAND_INTERACTION_TARGET'
  target.position.copy(min).add(max).multiplyScalar(0.5)
  target.updateMatrixWorld(true)
  return target
}

const SHADOW_MAP_TYPES = Object.freeze({
  PCFShadowMap: THREE.PCFShadowMap,
  PCFSoftShadowMap: THREE.PCFSoftShadowMap,
  VSMShadowMap: THREE.VSMShadowMap,
})

export function createStudioV2Scene({
  mount,
  capture = false,
  debug = false,
  onDiagnostics,
  onEntryState,
  onError,
  onProgress,
  onRadioPanelCloseRequest,
  onRadioPanelOpenRequest,
  onReady,
  onRoomReady,
  onStudioV2Ready,
  audioController,
  deliveryConfig,
  entryTestConfig,
  initialCameraPreset = STUDIO_V2_DEFAULT_CAMERA,
  initialAmbientProgress,
  initialAmbientCandidate = 'B',
  forceAutoplayBlocked = false,
  initialAssetMaterialMode = 'refined',
  initialLightingCandidate,
  initialToneMapping,
  initialExposure,
  initialFloorReflectionEnabled = true,
  initialFloorArchitecture,
  initialReflectionDiagnosticMode,
  initialShadowProfile,
  initialCompositeMode = 'FINAL_COMBINED',
  pixelRatioCap = STUDIO_V2_RENDERING.maxPixelRatio,
  forcedViewport,
  performanceTest = null,
  photoBoardGrid = false,
  photoSlotOverlay = false,
  photoWallReview = false,
}) {
  const activeDeliveryConfig = deliveryConfig ?? createStudioV2DeliveryConfig({}, false)
  const initialLighting = STUDIO_V2_LIGHTING_CANDIDATES[initialLightingCandidate]
    ?? STUDIO_V2_LIGHTING
  const toneMappingModes = {
    aces: THREE.ACESFilmicToneMapping,
    agx: THREE.AgXToneMapping,
    neutral: THREE.NeutralToneMapping,
  }
  const toneMappingName = initialToneMapping?.toLowerCase() in toneMappingModes
    ? initialToneMapping.toLowerCase()
    : STUDIO_V2_RENDERING.toneMapping.toLowerCase()
  const initialExposureValue = Number.isFinite(initialExposure)
    ? initialExposure
    : initialLighting.exposure
  let activeShadowProfileName = initialShadowProfile in STUDIO_V2_SHADOW_PROFILES
    ? initialShadowProfile
    : STUDIO_V2_SELECTED_SHADOW_PROFILE
  const activeShadowProfile = STUDIO_V2_SHADOW_PROFILES[activeShadowProfileName]
  const indirectLighting = STUDIO_V2_LIGHTING
  const officialPresentation = !debug && !capture
  const staticPhotoWallReview = debug && photoWallReview
  const stableOrbitMode = !capture
  const renderSize = () => ({
    width: forcedViewport?.[0] ?? Math.max(1, mount.clientWidth),
    height: forcedViewport?.[1] ?? Math.max(1, mount.clientHeight),
  })
  const initialRenderSize = renderSize()
  RectAreaLightUniformsLib.init()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(STUDIO_V2_RENDERING.clearColor)
  scene.environmentIntensity = activeShadowProfile.environmentIntensity
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
  renderer.toneMapping = toneMappingModes[toneMappingName]
  renderer.toneMappingExposure = Number.isFinite(initialExposure)
    ? initialExposureValue
    : activeShadowProfile.exposure
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = SHADOW_MAP_TYPES[activeShadowProfile.shadowType]
  mount.appendChild(renderer.domElement)

  const cameraSafety = createStudioV2CameraSafety({
    safeOrbit: stableOrbitMode,
    furnitureCollisionExperimental: false,
  })
  const requestedInitialPreset = cameraConfigForPreset(initialCameraPreset)
  const initialPreset = staticPhotoWallReview
    || (capture && STUDIO_V2_TABLE_OVERVIEW_CANDIDATES[initialCameraPreset])
    ? requestedInitialPreset
    : cameraSafety.clampConfig(requestedInitialPreset)
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
  camera.userData.studioV2PoseId = initialPreset.id ?? initialCameraPreset
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
  const cameraInteractionRaycaster = new THREE.Raycaster()
  const cameraInteractionPointer = new THREE.Vector2()
  const cameraInteractionTargets = []

  function isInteractiveCameraPointer(event) {
    if (!cameraInteractionTargets.length) return false
    const rect = renderer.domElement.getBoundingClientRect()
    cameraInteractionPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    cameraInteractionRaycaster.setFromCamera(cameraInteractionPointer, camera)
    return cameraInteractionRaycaster.intersectObjects(cameraInteractionTargets, true).length > 0
  }
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

  const cameraDirector = createStudioV2CameraDirector({
    ambientPathCandidate: initialAmbientCandidate,
    camera,
    cameraSafety,
    controls,
    debug: debug || capture,
    domElement: renderer.domElement,
    initialPose: staticPhotoWallReview
      ? { ...initialPreset, state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW }
      : capture
        ? initialPreset
        : STUDIO_V2_ROOM_WIDE_START_POSE,
    isInteractivePointer: isInteractiveCameraPointer,
    prepareOrbitLimits: applyRearWallLimits,
    readRearBoundary: updateRearClampState,
    responsiveFov,
    resolveLegacyCandidate: acceptCameraCandidate,
    scene,
  })
  if (capture && Number.isFinite(initialAmbientProgress)) {
    cameraDirector.scrubAmbientProgress(initialAmbientProgress)
  }

  const keyLight = new THREE.DirectionalLight(
    initialLighting.key.color,
    activeShadowProfile.keyIntensity,
  )
  keyLight.name = 'StudioV2KeyLight'
  keyLight.position.set(...initialLighting.key.position)
  keyLight.target.position.set(...(initialLighting.key.target ?? [0, 0, 0]))
  keyLight.castShadow = true
  const shadowMapSize = initialLighting.key.shadowMapSize ?? 2048
  keyLight.shadow.mapSize.set(shadowMapSize, shadowMapSize)
  keyLight.shadow.camera.left = initialLighting.key.shadowCamera?.left ?? -9
  keyLight.shadow.camera.right = initialLighting.key.shadowCamera?.right ?? 9
  keyLight.shadow.camera.top = initialLighting.key.shadowCamera?.top ?? 8
  keyLight.shadow.camera.bottom = initialLighting.key.shadowCamera?.bottom ?? -5
  keyLight.shadow.camera.near = initialLighting.key.shadowCamera?.near ?? 0.5
  keyLight.shadow.camera.far = initialLighting.key.shadowCamera?.far ?? 28
  keyLight.shadow.radius = activeShadowProfile.shadowRadius
  keyLight.shadow.blurSamples = activeShadowProfile.blurSamples
  keyLight.shadow.bias = activeShadowProfile.bias
  keyLight.shadow.normalBias = activeShadowProfile.normalBias
  keyLight.shadow.intensity = activeShadowProfile.shadowIntensity
  const fillLight = new THREE.DirectionalLight(
    initialLighting.fill.color,
    initialLighting.fill.intensity,
  )
  fillLight.name = 'StudioV2FillLight'
  fillLight.position.set(...initialLighting.fill.position)
  const windowFill = new THREE.RectAreaLight(
    indirectLighting.windowFill.color,
    activeShadowProfile.windowFillIntensity,
    indirectLighting.windowFill.width,
    indirectLighting.windowFill.height,
  )
  windowFill.name = 'StudioV2WindowFill'
  windowFill.position.set(...indirectLighting.windowFill.position)
  windowFill.lookAt(...indirectLighting.windowFill.target)
  const ceilingBounce = new THREE.RectAreaLight(
    indirectLighting.ceilingBounce.color,
    activeShadowProfile.ceilingBounceIntensity,
    indirectLighting.ceilingBounce.width,
    indirectLighting.ceilingBounce.height,
  )
  ceilingBounce.name = 'StudioV2CeilingBounce'
  ceilingBounce.position.set(...indirectLighting.ceilingBounce.position)
  ceilingBounce.lookAt(...indirectLighting.ceilingBounce.target)
  const lighting = new THREE.Group()
  lighting.name = 'StudioV2Lighting'
  lighting.add(keyLight, keyLight.target, fillLight, windowFill, ceilingBounce)
  scene.add(lighting)

  const keyHelper = new THREE.DirectionalLightHelper(keyLight, 1.5)
  const fillHelper = new THREE.DirectionalLightHelper(fillLight, 1.2)
  const lightHelpers = [keyHelper, fillHelper]
  lightHelpers.forEach((helper) => {
    helper.visible = false
    scene.add(helper)
  })

  let disposed = false
  let modelRoot = null
  let floorReflection = null
  let marshallInteraction = null
  let unsubscribeAudioState = null
  let radioPanel = null
  let macbookFocus = null
  let macbookSiteState = STUDIO_V2_MACBOOK_SITE_STATES.CLOSED
  let photoWallFocus = null
  let photoHover = null
  let photoDetail = null
  let tableInteractionTarget = null
  let unsubscribeRadioPanel = null
  let spatialDebug = null
  let modelAudit = null
  let environmentRenderTarget = null
  let pmremGenerator = null
  let exploreEnabled = !debug
  let diningSetRemoval = null
  let windowDecorationRemoval = null
  let materialTuningReport = []
  let placedObjectsResource = null
  let sceneExpansionResource = null
  let placedObjectRecords = []
  let maximumAnisotropy = 1
  let modelResource = null
  let roomLoaderSupport = null
  let roomTextureFormats = []
  let radioMetadataReadyMs = null
  let radioPanelReadyMs = null
  let radioPanelState = null
  const radioPanelSubscribers = new Set()
  const publishRadioPanelState = (nextState) => {
    radioPanelState = nextState
    cameraDirector.setPauseReason('RADIO_PANEL', Boolean(nextState?.screenPlayerOpen), {
      resumeDelayMs: 2000,
    })
    radioPanelSubscribers.forEach((listener) => listener(nextState))
  }
  const visualState = {
    ibl: true,
    shadows: true,
    ao: false,
    bloom: false,
    lightingCandidate: initialLightingCandidate in STUDIO_V2_LIGHTING_CANDIDATES
      ? initialLightingCandidate
      : `${STUDIO_V2_SELECTED_LIGHTING}_FINAL`,
    toneMapping: toneMappingName.toUpperCase(),
    environmentMode: 'ROOM_ENVIRONMENT_PMREM',
    lightCount: 4,
    environmentIntensity: activeShadowProfile.environmentIntensity,
    exposure: Number.isFinite(initialExposure) ? initialExposureValue : activeShadowProfile.exposure,
    keyIntensity: activeShadowProfile.keyIntensity,
    keyPosition: [...initialLighting.key.position],
    fillIntensity: initialLighting.fill.intensity,
    fillPosition: [...initialLighting.fill.position],
    windowFillIntensity: activeShadowProfile.windowFillIntensity,
    windowFillPosition: [...indirectLighting.windowFill.position],
    windowFillSize: [indirectLighting.windowFill.width, indirectLighting.windowFill.height],
    ceilingBounceIntensity: activeShadowProfile.ceilingBounceIntensity,
    ceilingBouncePosition: [...indirectLighting.ceilingBounce.position],
    ceilingBounceSize: [indirectLighting.ceilingBounce.width, indirectLighting.ceilingBounce.height],
    shadowProfile: activeShadowProfileName,
    shadowIntensity: activeShadowProfile.shadowIntensity,
    shadowType: activeShadowProfile.shadowType,
    shadowRadius: keyLight.shadow.radius,
    shadowBlurSamples: keyLight.shadow.blurSamples,
    shadowMapSize,
    shadowBias: keyLight.shadow.bias,
    shadowNormalBias: keyLight.shadow.normalBias,
    shadowCasters: 1,
    vsmSupported: THREE.VSMShadowMap !== undefined && 'blurSamples' in keyLight.shadow,
    compositeMode: initialCompositeMode,
    floorReflection: null,
  }

  function releaseShadowTargets() {
    keyLight.shadow.map?.dispose()
    keyLight.shadow.mapPass?.dispose()
    keyLight.shadow.map = null
    keyLight.shadow.mapPass = null
  }

  function applyShadowProfile(profileName) {
    const profile = STUDIO_V2_SHADOW_PROFILES[profileName]
    if (!profile) return false
    if (profile.shadowType === 'VSMShadowMap' && !visualState.vsmSupported) return false
    const nextShadowType = SHADOW_MAP_TYPES[profile.shadowType]
    if (renderer.shadowMap.type !== nextShadowType) releaseShadowTargets()
    renderer.shadowMap.type = nextShadowType
    renderer.shadowMap.needsUpdate = true
    keyLight.intensity = profile.keyIntensity
    keyLight.shadow.intensity = profile.shadowIntensity
    keyLight.shadow.radius = profile.shadowRadius
    keyLight.shadow.blurSamples = profile.blurSamples
    keyLight.shadow.bias = profile.bias
    keyLight.shadow.normalBias = profile.normalBias
    keyLight.shadow.needsUpdate = true
    windowFill.intensity = profile.windowFillIntensity
    ceilingBounce.intensity = profile.ceilingBounceIntensity
    scene.environmentIntensity = profile.environmentIntensity
    renderer.toneMappingExposure = profile.exposure
    activeShadowProfileName = profileName
    visualState.shadowProfile = profileName
    visualState.shadowType = profile.shadowType
    visualState.shadowIntensity = profile.shadowIntensity
    visualState.shadowRadius = profile.shadowRadius
    visualState.shadowBlurSamples = profile.blurSamples
    visualState.shadowBias = profile.bias
    visualState.shadowNormalBias = profile.normalBias
    visualState.keyIntensity = profile.keyIntensity
    visualState.windowFillIntensity = profile.windowFillIntensity
    visualState.ceilingBounceIntensity = profile.ceilingBounceIntensity
    visualState.environmentIntensity = profile.environmentIntensity
    visualState.exposure = profile.exposure
    floorReflection?.markDirty()
    return true
  }

  function applyCompositeMode(requestedMode) {
    const compositeMode = [
      'SHADOW_ONLY',
      'REFLECTION_ONLY',
      'FINAL_COMBINED',
    ].includes(requestedMode)
      ? requestedMode
      : 'FINAL_COMBINED'
    const shadowsEnabled = compositeMode !== 'REFLECTION_ONLY'
    const reflectionEnabled = compositeMode !== 'SHADOW_ONLY'
    renderer.shadowMap.enabled = shadowsEnabled
    keyLight.castShadow = shadowsEnabled
    floorReflection?.setEnabled(reflectionEnabled)
    floorReflection?.setDiagnosticMode({
      SHADOW_ONLY: 'SHADOW_ONLY',
      REFLECTION_ONLY: 'REFLECTION_ONLY_TEST',
      FINAL_COMBINED: 'FINAL_COMBINED',
    }[compositeMode])
    visualState.shadows = shadowsEnabled
    visualState.floorReflection = floorReflection?.getState() ?? null
    visualState.compositeMode = compositeMode
    return compositeMode
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
    if (candidate) candidate.object.visible = true
    pmremGenerator = new THREE.PMREMGenerator(renderer)
    const neutralRoomEnvironment = new RoomEnvironment()
    environmentRenderTarget = pmremGenerator.fromScene(neutralRoomEnvironment, 0.04)
    scene.environment = environmentRenderTarget.texture
    neutralRoomEnvironment.dispose()
    return {
      background: candidate ? {
        mesh: candidate.object.name,
        material: candidate.material.name,
        texture: [candidate.width, candidate.height],
        colorSpace: candidate.texture.colorSpace,
        type: candidate.texture.type,
        signals: candidate.score,
      } : null,
      lighting: {
        mode: 'RoomEnvironment PMREM',
        dynamicRange: 'procedural float scene converted by PMREM',
        intensity: initialLighting.environmentIntensity,
      },
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
      'StudioV2IslandPainted',
      'StudioV2IslandTimber',
      'StudioV2StoolLegMetal',
      'StudioV2StoolTimber',
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

  const loadSceneExpansion = () => loadStudioV2SceneExpansion(
    entryRoot,
    renderer,
    activeDeliveryConfig,
    {
      onAssetReady: (assetId, detail) => entryGate.markAssetReady(assetId, detail),
      photoBoardGrid,
      photoSlotOverlay,
      testConfig: entryTestConfig,
    },
  )

  const readyPromise = (async () => {
    entryGate.setPhase('loading-entry-assets')
    const placedObjectsPromise = parallelEntryLoading ? loadPlacedObjects() : null
    const sceneExpansionPromise = parallelEntryLoading ? loadSceneExpansion() : null
    const radioPanelPromise = (async () => {
      const metadataState = audioController
        ? await audioController.loadCatalogue({
          timeoutMs: STUDIO_V2_RADIO_PANEL_METADATA_TIMEOUT_MS,
        })
        : null
      radioMetadataReadyMs = Number((performance.now() - loadStartedAt).toFixed(1))
      if (disposed) return null
      const panel = createStudioV2RadioPanel({
        audioController,
        controls,
        domElement: renderer.domElement,
        orbitController: {
          getEnabled: cameraDirector.isOrbitEnabled,
          setEnabled: (enabled) => cameraDirector.setOrbitEnabled(enabled, { owner: 'RADIO_PANEL' }),
        },
        onOpenRequest: onRadioPanelOpenRequest,
        parent: entryRoot,
        renderer,
        metadataReadyAtMs: radioMetadataReadyMs,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        startedAt: loadStartedAt,
      })
      panel.setCamera(camera)
      cameraInteractionTargets.push(panel.group)
      unsubscribeRadioPanel = panel.subscribe(publishRadioPanelState)
      radioPanelReadyMs = Number((performance.now() - loadStartedAt).toFixed(1))
      await waitForEntryAsset(STUDIO_V2_RADIO_PANEL_ID, Promise.resolve(panel))
      entryGate.markAssetReady(STUDIO_V2_RADIO_PANEL_ID, {
        catalogueStatus: metadataState?.catalogueStatus ?? 'unavailable',
        fallback: metadataState?.catalogueStatus !== 'ready',
        metadataReadyMs: radioMetadataReadyMs,
        panelReadyMs: radioPanelReadyMs,
      })
      return panel
    })()
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
      [roomPreparation, placedObjectsResource, sceneExpansionResource, radioPanel] = await Promise.all([
        roomPreparationPromise,
        placedObjectsPromise,
        sceneExpansionPromise,
        radioPanelPromise,
      ])
    } else {
      roomPreparation = await roomPreparationPromise
      await new Promise((resolve) => requestAnimationFrame(() => resolve()))
      placedObjectsResource = await loadPlacedObjects()
      sceneExpansionResource = await loadSceneExpansion()
      radioPanel = await radioPanelPromise
    }
    if (!roomPreparation || disposed) {
      placedObjectsResource?.dispose()
      placedObjectsResource = null
      sceneExpansionResource?.dispose()
      sceneExpansionResource = null
      return null
    }

    const { environment, firstRoomFrameMs, gltf, tuned } = roomPreparation
    placedObjectsResource.setMaterialMode(initialAssetMaterialMode)
    sceneExpansionResource.setMaterialMode(initialAssetMaterialMode)
    cameraInteractionTargets.push(placedObjectsResource.group)
    placedObjectRecords = [
      ...placedObjectsResource.records,
      ...sceneExpansionResource.records,
    ]
    entryGate.markCondition('texturesReady', {
      formats: [...new Set([
        ...roomTextureFormats,
        ...placedObjectsResource.textureFormats,
        ...sceneExpansionResource.textureFormats,
      ])],
    })
    entryGate.markCondition('materialsReady', {
      roomMaterials: materialTuningReport.length,
      placedMaterials: placedObjectRecords.reduce(
        (total, record) => total + (record.resources?.materials ?? 0),
        0,
      ),
    })
    entryGate.markCondition('anchorsReady', {
      anchors: [
        ...placedObjectRecords.map(({ anchorName }) => anchorName),
        STUDIO_V2_RADIO_PANEL_ID,
      ],
    })
    floorReflection = createStudioV2FloorReflection({
      architecture: initialFloorArchitecture,
      debug: debug || capture,
      diagnosticMode: initialReflectionDiagnosticMode,
      enabled: initialFloorReflectionEnabled,
      root: modelRoot,
    })
    if (initialReflectionDiagnosticMode) {
      floorReflection?.setEnabled(initialFloorReflectionEnabled)
      floorReflection?.setDiagnosticMode(initialReflectionDiagnosticMode)
      visualState.compositeMode = initialReflectionDiagnosticMode
    } else {
      applyCompositeMode(initialFloorReflectionEnabled ? initialCompositeMode : 'SHADOW_ONLY')
    }
    visualState.floorReflection = floorReflection?.getState() ?? null
    mount.dataset.floorReflectionEnabled = String(Boolean(visualState.floorReflection?.enabled))
    entryRoot.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    const macbookRoot = entryRoot.getObjectByName('MACBOOK_ISLAND_01')
    tableInteractionTarget = createTableInteractionTarget()
    if (tableInteractionTarget) {
      entryRoot.add(tableInteractionTarget)
      cameraInteractionTargets.push(tableInteractionTarget)
    }
    macbookFocus = createStudioV2MacbookFocus({
      camera,
      cameraDirector,
      domElement: renderer.domElement,
      getRadioState: () => radioPanel?.getState() ?? radioPanelState,
      isInteractionLocked: () => studioV2MacbookSiteLocksStudio(macbookSiteState),
      macbookRoot,
      renderSize,
      tableTarget: tableInteractionTarget,
    })
    mount.dataset.macbookFocusTarget = 'MACBOOK_DISPLAY_TARGET'
    mount.dataset.macbookSiteState = macbookSiteState
    mount.dataset.macbookSiteMode = 'false'
    const photoBoardRoot = entryRoot.getObjectByName(STUDIO_V2_SCENE_EXPANSION_IDS.photoBoard)
    photoWallFocus = createStudioV2PhotoWallFocus({
      camera,
      cameraDirector,
      domElement: renderer.domElement,
      isInteractionLocked: () => photoDetail?.isOpen() ?? false,
      photoBoardRoot,
    })
    mount.dataset.photoWallFocusTarget = 'PHOTO_WALL_FOCUS_TARGET'
    photoHover = createStudioV2PhotoHover({
      camera,
      cameraDirector,
      domElement: renderer.domElement,
      photoBoardRoot,
    })
    photoDetail = createStudioV2PhotoDetail({
      camera,
      cameraDirector,
      domElement: renderer.domElement,
      photoBoardRoot,
      photoHover,
    })
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
      STUDIO_V2_RADIO_PANEL_ID,
      STUDIO_V2_SCENE_EXPANSION_IDS.photoBoard,
      STUDIO_V2_SCENE_EXPANSION_IDS.camera,
      STUDIO_V2_SCENE_EXPANSION_IDS.folder,
      STUDIO_V2_SCENE_EXPANSION_IDS.coffee,
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
        environmentMeshName: environment?.background?.mesh,
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
    if (floorReflection) floorReflection.renderFrame(renderer, scene, camera, cameraDirector.getReflectionCadence())
    else renderer.render(scene, camera)
    if ((debug || capture) && floorReflection) {
      const floorCoverageAudit = floorReflection.runCoverageAudit(renderer, scene, camera)
      mount.dataset.floorCoverageAudit = JSON.stringify(floorCoverageAudit)
    }
    visualState.floorReflection = floorReflection?.getState() ?? null
    mount.dataset.floorReflectionReady = String(Boolean(
      !visualState.floorReflection?.enabled
      || visualState.floorReflection?.initialRenderComplete,
    ))
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    if (disposed) return null
    entryGate.markCondition('warmupReady', { hiddenFrames: 2, warmupRender: true })
    const entry = entryGate.markSceneReady()
    cameraDirector.setOrbitEnabled(exploreEnabled)
    if (!capture) {
      const entryStartedAt = performance.now()
      if (!staticPhotoWallReview) {
        cameraDirector.startAmbientExperience({
          automatic: officialPresentation,
          immediate: true,
          startedAt: entryStartedAt,
        })
      }
      audioController?.startEntryExperience({
        timestamp: entryStartedAt,
        forcePolicyBlocked: forceAutoplayBlocked,
      })
      mount.dataset.entryExperienceStartedAt = entryStartedAt.toFixed(3)
    }
    mount.dataset.interactionsEnabled = String(cameraDirector.isOrbitEnabled())
    if (audioController) {
      marshallInteraction = createStudioV2MarshallInteraction({
        audioController,
        camera,
        controls,
        domElement: renderer.domElement,
        root: entryRoot,
        sceneReady: () => entryGate.snapshot().sceneReady,
        criticalError: () => Boolean(entryGate.snapshot().error),
        blockers: [radioPanel?.group].filter(Boolean),
      })
      unsubscribeAudioState = audioController.subscribe((audioState) => {
        mount.dataset.audioState = audioState.status
        mount.dataset.audioCurrentTime = Number(audioState.currentTime ?? 0).toFixed(3)
        mount.dataset.audioTrackId = audioState.trackId ?? ''
        mount.dataset.audioEntryStatus = audioState.entryStatus ?? ''
        mount.dataset.audioAutoplayPolicy = audioState.autoplayPolicy ?? ''
        mount.dataset.audioVolume = Number(audioState.volume ?? 0).toFixed(6)
        mount.dataset.audioPaused = String(audioState.paused ?? true)
        mount.dataset.audioRampOwnerCount = String(audioState.rampOwnerCount ?? 0)
        mount.dataset.audioFallbackArmed = String(audioState.fallbackArmed ?? false)
        mount.dataset.audioFallbackUsed = String(audioState.firstGestureFallbackUsed ?? false)
        mount.dataset.audioErrorCode = audioState.errorCode ?? ''
      })
    }

    const loadTimeMs = performance.now() - loadStartedAt
    mount.dataset.completeReadyMs = loadTimeMs.toFixed(1)
    mount.dataset.firstVisibleFrameMs = loadTimeMs.toFixed(1)
    mount.dataset.criticalRequests = String(entry.requests.length)
    if (capture || debug) {
      mount.dataset.tableOverviewCompositionAudit = JSON.stringify(tableOverviewCompositionRecord({
        camera,
        controls,
        placedObjectRecords,
        viewport: renderSize(),
        safetyInspection: cameraDirector.getDebugSnapshot().volumeInspection,
      }))
    }
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
          ...sceneExpansionResource.textureFormats,
        ])].join(', '),
        gpuTextureFormats: [...new Set([
          ...roomTextureFormats,
          ...placedObjectsResource.textureFormats,
          ...sceneExpansionResource.textureFormats,
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
      radioPanel: radioPanel?.getState() ?? null,
      floorReflection: floorReflection?.getState() ?? null,
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
      cameraDirector.setOrbitEnabled(false)
      mount.dataset.interactionsEnabled = 'false'
      entryGate.fail(error.assetId ?? null, error)
      onError?.(error)
    }
    return null
  })

  const resize = () => {
    const { width, height } = renderSize()
    camera.aspect = width / height
    cameraDirector.setViewport(width)
    photoDetail?.refresh()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.35 : pixelRatioCap))
    renderer.setSize(width, height)
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(mount)

  const performanceCases = Object.freeze([
    {
      id: 'A_MATERIAL_ONLY_STATIC',
      architecture: 'MATERIAL_ONLY',
      motion: 'STATIC',
      durationMs: performanceTest?.staticDurationMs ?? 10000,
    },
    {
      id: 'B_INTEGRATED_STATIC',
      architecture: STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
      motion: 'STATIC',
      durationMs: performanceTest?.staticDurationMs ?? 10000,
    },
    {
      id: 'C_MATERIAL_ONLY_SLOW_CAMERA',
      architecture: 'MATERIAL_ONLY',
      motion: 'SLOW_CAMERA',
      durationMs: performanceTest?.movementDurationMs ?? 10000,
    },
    {
      id: 'D_INTEGRATED_SLOW_CAMERA',
      architecture: STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
      motion: 'SLOW_CAMERA',
      durationMs: performanceTest?.movementDurationMs ?? 10000,
    },
    {
      id: 'E_INTEGRATED_FASTER_ORBIT',
      architecture: STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
      motion: 'FASTER_ORBIT',
      durationMs: performanceTest?.movementDurationMs ?? 10000,
    },
    {
      id: 'F_INTEGRATED_CONTINUOUS_SLOW_DRIFT',
      architecture: STUDIO_V2_SELECTED_FLOOR_ARCHITECTURE,
      motion: 'CONTINUOUS_SLOW_DRIFT',
      durationMs: performanceTest?.slowDriftDurationMs ?? 30000,
    },
  ])
  const performanceResults = []
  let pendingPerformanceCases = []
  let performanceSample = null
  let performanceNextAt = Infinity
  let performanceBaseline = null

  function restorePerformanceCamera() {
    if (!performanceBaseline) return
    cameraDirector.applyPose({
      position: performanceBaseline.position.toArray(),
      target: performanceBaseline.target.toArray(),
      fov: performanceBaseline.fov,
      near: camera.near,
      far: camera.far,
    })
  }

  function beginNextPerformanceCase(time) {
    if (!pendingPerformanceCases.length) {
      renderer.info.autoReset = true
      mount.dataset.performanceState = 'complete'
      mount.dataset.performanceResults = JSON.stringify(performanceResults)
      return
    }
    restorePerformanceCamera()
    const definition = pendingPerformanceCases.shift()
    floorReflection?.setArchitecture(definition.architecture)
    floorReflection?.setDiagnosticMode('FINAL_COMBINED')
    floorReflection?.markDirty()
    performanceSample = {
      ...definition,
      calls: [],
      frameTimes: [],
      lastFrameAt: null,
      startedAt: time + 1000,
      triangles: [],
      updateBaseline: null,
    }
    renderer.info.autoReset = false
    performanceNextAt = Infinity
    mount.dataset.performanceCase = definition.id
    mount.dataset.performanceState = 'settling'
  }

  function applyPerformanceMotion(time) {
    if (!performanceSample || time < performanceSample.startedAt || !performanceBaseline) return
    if (!performanceSample.updateBaseline) {
      const floorState = floorReflection?.getState()
      performanceSample.updateBaseline = {
        blur: floorState?.blurUpdateCount ?? 0,
        source: floorState?.updateCount ?? 0,
      }
      mount.dataset.performanceState = 'measuring'
    }
    if (performanceSample.motion === 'STATIC') return
    const elapsedSeconds = (time - performanceSample.startedAt) / 1000
    const phase = performanceSample.motion === 'FASTER_ORBIT'
      ? Math.sin(elapsedSeconds) * 0.13
      : performanceSample.motion === 'CONTINUOUS_SLOW_DRIFT'
        ? Math.sin(elapsedSeconds * 0.16) * 0.025
        : Math.sin(elapsedSeconds * 0.35) * 0.025
    const offset = performanceBaseline.position.clone().sub(performanceBaseline.target)
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), phase)
    cameraDirector.applyPose({
      position: performanceBaseline.target.clone().add(offset).toArray(),
      target: performanceBaseline.target.toArray(),
      fov: performanceBaseline.fov,
      near: camera.near,
      far: camera.far,
    })
  }

  function completePerformanceCase(time) {
    const sample = performanceSample
    if (!sample?.updateBaseline || time - sample.startedAt < sample.durationMs) return
    const sortedFrameTimes = [...sample.frameTimes].sort((a, b) => a - b)
    const elapsedSeconds = Math.max(0.001, (time - sample.startedAt) / 1000)
    const averageFrameTimeMs = sample.frameTimes.reduce((total, value) => total + value, 0)
      / Math.max(1, sample.frameTimes.length)
    const averageCalls = sample.calls.reduce((total, value) => total + value, 0)
      / Math.max(1, sample.calls.length)
    const averageTriangles = sample.triangles.reduce((total, value) => total + value, 0)
      / Math.max(1, sample.triangles.length)
    const floorState = floorReflection?.getState()
    const result = {
      averageFps: Number((1000 / Math.max(averageFrameTimeMs, 0.001)).toFixed(2)),
      averageFrameTimeMs: Number(averageFrameTimeMs.toFixed(3)),
      blurTarget: floorState?.blurTextureSize ?? null,
      blurUpdateRateHz: Number((((floorState?.blurUpdateCount ?? 0) - sample.updateBaseline.blur) / elapsedSeconds).toFixed(2)),
      drawCalls: Number(averageCalls.toFixed(1)),
      durationSeconds: Number(elapsedSeconds.toFixed(2)),
      effectiveDpr: renderer.getPixelRatio(),
      frames: sample.frameTimes.length,
      id: sample.id,
      medianFps: Number((1000 / Math.max(percentile(sortedFrameTimes, 0.5), 0.001)).toFixed(2)),
      motion: sample.motion,
      onePercentLowFps: Number((1000 / Math.max(percentile(sortedFrameTimes, 0.99), 0.001)).toFixed(2)),
      p95FrameTimeMs: Number(percentile(sortedFrameTimes, 0.95).toFixed(3)),
      renderedTriangles: Math.round(averageTriangles),
      sourceTarget: floorState?.textureSize ?? null,
      sourceUpdateRateHz: Number((((floorState?.updateCount ?? 0) - sample.updateBaseline.source) / elapsedSeconds).toFixed(2)),
      staticUpdateRateHz: sample.motion === 'STATIC'
        ? Number((((floorState?.updateCount ?? 0) - sample.updateBaseline.source) / elapsedSeconds).toFixed(2))
        : null,
      viewport: [renderSize().width, renderSize().height],
    }
    performanceResults.push(result)
    mount.dataset.performanceResults = JSON.stringify(performanceResults)
    performanceSample = null
    restorePerformanceCamera()
    floorReflection?.markDirty()
    performanceNextAt = time + 750
    mount.dataset.performanceState = pendingPerformanceCases.length ? 'between-cases' : 'complete'
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
    if (time >= performanceNextAt && !performanceSample) beginNextPerformanceCase(time)
    applyPerformanceMotion(time)
    // Camera Director owns transition, controls, safety resolution and final pose
    // within one update cycle, so no invalid candidate reaches the renderer.
    cameraDirector.update(time)
    photoHover?.update(time)
    photoDetail?.update(time)
    macbookFocus?.update(time)
    mount.dataset.cameraDirectorState = cameraDirector.getCurrentState()
    mount.dataset.cameraEndpointPhase = cameraDirector.getEndpointPhase()
    mount.dataset.cameraRailProgress = String(cameraDirector.getRailProgress())
    mount.dataset.macbookFocusState = macbookFocus?.getState().state ?? 'UNAVAILABLE'
    mount.dataset.photoWallFocusState = photoWallFocus?.getState().state ?? 'UNAVAILABLE'
    mount.dataset.photoHoverId = photoHover?.getState().hoveredId ?? 'NONE'
    mount.dataset.photoDetailState = photoDetail?.getState().interactionState ?? 'UNAVAILABLE'
    lightHelpers.forEach((helper) => helper.update())
    if (performanceSample?.updateBaseline) renderer.info.reset()
    if (floorReflection) floorReflection.renderFrame(renderer, scene, camera, cameraDirector.getReflectionCadence())
    else renderer.render(scene, camera)
    if (performanceSample?.updateBaseline) {
      if (performanceSample.lastFrameAt !== null) {
        performanceSample.frameTimes.push(time - performanceSample.lastFrameAt)
        performanceSample.calls.push(renderer.info.render.calls)
        performanceSample.triangles.push(renderer.info.render.triangles)
      }
      performanceSample.lastFrameAt = time
      completePerformanceCase(time)
    }
    frameCount += 1
    if (time - lastSampleAt >= 1000) {
      visualState.floorReflection = floorReflection?.getState() ?? null
      if (visualState.floorReflection) {
        mount.dataset.floorReflectionEnabled = String(visualState.floorReflection.enabled)
        mount.dataset.floorReflectionUpdates = String(visualState.floorReflection.updateCount)
        mount.dataset.floorReflectionRate = String(visualState.floorReflection.updateRateHz)
        mount.dataset.floorReflectionBlurReady = String(visualState.floorReflection.blurReady)
        mount.dataset.floorReflectionBlurUpdates = String(visualState.floorReflection.blurUpdateCount)
        mount.dataset.floorReflectionBlurRate = String(visualState.floorReflection.blurUpdateRateHz)
      }
      diagnostics.fps = Math.round(frameCount * 1000 / (time - lastSampleAt))
      diagnostics.calls = renderer.info.render.calls
      diagnostics.triangles = renderer.info.render.triangles
      diagnostics.geometries = renderer.info.memory.geometries
      diagnostics.textures = renderer.info.memory.textures
      const cameraDirectorState = cameraDirector.getDebugSnapshot()
      mount.dataset.cameraDirectorAudit = JSON.stringify(cameraDirectorState)
      mount.dataset.floorReflectionAudit = JSON.stringify(visualState.floorReflection)
      mount.dataset.renderFps = String(diagnostics.fps)
      mount.dataset.renderCalls = String(diagnostics.calls)
      mount.dataset.renderTriangles = String(diagnostics.triangles)
      mount.dataset.cameraDirectorState = cameraDirectorState.state
      mount.dataset.cameraTransition = cameraDirectorState.transition?.id ?? 'NONE'
      mount.dataset.cameraSafetyClamp = String(cameraDirectorState.safetyClampActive)
      mount.dataset.cameraRailProgress = String(cameraDirectorState.ambient?.railProgress ?? 0)
      mount.dataset.cameraPaused = String(cameraDirectorState.ambient?.paused ?? false)
      mount.dataset.macbookFocusAudit = JSON.stringify(macbookFocus?.getState() ?? null)
      onDiagnostics?.({
        ...diagnostics,
        camera: {
          position: roundedVector(camera.position),
          target: roundedVector(controls.target),
          fov: Number(camera.fov.toFixed(1)),
          safe: cameraDirectorState.volumeSafe,
        },
        cameraDirector: cameraDirectorState,
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
        radioPanel: radioPanel?.getState() ?? radioPanelState,
        entry: entryGate.snapshot(),
        viewport: [renderSize().width, renderSize().height],
      })
      frameCount = 0
      lastSampleAt = time
    }
    animationFrame = requestAnimationFrame(render)
  }
  animationFrame = requestAnimationFrame(render)

  if ((debug || capture) && performanceTest?.suite) {
    readyPromise.then(() => {
      if (disposed) return
      performanceBaseline = {
        fov: camera.fov,
        position: camera.position.clone(),
        target: controls.target.clone(),
      }
      pendingPerformanceCases = performanceTest.caseId
        ? performanceCases.filter(({ id }) => id === performanceTest.caseId)
        : [...performanceCases]
      performanceNextAt = performance.now() + 1800
      mount.dataset.performanceState = 'scheduled'
    })
  }

  const runtime = {
    readyPromise,
    sceneReadyPromise: readyPromise,
    resetCamera({ smooth = true } = {}) {
      return cameraDirector.resetToRoomWideStart({ automatic: officialPresentation && smooth })
    },
    setCameraPreset(presetName, { smooth = false } = {}) {
      const pose = cameraConfigForPreset(presetName)
      return smooth
        ? cameraDirector.transitionTo(pose, { allowOfficial: true, duration: 700 })
        : cameraDirector.applyPose(pose)
    },
    setCameraConfig(config, { smooth = false } = {}) {
      const pose = { ...cameraDirector.getCurrentPose(), ...config }
      return smooth
        ? cameraDirector.transitionTo(pose, { allowOfficial: true, duration: 700 })
        : cameraDirector.applyPose(pose)
    },
    setExplore(enabled) {
      exploreEnabled = enabled
      cameraDirector.setOrbitEnabled(
        entryGate.snapshot().sceneReady && Boolean(modelRoot) && enabled,
      )
      mount.dataset.interactionsEnabled = String(cameraDirector.isOrbitEnabled())
    },
    setOfficialRearWallPreview(enabled) {
      if (!debug) return false
      rearWallPreviewEnabled = Boolean(enabled)
      applyRearWallLimits()
      cameraDirector.update(performance.now())
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
      visualState.compositeMode = enabled
        ? (visualState.floorReflection?.enabled ? 'FINAL_COMBINED' : 'SHADOW_ONLY')
        : (visualState.floorReflection?.enabled ? 'REFLECTION_ONLY' : 'CUSTOM_OFF')
      floorReflection?.markDirty()
    },
    setFloorReflection(enabled) {
      const state = floorReflection?.setEnabled(enabled) ?? null
      visualState.floorReflection = state
      if (state) {
        mount.dataset.floorReflectionEnabled = String(state.enabled)
        mount.dataset.floorReflectionReady = String(
          !state.enabled || state.initialRenderComplete,
        )
        visualState.compositeMode = state.enabled
          ? (visualState.shadows ? 'FINAL_COMBINED' : 'REFLECTION_ONLY')
          : (visualState.shadows ? 'SHADOW_ONLY' : 'CUSTOM_OFF')
      }
      return state
    },
    setFloorArchitecture(architecture) {
      const state = floorReflection?.setArchitecture(architecture) ?? null
      visualState.floorReflection = state
      return state
    },
    setReflectionDiagnosticMode(mode) {
      if (mode === 'SHADOW_ONLY') return applyCompositeMode('SHADOW_ONLY')
      if (mode === 'REFLECTION_ONLY_TEST') return applyCompositeMode('REFLECTION_ONLY')
      renderer.shadowMap.enabled = true
      keyLight.castShadow = true
      floorReflection?.setEnabled(true)
      const state = floorReflection?.setDiagnosticMode(mode) ?? null
      visualState.shadows = true
      visualState.floorReflection = state
      visualState.compositeMode = mode
      return state
    },
    setShadowProfile(profileName) {
      return applyShadowProfile(profileName)
    },
    setCompositeMode(mode) {
      return applyCompositeMode(mode)
    },
    getFloorReflectionState() {
      return floorReflection?.getState() ?? null
    },
    getPerformanceResults() {
      return [...performanceResults]
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
      keyLight.color.set(candidate.key.color)
      keyLight.intensity = candidate.key.intensity
      keyLight.position.set(...candidate.key.position)
      keyLight.target.position.set(...(candidate.key.target ?? [0, 0, 0]))
      keyLight.shadow.intensity = candidate.key.shadowIntensity
      fillLight.color.set(candidate.fill.color)
      fillLight.intensity = candidate.fill.intensity
      fillLight.position.set(...candidate.fill.position)
      return true
    },
    getCameraConfig() {
      return cameraDirector.getCurrentPose()
    },
    getCameraDirectorState() {
      return cameraDirector.getDebugSnapshot()
    },
    getMacbookFocusState() {
      return macbookFocus?.getState() ?? null
    },
    getMacbookSiteMode() {
      return studioV2MacbookSiteLocksStudio(macbookSiteState)
    },
    getMacbookSiteState() {
      return macbookSiteState
    },
    setMacbookSiteState(nextState) {
      if (!Object.values(STUDIO_V2_MACBOOK_SITE_STATES).includes(nextState)) return macbookSiteState
      macbookSiteState = nextState
      const locked = studioV2MacbookSiteLocksStudio(macbookSiteState)
      renderer.domElement.style.pointerEvents = locked ? 'none' : ''
      cameraDirector.setPauseReason('MACBOOK_SITE_MODE', locked)
      mount.dataset.macbookSiteMode = String(locked)
      mount.dataset.macbookSiteState = macbookSiteState
      return macbookSiteState
    },
    subscribeMacbookFocus(listener) {
      return macbookFocus?.subscribe(listener) ?? (() => {})
    },
    subscribeMacbookPortalOpenRequest(listener) {
      return macbookFocus?.subscribePortalOpen(listener) ?? (() => {})
    },
    getMacbookDisplayContract() {
      return macbookFocus?.getContract() ?? null
    },
    getMacbookDisplayProjection() {
      return macbookFocus?.getProjection() ?? null
    },
    getMacbookChromeProjection() {
      return macbookFocus?.getChromeProjection() ?? null
    },
    requestMacbookFocus(source = 'RUNTIME') {
      return macbookFocus?.requestFocus(source) ?? false
    },
    requestMacbookPortalOpen(source = 'RUNTIME') {
      return macbookFocus?.requestPortalOpen(source) ?? false
    },
    requestTableSkip() {
      return cameraDirector.requestTableSkip()
    },
    getAudioRuntimeState() {
      return audioController?.getState?.() ?? null
    },
    closeMacbookFocus(source = 'RUNTIME') {
      return macbookFocus?.closeFocus(source) ?? false
    },
    refreshMacbookFocus() {
      return macbookFocus?.refresh() ?? false
    },
    setMacbookReducedMotionOverride(mode) {
      if (!debug && !capture) return 'AUTO'
      return macbookFocus?.setReducedMotionOverride(mode) ?? 'AUTO'
    },
    getPhotoWallFocusState() {
      return photoWallFocus?.getState() ?? null
    },
    getPhotoWallFocusContract() {
      return photoWallFocus?.getContract() ?? null
    },
    subscribePhotoWallFocus(listener) {
      return photoWallFocus?.subscribe(listener) ?? (() => {})
    },
    requestPhotoWallFocus(source = 'RUNTIME') {
      return photoWallFocus?.requestFocus(source) ?? false
    },
    closePhotoWallFocus(source = 'RUNTIME') {
      return photoWallFocus?.closeFocus(source) ?? false
    },
    setPhotoWallReducedMotionOverride(mode) {
      if (!debug && !capture) return 'AUTO'
      return photoWallFocus?.setReducedMotionOverride(mode) ?? 'AUTO'
    },
    getPhotoHoverState() {
      return photoHover?.getState() ?? null
    },
    getPhotoDetailState() {
      return photoDetail?.getState() ?? null
    },
    requestPhotoDetail(id, source = 'RUNTIME') {
      return photoDetail?.requestDetailById(id, source) ?? false
    },
    closePhotoDetail(source = 'RUNTIME') {
      return photoDetail?.closeDetail(source) ?? false
    },
    getAmbientCameraReport() {
      return cameraDirector.getAmbientReport()
    },
    startAmbientCamera({ immediate = true } = {}) {
      if (!debug) return false
      return cameraDirector.startAmbientExperience({ automatic: true, immediate })
    },
    setAmbientCameraSpeed(multiplier) {
      if (!debug) return false
      return cameraDirector.setAmbientSpeedMultiplier(multiplier)
    },
    scrubAmbientCamera(progress) {
      if (!debug) return false
      return cameraDirector.scrubAmbientProgress(progress)
    },
    setDebugHeadLook(options) {
      if (!debug) return false
      return cameraDirector.setDebugHeadLook(options)
    },
    releaseDebugHeadLook() {
      if (!debug) return false
      return cameraDirector.releaseDebugHeadLook()
    },
    setDebugHeadLookReturnProgress(progress) {
      if (!debug) return false
      return cameraDirector.setDebugReturnProgress(progress)
    },
    setDebugTableOrbitPose(options) {
      if (!debug) return false
      return cameraDirector.setDebugTableOrbitPose(options)
    },
    setDebugTablePitch(viewPitchDegrees = 0, azimuthDegrees = 0, radius = 1.775) {
      if (!debug) return false
      return cameraDirector.setDebugTableOrbitPose({
        radius,
        azimuthDegrees,
        polarRadians: THREE.MathUtils.degToRad(90 + Number(viewPitchDegrees)),
      })
    },
    interruptDebugHeadLookReturn(options) {
      if (!debug) return false
      return cameraDirector.interruptDebugReturn(options)
    },
    resetAmbientCamera() {
      if (!debug) return false
      return cameraDirector.resetToRoomWideStart({ automatic: false })
    },
    jumpCameraToTableOverview() {
      if (!debug) return false
      return cameraDirector.jumpToTableOverview()
    },
    enterTableFreeOrbit() {
      if (!debug) return false
      return cameraDirector.enterTableFreeOrbit()
    },
    setAmbientPathVisible(visible) {
      if (!debug) return false
      return cameraDirector.setPathVisible(visible)
    },
    setAmbientControlPointsVisible(visible) {
      if (!debug) return false
      return cameraDirector.setControlPointsVisible(visible)
    },
    setAmbientReducedMotionOverride(mode) {
      if (!debug) return false
      return cameraDirector.setReducedMotionOverride(mode)
    },
    transitionCameraTo(poseOrState, options) {
      if (!debug) return false
      return cameraDirector.transitionTo(poseOrState, options)
    },
    cancelCameraTransition(reason) {
      if (!debug) return false
      return cameraDirector.cancelTransition(reason)
    },
    captureCurrentCameraPose() {
      if (!debug) return ''
      return cameraDirector.captureCurrentPose()
    },
    resetCameraDirectorOpening({ smooth = false } = {}) {
      if (!debug) return false
      return cameraDirector.resetToAcceptedOpening({ smooth })
    },
    setCameraSafeVolumeVisible(visible) {
      if (!debug) return false
      return cameraDirector.setSafeVolumeVisible(visible)
    },
    setCameraMajorObstaclesVisible(visible) {
      if (!debug) return false
      return cameraDirector.setMajorObstaclesVisible(visible)
    },
    getCameraSafety() {
      return {
        ...cameraSafety.record(),
        safeInteriorVolume: cameraDirector.getDebugSnapshot().safety,
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
          ...(sceneExpansionResource?.textureFormats ?? []),
        ])].join(', ') || roomLoaderSupport?.selectedGpuTextureFormat,
        gpuTextureFormats: [...new Set([
          ...roomTextureFormats,
          ...(placedObjectsResource?.textureFormats ?? []),
          ...(sceneExpansionResource?.textureFormats ?? []),
        ])],
      }
    },
    getSceneReadyState() {
      return entryGate.snapshot()
    },
    getMarshallInteractionState() {
      return marshallInteraction?.getState() ?? null
    },
    subscribeMarshallInteraction(listener) {
      return marshallInteraction?.subscribe(listener) ?? (() => {})
    },
    toggleMarshallAudio(source = 'runtime') {
      return marshallInteraction?.toggle(source) ?? Promise.resolve(audioController?.getState?.())
    },
    getRadioPanelState() {
      return radioPanel?.getState() ?? radioPanelState
    },
    subscribeRadioPanel(listener) {
      radioPanelSubscribers.add(listener)
      if (radioPanelState) listener(radioPanelState)
      return () => radioPanelSubscribers.delete(listener)
    },
    toggleRadioPanel() {
      return radioPanel?.openScreenPlayer() ?? null
    },
    setRadioPanelExpanded(expanded, options) {
      if (expanded) return radioPanel?.openScreenPlayer() ?? null
      onRadioPanelCloseRequest?.({ immediate: Boolean(options?.immediate) })
      return radioPanel?.getState() ?? null
    },
    openRadioScreen() {
      return radioPanel?.openScreenPlayer() ?? null
    },
    closeRadioScreen(options) {
      onRadioPanelCloseRequest?.(options ?? {})
      return radioPanel?.getState() ?? null
    },
    setRadioScreenState(state) {
      return radioPanel?.setScreenPlayerState(state) ?? null
    },
    getRadioPanelScreenBounds() {
      return radioPanel?.getProjectedBounds() ?? null
    },
    prepareRadioPanelCompactSurface() {
      return radioPanel?.prepareCompactTexture() ?? null
    },
    animateRadioPanelWorldLayers(options) {
      return radioPanel?.animateWorldLayers(options) ?? null
    },
    selectRadioTrack(trackId) {
      const track = audioController?.getState?.().tracks?.find(({ id }) => id === trackId)
      return radioPanel?.selectTrack(track) ?? Promise.resolve(null)
    },
    setRadioPanelPosition(axis, value) {
      if (!debug) return radioPanel?.getState() ?? null
      return radioPanel?.setDebugPosition(axis, value) ?? null
    },
    setRadioPanelRotationDegrees(axis, value) {
      if (!debug) return radioPanel?.getState() ?? null
      return radioPanel?.setDebugRotationDegrees(axis, value) ?? null
    },
    resetRadioPanelTransform() {
      if (!debug) return radioPanel?.getState() ?? null
      return radioPanel?.resetDebugTransform() ?? null
    },
    getAssetMaterialMode() {
      return placedObjectsResource?.getMaterialMode() ?? 'refined'
    },
    setAssetMaterialMode(mode) {
      const materialMode = placedObjectsResource?.setMaterialMode(mode) ?? 'refined'
      sceneExpansionResource?.setMaterialMode(materialMode)
      return materialMode
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
      marshallInteraction?.dispose()
      unsubscribeAudioState?.()
      unsubscribeRadioPanel?.()
      radioPanel?.dispose()
      macbookFocus?.dispose()
      macbookFocus = null
      macbookSiteState = STUDIO_V2_MACBOOK_SITE_STATES.CLOSED
      renderer.domElement.style.pointerEvents = ''
      photoWallFocus?.dispose()
      photoWallFocus = null
      photoDetail?.dispose()
      photoDetail = null
      photoHover?.dispose()
      photoHover = null
      tableInteractionTarget?.geometry.dispose()
      tableInteractionTarget?.material.dispose()
      tableInteractionTarget?.removeFromParent()
      tableInteractionTarget = null
      radioPanelSubscribers.clear()
      cameraDirector.dispose()
      controls.dispose()
      placedObjectsResource?.dispose()
      sceneExpansionResource?.dispose()
      floorReflection?.dispose()
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
      delete mount.dataset.audioState
      delete mount.dataset.audioCurrentTime
      delete mount.dataset.audioTrackId
      delete mount.dataset.renderFps
      delete mount.dataset.renderCalls
      delete mount.dataset.renderTriangles
      delete mount.dataset.cameraDirectorState
      delete mount.dataset.cameraEndpointPhase
      delete mount.dataset.cameraDirectorAudit
      delete mount.dataset.floorReflectionAudit
      delete mount.dataset.cameraTransition
      delete mount.dataset.cameraSafetyClamp
      delete mount.dataset.cameraRailProgress
      delete mount.dataset.cameraPaused
      delete mount.dataset.macbookFocusState
      delete mount.dataset.macbookFocusAudit
      delete mount.dataset.macbookFocusTarget
      delete mount.dataset.macbookSiteMode
      delete mount.dataset.macbookSiteState
      delete mount.dataset.photoWallFocusState
      delete mount.dataset.photoWallFocusTarget
      delete mount.dataset.photoHoverId
      delete mount.dataset.photoDetailState
      delete mount.dataset.floorReflectionEnabled
      delete mount.dataset.floorReflectionReady
      delete mount.dataset.floorReflectionUpdates
      delete mount.dataset.floorReflectionRate
      delete mount.dataset.floorReflectionBlurReady
      delete mount.dataset.floorReflectionBlurUpdates
      delete mount.dataset.floorReflectionBlurRate
      delete mount.dataset.floorCoverageAudit
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

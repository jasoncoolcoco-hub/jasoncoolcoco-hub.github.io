import * as THREE from 'three/webgpu'
import {
  bumpMap,
  cameraPosition,
  color,
  max,
  mix,
  normalWorldGeometry,
  normalize,
  output,
  positionWorld,
  step,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl'
import {
  footprintsExploreFraming,
  initialFootprintsView,
} from '../../data/footprintsView'
import {
  footprintBaseLocations,
  footprintBaseLocationsById,
} from '../../data/locations'
import { destinations } from '../../data/destinations'
import { getSecondaryRoutesForDestination } from '../../data/secondaryRoutes'
import { createFootprintsLabelLayer } from './createFootprintsLabelLayer'
import { createFootprintsRouteLayer } from './createFootprintsRouteLayer'
import { geoToVector3 } from './geoToVector3'

const fullTextureSources = {
  day: '/images/earth/earth_day_4096.jpg',
  night: '/images/earth/earth_night_4096.jpg',
  surface: '/images/earth/earth_bump_roughness_clouds_4096.jpg',
}

const reducedTextureSources = {
  day: '/images/earth/earth_day_2048.jpg',
  night: '/images/earth/earth_night_2048.jpg',
  surface: '/images/earth/earth_bump_roughness_clouds_2048.jpg',
}

const degreesToRadians = Math.PI / 180
const minimumZoom = 0.9
const desiredMaximumZoom = 1.7
const defaultZoom = 1
const mobileBaseCameraDistance = 4.8
const compactBaseCameraDistance = 5.35
const desktopBaseCameraDistance = 5.83
const zoomDamping = 6.1
const defaultRotationSpeed = 0.0277
const exploreRotationSpeed = 0.0147
const rotationSpeedBlendDuration = 0.58
const rotationSpeedBlendRate =
  Math.log(10) / rotationSpeedBlendDuration
const idleRotationResumeRate = 6.6
const exploreDragSensitivity = Math.PI * 1.65
const exploreHorizontalSensitivityMultiplier = 0.42
const exploreVerticalSensitivityMultiplier = 0.32
const exploreDragDampingRate = 14
const exploreDragSettleThreshold = 0.0001
const explorePitchLimit = Math.PI / 10
const localNorthAxis = new THREE.Vector3(0, 1, 0)
const cameraVerticalAxis = new THREE.Vector3(1, 0, 0)
const cameraFacingDirection = new THREE.Vector3(0, 0, 1)

function screenDeltaToDirectRotation(
  delta,
  viewportSize,
  axisMultiplier,
  sensitivity,
) {
  return (
    (delta / Math.max(1, viewportSize)) *
    exploreDragSensitivity *
    axisMultiplier *
    sensitivity
  )
}

function shouldUseReducedTextures() {
  const narrowViewport = window.matchMedia('(max-width: 700px)').matches
  const limitedMemory =
    typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4
  const limitedCpu =
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency <= 4

  return narrowViewport || limitedMemory || limitedCpu
}

export async function createEarthRenderer({
  forceWebGL = false,
  mount,
  onSelectionChange,
  reducedMotion,
}) {
  const isMobileViewport = window.innerWidth <= 700
  const isCompactViewport = window.innerWidth <= 900
  const baseCameraDistance = isMobileViewport
    ? mobileBaseCameraDistance
    : isCompactViewport
      ? compactBaseCameraDistance
      : desktopBaseCameraDistance
  let maximumZoom = desiredMaximumZoom
  const renderer = new THREE.WebGPURenderer({
    alpha: true,
    antialias: true,
    forceWebGL,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  renderer.domElement.className = 'earth-canvas__surface'

  let dayTexture
  let nightTexture
  let surfaceTexture
  let textureQuality = '4096'

  try {
    await renderer.init()

    const useReducedTextures = shouldUseReducedTextures()
    const textureSources = useReducedTextures
      ? reducedTextureSources
      : fullTextureSources
    const textureLoader = new THREE.TextureLoader()
    const [
      loadedDayTexture,
      loadedNightTexture,
      loadedSurfaceTexture,
    ] = await Promise.all([
      textureLoader.loadAsync(textureSources.day),
      textureLoader.loadAsync(textureSources.night),
      textureLoader.loadAsync(textureSources.surface),
    ])
    dayTexture = loadedDayTexture
    nightTexture = loadedNightTexture
    surfaceTexture = loadedSurfaceTexture
    textureQuality = useReducedTextures ? '2048' : '4096'
  } catch (error) {
    dayTexture?.dispose()
    nightTexture?.dispose()
    surfaceTexture?.dispose()
    renderer.dispose()
    throw error
  }

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
  camera.position.set(0, 0, baseCameraDistance)

  const scene = new THREE.Scene()

  const sun = new THREE.DirectionalLight('#dceeff', 2)
  sun.position.set(-2.15, 1.25, -0.45)
  scene.add(sun)
  scene.add(new THREE.HemisphereLight('#5b8299', '#0a151d', 0.22))
  scene.add(new THREE.AmbientLight('#385a69', 0.18))

  const atmosphereDayColor = uniform(color('#4fa7d1'))
  const atmosphereTwilightColor = uniform(color('#173f69'))
  const roughnessLow = uniform(0.38)
  const roughnessHigh = uniform(0.54)

  dayTexture.colorSpace = THREE.SRGBColorSpace
  dayTexture.anisotropy = 8
  nightTexture.colorSpace = THREE.SRGBColorSpace
  nightTexture.anisotropy = 8
  surfaceTexture.anisotropy = 8

  const viewDirection = positionWorld.sub(cameraPosition).normalize()
  const fresnel = viewDirection
    .dot(normalWorldGeometry)
    .abs()
    .oneMinus()
    .toVar()
  const sunOrientation = normalWorldGeometry
    .dot(normalize(sun.position))
    .toVar()
  const atmosphereColor = mix(
    atmosphereTwilightColor,
    atmosphereDayColor,
    sunOrientation.smoothstep(-0.32, 0.76),
  )

  const cloudsStrength = texture(surfaceTexture, uv())
    .b
    .smoothstep(0.2, 1)
  const daySample = texture(dayTexture)
  const coolDay = daySample.rgb.mul(vec3(0.84, 0.93, 1.04))

  const globeMaterial = new THREE.MeshStandardNodeMaterial()
  globeMaterial.colorNode = mix(
    coolDay,
    vec3(0.84, 0.92, 0.97),
    cloudsStrength.mul(1.55),
  )

  const roughness = max(
    texture(surfaceTexture).g,
    step(0.01, cloudsStrength),
  )
  globeMaterial.roughnessNode = roughness.remap(
    0,
    1,
    roughnessLow,
    roughnessHigh,
  )

  const night = texture(nightTexture)
  const shadowSurface = mix(
    coolDay.mul(vec3(0.085, 0.115, 0.16)),
    vec3(0.075, 0.1, 0.14),
    cloudsStrength.mul(0.34),
  )
  const warmCityLights = night.rgb
    .mul(vec3(1.04, 0.78, 0.52))
    .mul(0.52)
  const shadowOutput = shadowSurface.add(warmCityLights)
  const dayStrength = sunOrientation.smoothstep(0, 0.62)
  const atmosphereDayStrength = sunOrientation
    .smoothstep(-0.58, 0.72)
    .mul(0.78)
    .add(0.22)
  const atmosphereMix = atmosphereDayStrength
    .mul(fresnel.pow(2))
    .clamp(0, 1)

  let finalOutput = mix(shadowOutput, output.rgb, dayStrength)
  finalOutput = mix(finalOutput, atmosphereColor, atmosphereMix)
  globeMaterial.outputNode = vec4(finalOutput, output.a)

  const bumpElevation = max(
    texture(surfaceTexture).r,
    cloudsStrength,
  ).mul(0.36)
  globeMaterial.normalNode = bumpMap(bumpElevation)

  const sphereGeometry = new THREE.SphereGeometry(1, 96, 96)
  const globe = new THREE.Mesh(sphereGeometry, globeMaterial)

  const atmosphereMaterial = new THREE.MeshBasicNodeMaterial({
    side: THREE.BackSide,
    transparent: true,
  })
  atmosphereMaterial.alphaToCoverage = true
  atmosphereMaterial.depthWrite = false
  atmosphereMaterial.premultipliedAlpha = true
  let atmosphereAlpha = fresnel.remap(0.73, 1, 1, 0).pow(3)
  atmosphereAlpha = atmosphereAlpha.mul(atmosphereDayStrength)
  atmosphereMaterial.outputNode = vec4(
    atmosphereColor,
    atmosphereAlpha.mul(0.54),
  )

  const atmosphere = new THREE.Mesh(sphereGeometry, atmosphereMaterial)
  atmosphere.scale.setScalar(1.038)
  atmosphere.renderOrder = 1

  let isDragging = false
  let dragLastX = 0
  let dragLastY = 0
  let pendingExploreYaw = 0
  let pendingExplorePitch = 0
  let isExploreMode = false
  let hasEnteredFootprints = false
  let scrollRotation = 0
  let zoomCurrent = defaultZoom
  let zoomTarget = defaultZoom
  let idleRotationResumeBlend = 1
  let rotationSpeedCurrent = defaultRotationSpeed
  let rotationSpeedTarget = defaultRotationSpeed
  let introLocked = true

  const setIntroLocked = (nextLocked) => {
    introLocked = nextLocked
    mount.dataset.introLocked = nextLocked ? 'true' : 'false'
    pendingExploreYaw = 0
    pendingExplorePitch = 0
    isDragging = false
    idleRotationResumeBlend = 1
    rotationSpeedCurrent = rotationSpeedTarget

    if (nextLocked) {
      zoomCurrent = isExploreMode ? maximumZoom : defaultZoom
      zoomTarget = zoomCurrent
      camera.position.z = baseCameraDistance / zoomCurrent
    }
  }

  const earthVisualGroup = new THREE.Group()
  let footprintsLabelLayer = null
  const pendingLabelUnlocks = new Map()
  const resetFootprintsLabels = () => {
    pendingLabelUnlocks.clear()
    footprintsLabelLayer?.reset()
  }
  const unlockFootprintsLabel = (location) => {
    pendingLabelUnlocks.set(
      `${location.kind}:${location.id}`,
      location,
    )
    footprintsLabelLayer?.unlock(location)
  }
  const footprintsRouteLayer = createFootprintsRouteLayer({
    onLabelReset: resetFootprintsLabels,
    onLabelUnlock: unlockFootprintsLabel,
    onPhaseChange: (phase) => {
      mount.dataset.routeAnimationPhase = phase
    },
    onStateChange: (state) => {
      mount.dataset.routeAnimationState = state
      if (state === 'preparing' || state === 'playing') {
        setIntroLocked(true)
      } else if (state === 'complete') {
        setIntroLocked(false)
      }
    },
    reducedMotion,
  })
  mount.dataset.routeAnimationState = 'idle'
  setIntroLocked(true)
  const labelLocations = [
    ...footprintBaseLocations.map((location) => ({
      ...location,
      kind: 'base',
      entity: {
        baseId: location.id,
        baseIds: [location.id],
        id: location.id,
        kind: 'base',
        priority: 2,
        routeIds: [],
      },
    })),
    ...destinations.map((destination) => {
      const routes = getSecondaryRoutesForDestination(destination.id)
      return {
        ...destination,
        kind: 'destination',
        entity: {
          baseIds: routes.map((route) => route.baseId),
          destinationId: destination.id,
          id: destination.id,
          kind: 'destination',
          priority: 3,
          routeIds: routes.map((route) => route.id),
        },
      }
    }),
  ]
  earthVisualGroup.add(
    globe,
    atmosphere,
    footprintsRouteLayer.group,
  )

  const orientationGroup = new THREE.Group()
  orientationGroup.add(earthVisualGroup)

  const scrollGroup = new THREE.Group()
  scrollGroup.add(orientationGroup)
  scene.add(scrollGroup)

  let selectedEntity = null

  mount.appendChild(renderer.domElement)

  let width = 1
  let height = 1
  let frameId = null
  let lastFrameTime = performance.now()
  let isVisible = false
  let isPageVisible = !document.hidden
  const automaticQuaternion = new THREE.Quaternion()
  const keyboardQuaternion = new THREE.Quaternion()
  const transformedNorthAxis = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const initialAlignmentQuaternion = new THREE.Quaternion()
  const initialOffsetQuaternion = new THREE.Quaternion()
  const introStartQuaternion = new THREE.Quaternion()
  const introTargetQuaternion = new THREE.Quaternion()
  const introTimelineQuaternion = new THREE.Quaternion()
  const inverseScrollQuaternion = new THREE.Quaternion()
  const scrollOrientationQuaternion = new THREE.Quaternion()
  const initialWorldFocusDirection = new THREE.Vector3()
  const initialOffsetEuler = new THREE.Euler(
    initialFootprintsView.offsetDegrees.pitch * degreesToRadians,
    initialFootprintsView.offsetDegrees.yaw * degreesToRadians,
    0,
    'YXZ',
  )
  const initialFocusLocation = footprintBaseLocationsById.get(
    initialFootprintsView.focusCityId,
  )

  if (!initialFocusLocation) {
    throw new Error(
      `Unknown initial Footprints focus city: ${initialFootprintsView.focusCityId}`,
    )
  }

  const initialFocusDirection = geoToVector3(
    initialFocusLocation.latitude,
    initialFocusLocation.longitude,
  ).normalize()
  const introDurationSeconds =
    footprintsRouteLayer.timeline.total / 1000
  const introRotationDistance = reducedMotion
    ? 0
    : defaultRotationSpeed * introDurationSeconds

  const updateIntroOrientation = (elapsedSeconds = 0) => {
    inverseScrollQuaternion.setFromAxisAngle(
      localNorthAxis,
      -scrollRotation * degreesToRadians,
    )
    introTimelineQuaternion.setFromAxisAngle(
      localNorthAxis,
      Math.min(elapsedSeconds, introDurationSeconds) *
        defaultRotationSpeed,
    )
    orientationGroup.quaternion
      .copy(inverseScrollQuaternion)
      .multiply(introStartQuaternion)
      .multiply(introTimelineQuaternion)
      .normalize()
  }

  const applyInitialOrientation = () => {
    initialAlignmentQuaternion.setFromUnitVectors(
      initialFocusDirection,
      cameraFacingDirection,
    )
    initialOffsetQuaternion.setFromEuler(initialOffsetEuler)
    introTargetQuaternion
      .copy(initialOffsetQuaternion)
      .multiply(initialAlignmentQuaternion)
      .normalize()
    introTimelineQuaternion.setFromAxisAngle(
      localNorthAxis,
      -introRotationDistance,
    )
    introStartQuaternion
      .copy(introTargetQuaternion)
      .multiply(introTimelineQuaternion)
      .normalize()
    updateIntroOrientation(0)
    scrollOrientationQuaternion.setFromAxisAngle(
      localNorthAxis,
      scrollRotation * degreesToRadians,
    )
    initialWorldFocusDirection
      .copy(initialFocusDirection)
      .applyQuaternion(orientationGroup.quaternion)
      .applyQuaternion(scrollOrientationQuaternion)
    mount.dataset.initialFocusVector = [
      initialWorldFocusDirection.x,
      initialWorldFocusDirection.y,
      initialWorldFocusDirection.z,
    ]
      .map((value) => value.toFixed(4))
      .join(',')
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld()
    mount.dataset.initialQuaternion = [
      orientationGroup.quaternion.x,
      orientationGroup.quaternion.y,
      orientationGroup.quaternion.z,
      orientationGroup.quaternion.w,
    ]
      .map((value) => value.toFixed(6))
      .join(',')
    mount.dataset.introStartQuaternion = [
      introStartQuaternion.x,
      introStartQuaternion.y,
      introStartQuaternion.z,
      introStartQuaternion.w,
    ]
      .map((value) => value.toFixed(6))
      .join(',')
    mount.dataset.introTargetQuaternion = [
      introTargetQuaternion.x,
      introTargetQuaternion.y,
      introTargetQuaternion.z,
      introTargetQuaternion.w,
    ]
      .map((value) => value.toFixed(6))
      .join(',')
    pendingExploreYaw = 0
    pendingExplorePitch = 0
    isDragging = false
    idleRotationResumeBlend = 1
  }

  applyInitialOrientation()
  mount.dataset.initialFocusCity = initialFootprintsView.focusCityId
  mount.dataset.initialViewYaw = String(
    initialFootprintsView.offsetDegrees.yaw,
  )
  mount.dataset.initialViewPitch = String(
    initialFootprintsView.offsetDegrees.pitch,
  )
  mount.dataset.initialOrientationReady = 'true'
  mount.dataset.introAngularSpeed = String(defaultRotationSpeed)
  mount.dataset.introDuration = String(
    footprintsRouteLayer.timeline.total,
  )
  mount.dataset.introRotationDistance = String(
    introRotationDistance,
  )

  const entityIdentity = (entity) =>
    entity ? `${entity.kind}:${entity.id}` : ''

  const setSelectedEntity = (entity) => {
    if (entityIdentity(entity) === entityIdentity(selectedEntity)) return
    selectedEntity = entity
    footprintsRouteLayer.setSelectedEntity(entity)
    if (entity) {
      mount.dataset.selectedEntity = entityIdentity(entity)
      if (entity.kind === 'destination') {
        mount.dataset.selectedRoute = entity.routeIds.join(',')
        mount.dataset.selectedRouteCount = String(entity.routeIds.length)
      } else {
        delete mount.dataset.selectedRoute
        delete mount.dataset.selectedRouteCount
      }
    } else {
      delete mount.dataset.selectedEntity
      delete mount.dataset.selectedRoute
      delete mount.dataset.selectedRouteCount
    }
    footprintsLabelLayer.setSelectedEntity(entity)
    onSelectionChange?.(entity)
  }

  footprintsLabelLayer = createFootprintsLabelLayer({
    anchors: footprintsRouteLayer.labelAnchors,
    locations: labelLocations.map((location) => ({
      ...location,
      routeGroups:
        location.kind === 'destination'
          ? getSecondaryRoutesForDestination(location.id).map(
              (route) => ({
                ...route,
                baseName:
                  footprintBaseLocationsById.get(route.baseId)
                    ?.displayName ?? route.baseId,
              }),
            )
          : [],
    })),
    mount,
    onActivate: setSelectedEntity,
  })
  pendingLabelUnlocks.forEach((location) => {
    footprintsLabelLayer.unlock(location)
  })

  const updateLabelPositions = () => {
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld()
    footprintsLabelLayer.update({
      camera,
      earthObject: globe,
      height,
      width,
    })
  }

  const getSelectableEntityAt = (x, y) => {
    if (isDragging || width <= 1 || height <= 1) return null
    pointerNdc.set(
      (x / width) * 2 - 1,
      -(y / height) * 2 + 1,
    )
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld()
    raycaster.setFromCamera(pointerNdc, camera)

    const earthIntersection =
      raycaster.intersectObject(globe, false)[0]
    const intersections = raycaster
      .intersectObjects(footprintsRouteLayer.interactables, false)
      .filter((intersection) => {
        if (!intersection.object.visible) return false
        if (!intersection.object.parent?.visible) return false
        const entity =
          intersection.object.userData.footprintsEntity
        if (
          entity?.kind !== 'destination' &&
          entity?.kind !== 'base'
        ) {
          return false
        }
        return (
          !earthIntersection ||
          intersection.distance <= earthIntersection.distance + 0.018
        )
      })
      .sort((first, second) => {
        const priorityDifference =
          (second.object.userData.footprintsEntity?.priority ?? 0) -
          (first.object.userData.footprintsEntity?.priority ?? 0)
        return priorityDifference || first.distance - second.distance
      })

    return intersections[0]?.object.userData.footprintsEntity ?? null
  }

  const selectAt = (x, y) => {
    const entity = getSelectableEntityAt(x, y)
    setSelectedEntity(entity)
    return entity
  }

  const clearSelection = () => setSelectedEntity(null)

  const requestFrame = () => {
    if (frameId === null && isVisible && isPageVisible) {
      lastFrameTime = performance.now()
      frameId = window.requestAnimationFrame(renderFrame)
    }
  }

  function renderFrame(time) {
    frameId = null
    if (!isVisible || !isPageVisible) return

    const delta = Math.min((time - lastFrameTime) / 1000, 0.05)
    lastFrameTime = time

    scrollGroup.rotation.y = scrollRotation * degreesToRadians

    const hasPendingExploreRotation =
      Math.abs(pendingExploreYaw) > exploreDragSettleThreshold ||
      Math.abs(pendingExplorePitch) > exploreDragSettleThreshold
    const wasIntroLocked = introLocked
    const introElapsedMilliseconds =
      footprintsRouteLayer.update(delta)

    if (wasIntroLocked && !reducedMotion) {
      updateIntroOrientation(introElapsedMilliseconds / 1000)
    } else if (!introLocked && (isDragging || hasPendingExploreRotation)) {
      const dragAlpha = reducedMotion
        ? 1
        : 1 - Math.exp(-exploreDragDampingRate * delta)
      const yawStep = pendingExploreYaw * dragAlpha
      const pitchStep = pendingExplorePitch * dragAlpha

      if (Math.abs(yawStep) > 0.000001) {
        keyboardQuaternion.setFromAxisAngle(
          localNorthAxis,
          yawStep,
        )
        orientationGroup.quaternion
          .multiply(keyboardQuaternion)
          .normalize()
        pendingExploreYaw -= yawStep
      }

      transformedNorthAxis
        .copy(localNorthAxis)
        .applyQuaternion(orientationGroup.quaternion)
      const currentPitch = Math.asin(
        THREE.MathUtils.clamp(transformedNorthAxis.z, -1, 1),
      )
      const clampedPitch = THREE.MathUtils.clamp(
        currentPitch + pitchStep,
        -explorePitchLimit,
        explorePitchLimit,
      )
      const appliedPitch = clampedPitch - currentPitch

      if (Math.abs(appliedPitch) > 0.000001) {
        keyboardQuaternion.setFromAxisAngle(
          cameraVerticalAxis,
          appliedPitch,
        )
        orientationGroup.quaternion
          .premultiply(keyboardQuaternion)
          .normalize()
      }

      if (Math.abs(appliedPitch - pitchStep) > 0.000001) {
        pendingExplorePitch = 0
      } else {
        pendingExplorePitch -= pitchStep
      }

      if (!isDragging) {
        if (
          Math.abs(pendingExploreYaw) <=
          exploreDragSettleThreshold
        ) {
          pendingExploreYaw = 0
        }
        if (
          Math.abs(pendingExplorePitch) <=
          exploreDragSettleThreshold
        ) {
          pendingExplorePitch = 0
        }
      }
    } else if (!reducedMotion) {
      const rotationSpeedAlpha =
        1 - Math.exp(-rotationSpeedBlendRate * delta)
      rotationSpeedCurrent +=
        (rotationSpeedTarget - rotationSpeedCurrent) *
        rotationSpeedAlpha
      automaticQuaternion.setFromAxisAngle(
        localNorthAxis,
        rotationSpeedCurrent *
          idleRotationResumeBlend *
          delta,
      )
      orientationGroup.quaternion
        .multiply(automaticQuaternion)
        .normalize()

      if (idleRotationResumeBlend < 0.9999) {
        idleRotationResumeBlend +=
          (1 - idleRotationResumeBlend) *
          (1 - Math.exp(-idleRotationResumeRate * delta))
      }
    }

    const zoomAlpha = reducedMotion
      ? 1
      : 1 - Math.exp(-zoomDamping * delta)
    zoomCurrent += (zoomTarget - zoomCurrent) * zoomAlpha
    camera.position.z = baseCameraDistance / zoomCurrent
    const exploreProgress = THREE.MathUtils.clamp(
      (zoomCurrent - defaultZoom) /
        Math.max(0.0001, maximumZoom - defaultZoom),
      0,
      1,
    )
    scrollGroup.position.x =
      footprintsExploreFraming.enlargedOffset.x * exploreProgress
    scrollGroup.position.y =
      footprintsExploreFraming.enlargedOffset.y * exploreProgress

    updateLabelPositions()
    renderer.render(scene, camera)
    frameId = window.requestAnimationFrame(renderFrame)
  }

  const setSize = (nextWidth, nextHeight) => {
    width = Math.max(1, nextWidth)
    height = Math.max(1, nextHeight)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)

    const safeMargin = Math.max(
      footprintsExploreFraming.edgePadding,
      Math.min(width, height) * 0.025,
    )
    const safeVerticalRadiusNdc = Math.max(
      0.1,
      (height - safeMargin * 2) / height,
    )
    const safeHorizontalRadiusNdc = Math.max(
      0.1,
      (width - safeMargin * 2) / height,
    )
    const halfFieldOfView = (camera.fov * degreesToRadians) / 2
    const projectionScale = Math.tan(halfFieldOfView)
    const safeVerticalCameraDistance =
      footprintsExploreFraming.atmosphereVisualRadius *
      Math.sqrt(
        1 +
          1 /
            (
              safeVerticalRadiusNdc *
              projectionScale
            ) ** 2,
      )
    const safeHorizontalCameraDistance =
      footprintsExploreFraming.routeVisualRadius *
      Math.sqrt(
        1 +
          1 /
            (
              safeHorizontalRadiusNdc *
              projectionScale
            ) ** 2,
      )
    const safeCameraDistance = Math.max(
      safeVerticalCameraDistance,
      safeHorizontalCameraDistance,
    )
    maximumZoom = Math.min(
      desiredMaximumZoom,
      baseCameraDistance / safeCameraDistance,
    )

    if (isExploreMode) {
      zoomTarget = maximumZoom
      if (introLocked) {
        zoomCurrent = zoomTarget
        camera.position.z = baseCameraDistance / zoomCurrent
      }
    }
    return maximumZoom
  }

  const setVisible = (nextVisible) => {
    isVisible = nextVisible
    if (!isVisible && frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }
    requestFrame()
  }

  const setScrollRotation = (degrees) => {
    const nextScrollRotation = reducedMotion ? 0 : degrees
    if (!hasEnteredFootprints) {
      scrollRotation = nextScrollRotation
      applyInitialOrientation()
      return
    }

    scrollRotation = nextScrollRotation
  }

  const prepareFootprintsEntry = () => {
    hasEnteredFootprints = false
    clearSelection()
    setIntroLocked(true)
    rotationSpeedCurrent = defaultRotationSpeed
    rotationSpeedTarget = defaultRotationSpeed
    applyInitialOrientation()
    footprintsRouteLayer.prepare()
  }

  const enterFootprints = ({
    entryId,
    reason = 'external-section',
  } = {}) => {
    setIntroLocked(true)
    rotationSpeedCurrent = defaultRotationSpeed
    rotationSpeedTarget = defaultRotationSpeed
    applyInitialOrientation()
    hasEnteredFootprints = true
    mount.dataset.footprintsEntryId = String(entryId ?? '')
    mount.dataset.footprintsEntryReason = reason
    footprintsRouteLayer.start({ entryId })
    requestFrame()
  }

  const beginDrag = (x, y) => {
    if (introLocked || !isExploreMode) return
    isDragging = true
    dragLastX = x
    dragLastY = y
  }

  const dragTo = (x, y, sensitivity = 1) => {
    if (introLocked || !isDragging || !isExploreMode) return

    const horizontalDelta = x - dragLastX
    const verticalDelta = y - dragLastY
    const horizontalAngle = screenDeltaToDirectRotation(
      horizontalDelta,
      width,
      exploreHorizontalSensitivityMultiplier,
      sensitivity,
    )
    // Positive pitch brings northern latitudes toward the camera.
    // Screen Y grows downward, so dragging down must reduce the view
    // latitude and bring the southern hemisphere toward the center.
    const verticalAngle = -screenDeltaToDirectRotation(
      verticalDelta,
      height,
      exploreVerticalSensitivityMultiplier,
      sensitivity,
    )

    pendingExploreYaw += horizontalAngle
    pendingExplorePitch += verticalAngle

    dragLastX = x
    dragLastY = y
  }

  const endDrag = () => {
    if (!isDragging) return
    isDragging = false
    idleRotationResumeBlend = reducedMotion ? 1 : 0
  }

  const setZoomPreset = (preset) => {
    if (preset === 'maximum') {
      if (introLocked) return isExploreMode ? 'maximum' : 'default'
      isExploreMode = true
      rotationSpeedTarget = exploreRotationSpeed
      zoomTarget = maximumZoom
      return 'maximum'
    }

    isDragging = false
    isExploreMode = false
    rotationSpeedTarget = defaultRotationSpeed
    zoomTarget = defaultZoom
    if (introLocked) {
      zoomCurrent = zoomTarget
      camera.position.z = baseCameraDistance / zoomCurrent
    }
    return 'default'
  }

  const toggleZoomPreset = () => {
    if (introLocked) return isExploreMode ? 'maximum' : 'default'
    const midpoint = (defaultZoom + maximumZoom) / 2
    return setZoomPreset(
      zoomTarget >= midpoint ? 'default' : 'maximum',
    )
  }

  const rotateByKeyboard = (axis, angle) => {
    if (introLocked || !isExploreMode) return
    const rotationAxis =
      axis === 'vertical' ? cameraVerticalAxis : localNorthAxis
    keyboardQuaternion.setFromAxisAngle(rotationAxis, angle)
    if (axis === 'vertical') {
      transformedNorthAxis
        .copy(localNorthAxis)
        .applyQuaternion(orientationGroup.quaternion)
      const currentPitch = Math.asin(
        THREE.MathUtils.clamp(transformedNorthAxis.z, -1, 1),
      )
      const clampedPitch = THREE.MathUtils.clamp(
        currentPitch + angle,
        -explorePitchLimit,
        explorePitchLimit,
      )
      keyboardQuaternion.setFromAxisAngle(
        cameraVerticalAxis,
        clampedPitch - currentPitch,
      )
      orientationGroup.quaternion
        .premultiply(keyboardQuaternion)
        .normalize()
    } else {
      orientationGroup.quaternion
        .multiply(keyboardQuaternion)
        .normalize()
    }
  }

  const handleVisibilityChange = () => {
    isPageVisible = !document.hidden
    if (!isPageVisible && frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }
    requestFrame()
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const dispose = () => {
    if (frameId !== null) window.cancelAnimationFrame(frameId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    sphereGeometry.dispose()
    globeMaterial.dispose()
    atmosphereMaterial.dispose()
    footprintsLabelLayer?.dispose()
    footprintsRouteLayer.dispose()
    dayTexture.dispose()
    nightTexture.dispose()
    surfaceTexture.dispose()
    renderer.dispose()
    renderer.domElement.remove()
  }

  return {
    backend: renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2',
    beginDrag,
    clearSelection,
    dispose,
    dragTo,
    endDrag,
    enterFootprints,
    isIntroLocked: () => introLocked,
    prepareFootprintsEntry,
    rotateByKeyboard,
    selectAt,
    setScrollRotation,
    setSize,
    setVisible,
    setZoomPreset,
    secondaryRouteSummary:
      footprintsRouteLayer.secondaryRouteSummary,
    textureQuality,
    toggleZoomPreset,
    routeAnimationTiming: footprintsRouteLayer.timeline,
    interactionTiming: {
      dragReleaseRotationBlend: reducedMotion
        ? 0
        : Math.log(10) / idleRotationResumeRate,
      rotationSpeedBlend: reducedMotion
        ? 0
        : rotationSpeedBlendDuration,
    },
    introTiming: {
      angularSpeed: defaultRotationSpeed,
      duration: footprintsRouteLayer.timeline.total,
      rotationDistance: introRotationDistance,
    },
    rotationSpeeds: {
      default: defaultRotationSpeed,
      enlarged: exploreRotationSpeed,
    },
    exploreControls: {
      dampingRate: exploreDragDampingRate,
      horizontalSensitivity:
        exploreHorizontalSensitivityMultiplier,
      pitchLimitDegrees: explorePitchLimit / degreesToRadians,
      verticalSensitivity: exploreVerticalSensitivityMultiplier,
    },
    framing: {
      desktopDefaultOffsetVw: 8,
      desktopMaximumOffsetVw: 8,
      narrowDesktopDefaultOffsetVw: 4,
      narrowDesktopMaximumOffsetVw: 4,
    },
    zoomLimits: {
      default: defaultZoom,
      get maximum() {
        return maximumZoom
      },
      minimum: minimumZoom,
    },
  }
}

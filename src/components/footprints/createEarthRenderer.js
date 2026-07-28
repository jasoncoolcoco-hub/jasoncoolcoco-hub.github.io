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
import { createFootprintsRouteLayer } from './createFootprintsRouteLayer'

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

  const earthVisualGroup = new THREE.Group()
  const footprintsRouteLayer = createFootprintsRouteLayer()
  earthVisualGroup.add(
    globe,
    atmosphere,
    footprintsRouteLayer.group,
  )

  const orientationGroup = new THREE.Group()
  orientationGroup.rotation.order = 'YXZ'
  orientationGroup.rotation.set(-0.06, 2.75, -0.08)
  orientationGroup.add(earthVisualGroup)

  const scrollGroup = new THREE.Group()
  scrollGroup.add(orientationGroup)
  scene.add(scrollGroup)

  mount.appendChild(renderer.domElement)

  let width = 1
  let height = 1
  let frameId = null
  let lastFrameTime = performance.now()
  let isVisible = false
  let isPageVisible = !document.hidden
  let isDragging = false
  let dragLastX = 0
  let dragLastY = 0
  let pendingExploreYaw = 0
  let pendingExplorePitch = 0
  let isExploreMode = false
  let scrollRotation = 0
  let zoomCurrent = defaultZoom
  let zoomTarget = defaultZoom
  let idleRotationResumeBlend = 1
  let rotationSpeedCurrent = defaultRotationSpeed
  let rotationSpeedTarget = defaultRotationSpeed

  const automaticQuaternion = new THREE.Quaternion()
  const keyboardQuaternion = new THREE.Quaternion()
  const transformedNorthAxis = new THREE.Vector3()

  const requestFrame = () => {
    if (
      frameId === null &&
      isVisible &&
      isPageVisible
    ) {
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

    const rotationSpeedAlpha = reducedMotion
      ? 1
      : 1 - Math.exp(-rotationSpeedBlendRate * delta)
    rotationSpeedCurrent +=
      (rotationSpeedTarget - rotationSpeedCurrent) *
      rotationSpeedAlpha

    const hasPendingExploreRotation =
      Math.abs(pendingExploreYaw) > exploreDragSettleThreshold ||
      Math.abs(pendingExplorePitch) > exploreDragSettleThreshold

    if (isDragging || hasPendingExploreRotation) {
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
      automaticQuaternion.setFromAxisAngle(
        localNorthAxis,
        rotationSpeedCurrent * idleRotationResumeBlend * delta,
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
      4,
      Math.min(width, height) * 0.005,
    )
    const safeDiameter = Math.max(
      1,
      Math.min(width, height) - safeMargin * 2,
    )
    const safeRadiusNdc = safeDiameter / height
    const halfFieldOfView = (camera.fov * degreesToRadians) / 2
    const safeCameraDistance = Math.sqrt(
      1 +
        1 /
          (
            safeRadiusNdc *
            Math.tan(halfFieldOfView)
          ) ** 2,
    )
    maximumZoom = Math.min(
      desiredMaximumZoom,
      baseCameraDistance / safeCameraDistance,
    )

    if (isExploreMode) zoomTarget = maximumZoom
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
    scrollRotation = reducedMotion ? 0 : degrees
  }

  const beginDrag = (x, y) => {
    if (!isExploreMode) return
    isDragging = true
    dragLastX = x
    dragLastY = y
  }

  const dragTo = (x, y, sensitivity = 1) => {
    if (!isDragging || !isExploreMode) return

    const horizontalDelta = x - dragLastX
    const verticalDelta = y - dragLastY
    const horizontalAngle =
      (horizontalDelta / Math.max(1, width)) *
      exploreDragSensitivity *
      exploreHorizontalSensitivityMultiplier *
      sensitivity

    const verticalAngle =
      (verticalDelta / Math.max(1, height)) *
      exploreDragSensitivity *
      exploreVerticalSensitivityMultiplier *
      sensitivity

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
      isExploreMode = true
      rotationSpeedTarget = exploreRotationSpeed
      zoomTarget = maximumZoom
      return 'maximum'
    }

    isDragging = false
    isExploreMode = false
    rotationSpeedTarget = defaultRotationSpeed
    zoomTarget = defaultZoom
    return 'default'
  }

  const toggleZoomPreset = () => {
    const midpoint = (defaultZoom + maximumZoom) / 2
    return setZoomPreset(
      zoomTarget >= midpoint ? 'default' : 'maximum',
    )
  }

  const rotateByKeyboard = (axis, angle) => {
    if (!isExploreMode) return
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
    dispose,
    dragTo,
    endDrag,
    rotateByKeyboard,
    setScrollRotation,
    setSize,
    setVisible,
    setZoomPreset,
    textureQuality,
    toggleZoomPreset,
    interactionTiming: {
      dragReleaseRotationBlend: reducedMotion
        ? 0
        : Math.log(10) / idleRotationResumeRate,
      rotationSpeedBlend: reducedMotion
        ? 0
        : rotationSpeedBlendDuration,
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

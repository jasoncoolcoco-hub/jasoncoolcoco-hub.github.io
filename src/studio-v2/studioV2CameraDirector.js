import * as THREE from 'three'
import {
  getStudioV2CanonicalCameraPose,
  STUDIO_V2_ACCEPTED_OPENING_POSE,
  STUDIO_V2_CAMERA_BASELINE,
  STUDIO_V2_CAMERA_POSES,
  STUDIO_V2_CAMERA_STATES,
  STUDIO_V2_PHOTO_WALL_FOCUS_POSE,
  STUDIO_V2_ROOM_WIDE_START_POSE,
  STUDIO_V2_TABLE_OVERVIEW_POSE,
  studioV2CameraPose,
} from './studioV2CameraPoses'
import { createStudioV2CameraVolumeSafety } from './studioV2CameraSafetyVolume'
import {
  createStudioV2AmbientCameraRail,
  STUDIO_V2_AMBIENT_CAMERA_CONFIG,
  STUDIO_V2_ROOM_WIDE_MANUAL_PROFILE,
  STUDIO_V2_TABLE_ORBIT_PROFILE,
} from './studioV2AmbientCamera'

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2
}

function smootherStep(value) {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function roundedVector(vector, digits = 4) {
  return vector.toArray().map((value) => Number(value.toFixed(digits)))
}

function rounded(value, digits = 4) {
  return Number(value.toFixed(digits))
}

function poseFromCamera(camera, controls) {
  return {
    position: camera.position.toArray(),
    target: controls.target.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
  }
}

function travelProgress(elapsedMs) {
  const duration = STUDIO_V2_AMBIENT_CAMERA_CONFIG.durationMs
  const time = THREE.MathUtils.clamp(elapsedMs / duration, 0, 1)
  const start = STUDIO_V2_AMBIENT_CAMERA_CONFIG.startEaseMs / duration
  const end = STUDIO_V2_AMBIENT_CAMERA_CONFIG.endEaseMs / duration
  const initial = STUDIO_V2_AMBIENT_CAMERA_CONFIG.initialSpeedFactor
  const startDistance = start * (initial + (1 - initial) / 2)
  const normaliser = startDistance + (1 - end - start) + end / 2
  let distance
  if (time < start) {
    distance = initial * time + ((1 - initial) * time * time) / (2 * start)
  } else if (time <= 1 - end) {
    distance = startDistance + (time - start)
  } else {
    const tail = time - (1 - end)
    distance = startDistance + (1 - end - start) + tail - (tail * tail) / (2 * end)
  }
  return THREE.MathUtils.clamp(distance / normaliser, 0, 1)
}

function elapsedForTravelProgress(progress) {
  const target = THREE.MathUtils.clamp(progress, 0, 1)
  let low = 0
  let high = STUDIO_V2_AMBIENT_CAMERA_CONFIG.durationMs
  for (let index = 0; index < 32; index += 1) {
    const middle = (low + high) / 2
    if (travelProgress(middle) < target) low = middle
    else high = middle
  }
  return (low + high) / 2
}

export function createStudioV2CameraDirector({
  camera,
  cameraSafety,
  controls,
  debug = false,
  domElement,
  ambientPathCandidate = 'B',
  initialPose = STUDIO_V2_ACCEPTED_OPENING_POSE,
  isInteractivePointer = () => false,
  prepareOrbitLimits = () => {},
  readRearBoundary = () => {},
  responsiveFov = (fov) => fov,
  resolveLegacyCandidate = () => false,
  scene,
}) {
  const volumeSafety = createStudioV2CameraVolumeSafety({ scene, debug })
  const ambientRail = createStudioV2AmbientCameraRail({
    candidate: ambientPathCandidate,
    debug,
    inspectPose: volumeSafety.inspect,
    scene,
  })
  const transitionFromPosition = new THREE.Vector3()
  const transitionFromTarget = new THREE.Vector3()
  const transitionToPosition = new THREE.Vector3()
  const transitionToTarget = new THREE.Vector3()
  const transitionLookDirection = new THREE.Vector3()
  const transitionQuaternion = new THREE.Quaternion()
  const resolvedPosition = new THREE.Vector3()
  const resolvedTarget = new THREE.Vector3()
  const baseRailPosition = new THREE.Vector3()
  const baseRailTarget = new THREE.Vector3()
  const headLookDirection = new THREE.Vector3()
  const headLookTarget = new THREE.Vector3()
  const headLookSpherical = new THREE.Spherical()
  const debugOrbitOffset = new THREE.Vector3()
  const pauseReasons = new Set()
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let state = initialPose.state ?? STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
  let transition = null
  let inputOwner = 'NONE'
  let inputType = 'NONE'
  let orbitRequested = false
  let disposed = false
  let viewportWidth = domElement?.clientWidth ?? 1280
  let activeBaseFov = initialPose.fov
  let lastCancellation = 'NONE'
  let safetyClampActive = false
  let updateCount = 0
  let lastUpdateTime = null
  let experienceStarted = false
  let startDelayRemainingMs = STUDIO_V2_AMBIENT_CAMERA_CONFIG.startDelayMs
  let driftElapsedMs = 0
  let railProgress = 0
  let observationElapsedMs = 0
  let observationYaw = 0
  let observationPitch = 0
  let frozenProgress = null
  let currentPathDistance = 0
  let baseRailFov = STUDIO_V2_ROOM_WIDE_START_POSE.fov
  let speedMultiplier = 1
  let debugScrubFrozen = false
  let yawOffset = 0
  let pitchOffset = 0
  let pointerCandidate = null
  let overrideIdleDeadline = null
  let returnTransition = null
  let resumeNotBefore = 0
  let reducedMotionOverride = 'AUTO'
  let endpointPhase = 'NONE'
  let macbookFocusSolver = null
  let macbookFocusSourcePose = null
  let macbookFocusLastExit = 'NONE'
  let macbookFocusCorridor = null
  let photoWallFocusPose = STUDIO_V2_PHOTO_WALL_FOCUS_POSE
  let photoWallFocusSourcePose = null
  let photoWallFocusLastExit = 'NONE'
  let railConsumedBy = 'NONE'
  let tableSkipAudit = null
  let finalDriftFramePending = false
  let tableArrivalPending = false
  let railCompleted = false
  let driftWallStartedAt = null
  let driftWallCompletedAt = null
  let driftPausedFrameMs = 0
  let entryStartedAt = null
  let firstCameraMotionAt = null
  let stoolPlaneCrossedAt = null
  let stoolPlaneCrossingElapsedMs = null
  let finalSettleStartedAt = null
  let finalSettleElapsedMs = null
  const firstMotionSamples = {}
  const endpointSnapshots = {}
  let visibilityPauseState = document.hidden ? 'HIDDEN' : 'VISIBLE'

  function captureEndpointSnapshot(label, time = performance.now()) {
    const snapshot = {
      label,
      state,
      time: rounded(time, 3),
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
      radius: camera.position.distanceTo(controls.target),
      projectionMatrix: camera.projectionMatrix.toArray(),
    }
    endpointSnapshots[label] = snapshot
    return snapshot
  }

  function endpointDifference(from, to) {
    if (!from || !to) return null
    const maximumDifference = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])))
    const quaternionDot = Math.abs(from.quaternion.reduce(
      (sum, value, index) => sum + value * to.quaternion[index],
      0,
    ))
    return {
      position: maximumDifference(from.position, to.position),
      target: maximumDifference(from.target, to.target),
      quaternionAngularRadians: 2 * Math.acos(THREE.MathUtils.clamp(quaternionDot, -1, 1)),
      fov: Math.abs(from.fov - to.fov),
      radius: Math.abs(from.radius - to.radius),
      projectionMatrix: maximumDifference(from.projectionMatrix, to.projectionMatrix),
    }
  }

  function clearEndpointAudit() {
    Object.keys(endpointSnapshots).forEach((key) => delete endpointSnapshots[key])
    endpointPhase = 'NONE'
    finalDriftFramePending = false
    tableArrivalPending = false
  }

  function effectiveReducedMotion() {
    if (reducedMotionOverride === 'REDUCE') return true
    if (reducedMotionOverride === 'ALLOW') return false
    return reducedMotionQuery.matches
  }

  function clearOrbitMomentum() {
    controls._sphericalDelta?.set(0, 0, 0)
    controls._panOffset?.set(0, 0, 0)
    controls._dollyDirection?.set(0, 0, 0)
    controls._scale = 1
    controls._performCursorZoom = false
  }

  function updateControlsWithoutMomentum() {
    clearOrbitMomentum()
    if (!controls.enabled) {
      camera.lookAt(controls.target)
      return
    }
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
  }

  function applyControlsProfile(profile) {
    controls.enablePan = profile.enablePan
    controls.enableZoom = profile.enableZoom
    controls.enableRotate = true
    controls.minDistance = profile.minDistance
    controls.maxDistance = profile.maxDistance
    controls.minPolarAngle = profile.minPolarAngle
    controls.maxPolarAngle = profile.maxPolarAngle
    controls.minAzimuthAngle = profile.minAzimuthAngle
    controls.maxAzimuthAngle = profile.maxAzimuthAngle
    controls.rotateSpeed = profile.rotateSpeed
    controls.zoomSpeed = profile.zoomSpeed
    controls.dampingFactor = profile.dampingFactor
  }

  function currentManualProfile() {
    if (state === STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT) return STUDIO_V2_TABLE_ORBIT_PROFILE
    if (state === STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START && effectiveReducedMotion()) {
      return STUDIO_V2_ROOM_WIDE_MANUAL_PROFILE
    }
    return null
  }

  function updateOrbitAvailability() {
    const manualProfile = currentManualProfile()
    const roomOrbit = state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
    controls.enabled = Boolean(orbitRequested && !transition && (roomOrbit || manualProfile))
    if (!controls.enabled) clearOrbitMomentum()
    return controls.enabled
  }

  function consumeAmbientRail(source) {
    if (railCompleted) return false
    railCompleted = true
    railConsumedBy = source
    finalDriftFramePending = false
    tableArrivalPending = false
    frozenProgress = null
    returnTransition = null
    overrideIdleDeadline = null
    pointerCandidate = null
    debugScrubFrozen = false
    return true
  }

  function applyResolvedPose(pose, { legacy = pose.state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT } = {}) {
    const candidate = legacy
      ? cameraSafety.clampConfig({
        ...pose,
        position: [...pose.position],
        target: [...pose.target],
      })
      : pose
    const volumeResult = volumeSafety.resolve(
      resolvedPosition.fromArray(candidate.position),
      resolvedTarget.fromArray(candidate.target),
    )
    camera.position.copy(volumeResult.position)
    controls.target.copy(volumeResult.target)
    activeBaseFov = Number.isFinite(pose.fov) ? pose.fov : activeBaseFov
    camera.fov = responsiveFov(activeBaseFov, viewportWidth)
    camera.near = pose.near ?? camera.near
    camera.far = pose.far ?? camera.far
    camera.updateProjectionMatrix()
    updateControlsWithoutMomentum()
    camera.updateMatrixWorld(true)
    if (legacy) resolveLegacyCandidate()
    safetyClampActive = volumeResult.corrected
    return getCurrentPose()
  }

  function applyDirectCamera(position, target, fov) {
    const volumeResult = volumeSafety.resolve(position, target)
    camera.position.copy(volumeResult.position)
    controls.target.copy(volumeResult.target)
    activeBaseFov = fov
    camera.fov = responsiveFov(fov, viewportWidth)
    camera.updateProjectionMatrix()
    updateControlsWithoutMomentum()
    camera.updateMatrixWorld(true)
    safetyClampActive = volumeResult.corrected
    return volumeResult
  }

  function applyRailPose(progress) {
    const point = ambientRail.getPoint(progress, ambientRail.scratch)
    baseRailPosition.copy(point.position)
    baseRailTarget.copy(point.target)
    baseRailFov = point.fov
    currentPathDistance = ambientRail.totalDistance * progress
    return applyDirectCamera(baseRailPosition, baseRailTarget, baseRailFov)
  }

  function applyHeadLook() {
    headLookDirection.copy(baseRailTarget).sub(baseRailPosition).normalize()
    headLookSpherical.setFromVector3(headLookDirection)
    headLookSpherical.theta += observationYaw + yawOffset
    headLookSpherical.phi = THREE.MathUtils.clamp(
      headLookSpherical.phi + observationPitch + pitchOffset,
      0.15,
      Math.PI - 0.15,
    )
    headLookDirection.setFromSpherical(headLookSpherical).normalize()
    headLookTarget.copy(baseRailPosition).addScaledVector(
      headLookDirection,
      baseRailPosition.distanceTo(baseRailTarget),
    )
    return applyDirectCamera(baseRailPosition, headLookTarget, baseRailFov)
  }

  function updateIdleObservation(deltaMs) {
    baseRailPosition.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.position)
    baseRailTarget.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.target)
    baseRailFov = STUDIO_V2_ROOM_WIDE_START_POSE.fov
    currentPathDistance = 0
    if (effectiveReducedMotion()) {
      observationYaw = 0
      observationPitch = 0
      return applyHeadLook()
    }
    observationElapsedMs += deltaMs
    const seconds = observationElapsedMs / 1000
    const observation = STUDIO_V2_AMBIENT_CAMERA_CONFIG.observation
    const [yawA, yawB, yawC] = observation.yawPeriodsSeconds
    const [pitchA, pitchB, pitchC] = observation.pitchPeriodsSeconds
    const [driftA, driftB, driftC] = observation.targetDriftPeriodsSeconds
    const entryBlend = 1 - Math.exp(-seconds / observation.entryBlendSeconds)
    const attentionEnvelope = 0.5 + 0.5 * (
      Math.sin((seconds / driftA) * Math.PI * 2 + 4.6) * 0.68
      + Math.sin((seconds / driftC) * Math.PI * 2 + 1.1) * 0.32
    )
    baseRailTarget.x += observation.macbookAttentionMeters * entryBlend * attentionEnvelope
    baseRailTarget.y += observation.targetDriftMeters[0] * entryBlend * (
      Math.sin((seconds / driftB) * Math.PI * 2 + 2.4) * 0.7
      + Math.sin((seconds / driftC) * Math.PI * 2 + 5.2) * 0.3
    )
    baseRailTarget.z += observation.targetDriftMeters[1] * entryBlend * (
      Math.sin((seconds / driftA) * Math.PI * 2 + 0.9) * 0.62
      + Math.sin((seconds / driftC) * Math.PI * 2 + 3.7) * 0.38
    )
    observationYaw = observation.maximumYawRadians * entryBlend * (
      Math.sin((seconds / yawA) * Math.PI * 2 + 0.35) * 0.55
      + Math.sin((seconds / yawB) * Math.PI * 2 + 1.7) * 0.3
      + Math.sin((seconds / yawC) * Math.PI * 2 + 4.1) * 0.15
    )
    observationPitch = observation.maximumPitchRadians * entryBlend * (
      Math.sin((seconds / pitchA) * Math.PI * 2 + 2.2) * 0.58
      + Math.sin((seconds / pitchB) * Math.PI * 2 + 5.0) * 0.27
      + Math.sin((seconds / pitchC) * Math.PI * 2 + 0.8) * 0.15
    )
    return applyHeadLook()
  }

  function cancelTransition(reason = 'CANCELLED') {
    if (!transition) return false
    transition = null
    lastCancellation = reason
    clearOrbitMomentum()
    updateOrbitAvailability()
    return true
  }

  function cancelReturn() {
    if (!returnTransition) return false
    returnTransition = null
    overrideIdleDeadline = null
    return true
  }

  function beginUserInput(nextInputType = 'POINTER') {
    inputOwner = 'USER'
    inputType = nextInputType
    cancelTransition(`USER_INPUT:${nextInputType}`)
  }

  function endUserInput(nextInputType = inputType) {
    if (inputOwner === 'USER' && (nextInputType === inputType || nextInputType === 'ANY')) {
      inputOwner = 'NONE'
      inputType = 'NONE'
    }
  }

  function ambientInputAvailable() {
    return state === STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION
      || state === STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT
      || state === STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return
    if (ambientInputAvailable() && !isInteractivePointer(event)) {
      cancelReturn()
      pointerCandidate = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        yaw: yawOffset,
        pitch: pitchOffset,
        active: false,
      }
      return
    }
    if (!ambientInputAvailable()) beginUserInput(event.pointerType?.toUpperCase() || 'POINTER')
  }

  function handlePointerMove(event) {
    if (!pointerCandidate || pointerCandidate.id !== event.pointerId) return
    const dx = event.clientX - pointerCandidate.x
    const dy = event.clientY - pointerCandidate.y
    if (!pointerCandidate.active && Math.hypot(dx, dy) < STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideDragThresholdPx) return
    if (!pointerCandidate.active) {
      pointerCandidate.active = true
      frozenProgress = railProgress
      state = STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE
      inputOwner = 'USER_HEAD_LOOK'
      inputType = event.pointerType?.toUpperCase() || 'POINTER'
      overrideIdleDeadline = null
    }
    yawOffset = THREE.MathUtils.clamp(
      pointerCandidate.yaw - dx * STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideRadiansPerPixel,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMax,
    )
    pitchOffset = THREE.MathUtils.clamp(
      pointerCandidate.pitch + dy * STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideRadiansPerPixel,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMax,
    )
    event.preventDefault()
  }

  function handlePointerUp(event) {
    if (pointerCandidate?.id === event.pointerId) {
      const active = pointerCandidate.active
      pointerCandidate = null
      if (active) {
        inputOwner = 'CAMERA_DIRECTOR'
        inputType = 'OVERRIDE_IDLE'
        overrideIdleDeadline = performance.now() + STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideIdleMs
      }
      return
    }
    endUserInput('ANY')
  }

  function handleWheel(event) {
    if (ambientInputAvailable()) {
      event.preventDefault()
      return
    }
    beginUserInput('WHEEL')
    queueMicrotask(() => endUserInput('WHEEL'))
  }

  function handleKeyDown(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) return
    if (ambientInputAvailable()) return
    beginUserInput('KEYBOARD')
    queueMicrotask(() => endUserInput('KEYBOARD'))
  }

  function handleVisibilityChange() {
    visibilityPauseState = document.hidden ? 'HIDDEN' : 'VISIBLE'
    setPauseReason('DOCUMENT_HIDDEN', document.hidden, {
      resumeDelayMs: STUDIO_V2_AMBIENT_CAMERA_CONFIG.visibilityResumeDelayMs,
    })
  }

  function handleWindowBlur() {
    visibilityPauseState = 'WINDOW_BLURRED'
    setPauseReason('WINDOW_BLUR', true)
  }

  function handleWindowFocus() {
    visibilityPauseState = document.hidden ? 'HIDDEN' : 'VISIBLE'
    setPauseReason('WINDOW_BLUR', false, {
      resumeDelayMs: STUDIO_V2_AMBIENT_CAMERA_CONFIG.visibilityResumeDelayMs,
    })
  }

  function handleReducedMotionChange() {
    if (reducedMotionOverride !== 'AUTO') return
    if (state === STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION) updateIdleObservation(0)
  }

  if (debug) {
    domElement?.addEventListener('pointerdown', handlePointerDown, true)
    domElement?.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerUp, true)
    domElement?.addEventListener('wheel', handleWheel, { capture: true, passive: false })
    window.addEventListener('keydown', handleKeyDown, true)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('blur', handleWindowBlur)
  window.addEventListener('focus', handleWindowFocus)
  reducedMotionQuery.addEventListener?.('change', handleReducedMotionChange)

  function getCurrentPose() {
    return {
      position: roundedVector(camera.position),
      target: roundedVector(controls.target),
      quaternion: roundedVector(camera.quaternion, 6),
      fov: Number(camera.fov.toFixed(3)),
      baseFov: Number(activeBaseFov.toFixed(3)),
      near: camera.near,
      far: camera.far,
    }
  }

  function setState(nextState, options = {}) {
    if (!Object.values(STUDIO_V2_CAMERA_STATES).includes(nextState)) return false
    state = nextState
    if (options.pose) applyResolvedPose(options.pose, { legacy: nextState === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT })
    updateOrbitAvailability()
    return true
  }

  function transitionTo(poseOrState, options = {}) {
    if (!debug && !options.allowOfficial) return false
    const pose = studioV2CameraPose(poseOrState)
    const legacy = pose.state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
    const safePose = legacy ? cameraSafety.clampConfig(pose) : pose
    transitionFromPosition.copy(camera.position)
    transitionFromTarget.copy(controls.target)
    transitionToPosition.fromArray(safePose.position)
    transitionToTarget.fromArray(safePose.target)
    let orientation = null
    if (options.orientationBlend) {
      const destinationCamera = camera.clone()
      destinationCamera.position.copy(transitionToPosition)
      destinationCamera.lookAt(transitionToTarget)
      destinationCamera.updateMatrixWorld(true)
      orientation = {
        from: camera.quaternion.clone(),
        to: destinationCamera.quaternion.clone(),
        fromLookRadius: transitionFromPosition.distanceTo(transitionFromTarget),
        toLookRadius: transitionToPosition.distanceTo(transitionToTarget),
      }
    }
    transition = {
      id: pose.id ?? String(poseOrState),
      fromFov: camera.fov,
      toFov: options.exactFov
        ? (pose.fov ?? activeBaseFov)
        : responsiveFov(pose.fov ?? activeBaseFov, viewportWidth),
      baseFov: pose.fov ?? activeBaseFov,
      fromNear: camera.near,
      near: pose.near ?? camera.near,
      far: pose.far ?? camera.far,
      duration: Math.max(1, options.duration ?? 900),
      startedAt: performance.now(),
      progress: 0,
      targetState: pose.state ?? state,
      intermediatePosition: options.intermediatePosition
        ? new THREE.Vector3().fromArray(options.intermediatePosition)
        : null,
      easing: options.easing === 'smootherstep' ? 'smootherstep' : 'cubic',
      orientation,
      onComplete: options.onComplete ?? null,
    }
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'TRANSITION'
    controls.enabled = false
    return true
  }

  function updateTransition(time) {
    if (!transition) return false
    const progress = THREE.MathUtils.clamp(
      (time - transition.startedAt) / transition.duration,
      0,
      1,
    )
    transition.progress = progress
    const eased = transition.easing === 'smootherstep'
      ? smootherStep(progress)
      : easeInOutCubic(progress)
    if (transition.intermediatePosition) {
      const inverse = 1 - eased
      camera.position.copy(transitionFromPosition).multiplyScalar(inverse * inverse)
        .addScaledVector(transition.intermediatePosition, 2 * inverse * eased)
        .addScaledVector(transitionToPosition, eased * eased)
    } else {
      camera.position.lerpVectors(transitionFromPosition, transitionToPosition, eased)
    }
    if (transition.orientation) {
      transitionQuaternion.copy(transition.orientation.from)
        .slerp(transition.orientation.to, eased)
      transitionLookDirection.set(0, 0, -1).applyQuaternion(transitionQuaternion).normalize()
      controls.target.copy(camera.position).addScaledVector(
        transitionLookDirection,
        THREE.MathUtils.lerp(
          transition.orientation.fromLookRadius,
          transition.orientation.toLookRadius,
          eased,
        ),
      )
    } else {
      controls.target.lerpVectors(transitionFromTarget, transitionToTarget, eased)
    }
    camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased)
    camera.near = THREE.MathUtils.lerp(transition.fromNear, transition.near, eased)
    camera.far = transition.far
    camera.updateProjectionMatrix()
    updateControlsWithoutMomentum()
    camera.updateMatrixWorld(true)
    if (progress >= 1) {
      const completedTransition = transition
      activeBaseFov = completedTransition.baseFov
      state = completedTransition.targetState
      transition = null
      inputOwner = 'NONE'
      inputType = 'NONE'
      updateOrbitAvailability()
      completedTransition.onComplete?.()
    }
    return true
  }

  function focusReducedMotion(mode) {
    if (mode === 'REDUCE') return true
    if (mode === 'ALLOW') return false
    return reducedMotionQuery.matches
  }

  function focusCorridorAudit(fromPosition, toPosition, target, focusSafety = {}, intermediatePosition = null) {
    const samples = 121
    const ignoredObstacleIds = ['KITCHEN ISLAND / BODY', 'KITCHEN STOOLS / ROW']
    let safe = true
    let minimumBoundaryClearance = Infinity
    let minimumDisplayClearance = Infinity
    let minimumMacbookClearance = Infinity
    let minimumTableClearance = Infinity
    const macbookBounds = focusSafety.macbookBounds
      ? new THREE.Box3(
        new THREE.Vector3().fromArray(focusSafety.macbookBounds.min),
        new THREE.Vector3().fromArray(focusSafety.macbookBounds.max),
      )
      : null
    const failures = []
    for (let index = 0; index < samples; index += 1) {
      const progress = index / (samples - 1)
      const position = intermediatePosition
        ? fromPosition.clone().multiplyScalar((1 - progress) ** 2)
          .addScaledVector(intermediatePosition, 2 * (1 - progress) * progress)
          .addScaledVector(toPosition, progress ** 2)
        : fromPosition.clone().lerp(toPosition, progress)
      const inspection = volumeSafety.inspect(position, target, { ignoredObstacleIds })
      const displayClearance = position.distanceTo(target)
      const macbookClearance = macbookBounds?.distanceToPoint(position) ?? Infinity
      const tableClearance = position.y - (focusSafety.tableY ?? 1.415)
      minimumBoundaryClearance = Math.min(minimumBoundaryClearance, inspection.minimumBoundaryClearance)
      minimumDisplayClearance = Math.min(minimumDisplayClearance, displayClearance)
      minimumMacbookClearance = Math.min(minimumMacbookClearance, macbookClearance)
      minimumTableClearance = Math.min(minimumTableClearance, tableClearance)
      if (!inspection.safe || displayClearance < 0.12 || macbookClearance < 0.02 || tableClearance < 0.12) {
        safe = false
        if (failures.length < 8) failures.push({ progress: rounded(progress, 4), reasons: inspection.reasons })
      }
    }
    return {
      safe,
      samples,
      ignoredObstacleIds,
      minimumBoundaryClearance: rounded(minimumBoundaryClearance),
      minimumDisplayClearance: rounded(minimumDisplayClearance),
      minimumMacbookClearance: rounded(minimumMacbookClearance),
      minimumTableClearance: rounded(minimumTableClearance),
      failures,
      architecture: 'STATE_SPECIFIC_MACBOOK_FOCUS_CORRIDOR',
    }
  }

  function applyFocusPose(pose) {
    camera.position.fromArray(pose.position)
    controls.target.fromArray(pose.target)
    activeBaseFov = pose.fov
    camera.fov = pose.fov
    camera.near = pose.near
    camera.far = pose.far
    camera.updateProjectionMatrix()
    updateControlsWithoutMomentum()
    camera.updateMatrixWorld(true)
    safetyClampActive = false
  }

  function configureMacbookFocus({ solvePose }) {
    macbookFocusSolver = solvePose
    return Boolean(macbookFocusSolver)
  }

  function requestMacbookFocus(pose = macbookFocusSolver?.(), options = {}) {
    const ambientShortcut = [
      STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
      STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION,
      STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
      STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE,
      STUDIO_V2_CAMERA_STATES.TABLE_SKIP_TRANSITION,
    ].includes(state)
    if (!pose || (transition && !ambientShortcut) || ![
      STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
      STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION,
      STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
      STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE,
      STUDIO_V2_CAMERA_STATES.TABLE_SKIP_TRANSITION,
      STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
      STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT,
      STUDIO_V2_CAMERA_STATES.ROOM_ORBIT,
    ].includes(state)) return false
    if (ambientShortcut) {
      if (transition) transition = null
    }
    macbookFocusSourcePose = getCurrentPose()
    const intermediatePosition = options.intermediatePosition
      ? new THREE.Vector3().fromArray(options.intermediatePosition)
      : null
    macbookFocusCorridor = focusCorridorAudit(
      camera.position.clone(),
      new THREE.Vector3().fromArray(pose.position),
      new THREE.Vector3().fromArray(pose.target),
      options.focusSafety,
      intermediatePosition,
    )
    if (!macbookFocusCorridor.safe) {
      const directCorridor = focusCorridorAudit(
        camera.position.clone(),
        new THREE.Vector3().fromArray(pose.position),
        new THREE.Vector3().fromArray(pose.target),
        options.focusSafety,
      )
      if (!directCorridor.safe) return false
      macbookFocusCorridor = directCorridor
      options.intermediatePosition = null
    }
    if (ambientShortcut) consumeAmbientRail('MACBOOK')
    state = STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS_TRANSITION
    endpointPhase = 'MACBOOK_FOCUS_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'MACBOOK_FOCUS_ENTER'
    return transitionTo(pose, {
      allowOfficial: true,
      duration: focusReducedMotion(options.reducedMotionOverride)
        ? 200
        : THREE.MathUtils.clamp(1400 + camera.position.distanceTo(new THREE.Vector3().fromArray(pose.position)) * 95, 1500, 2200),
      easing: 'smootherstep',
      exactFov: true,
      orientationBlend: true,
      intermediatePosition: focusReducedMotion(options.reducedMotionOverride)
        ? null
        : options.intermediatePosition,
      onComplete: () => {
        state = STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS
        endpointPhase = 'MACBOOK_FOCUS'
        inputOwner = 'CAMERA_DIRECTOR'
        inputType = 'MACBOOK_SCREEN_READY'
        controls.enabled = false
      },
    })
  }

  function closeMacbookFocus(options = {}) {
    if (![STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS_TRANSITION,
      STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS,
      STUDIO_V2_CAMERA_STATES.MACBOOK_EXIT_TRANSITION,
    ].includes(state)) return false
    if (state === STUDIO_V2_CAMERA_STATES.MACBOOK_EXIT_TRANSITION) return true
    if (transition) transition = null
    state = STUDIO_V2_CAMERA_STATES.MACBOOK_EXIT_TRANSITION
    endpointPhase = 'MACBOOK_EXIT_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'MACBOOK_FOCUS_EXIT'
    return transitionTo(STUDIO_V2_TABLE_OVERVIEW_POSE, {
      allowOfficial: true,
      duration: focusReducedMotion(options.reducedMotionOverride) ? 200 : 1300,
      onComplete: () => {
        captureEndpointSnapshot('MACBOOK_EXIT_FINAL_TRANSITION')
        endpointPhase = 'TABLE_OVERVIEW'
        captureEndpointSnapshot('MACBOOK_EXIT_TABLE_OVERVIEW')
        enterTableFreeOrbit()
        captureEndpointSnapshot('MACBOOK_EXIT_TABLE_FREE_ORBIT')
        macbookFocusLastExit = options.source ?? 'API'
      },
    })
  }

  function refreshMacbookFocus() {
    if (transition || state !== STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS || !macbookFocusSolver) return false
    applyFocusPose(macbookFocusSolver())
    return true
  }

  function getMacbookFocusState() {
    return {
      state,
      transition: transition?.id ?? null,
      transitionProgress: transition ? rounded(transition.progress, 4) : null,
      inputOwner,
      inputType,
      ownerCount: inputOwner === 'NONE' ? 0 : 1,
      controlsLocked: !controls.enabled,
      screenInteractionEnabled: state === STUDIO_V2_CAMERA_STATES.MACBOOK_FOCUS && !transition,
      sourcePose: macbookFocusSourcePose,
      corridor: macbookFocusCorridor,
      lastExit: macbookFocusLastExit,
      near: camera.near,
      fov: camera.fov,
    }
  }

  function configurePhotoWallFocus({ pose = STUDIO_V2_PHOTO_WALL_FOCUS_POSE } = {}) {
    photoWallFocusPose = pose
    return Boolean(photoWallFocusPose)
  }

  function requestPhotoWallFocus(pose = photoWallFocusPose, options = {}) {
    const currentPointShortcut = [
      STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
      STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION,
      STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
      STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE,
      STUDIO_V2_CAMERA_STATES.TABLE_SKIP_TRANSITION,
    ].includes(state)
    if (!pose || (transition && !currentPointShortcut) || ![
      STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
      STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION,
      STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
      STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE,
      STUDIO_V2_CAMERA_STATES.TABLE_SKIP_TRANSITION,
      STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
      STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT,
      STUDIO_V2_CAMERA_STATES.ROOM_ORBIT,
    ].includes(state)) return false
    if (currentPointShortcut && transition) transition = null
    photoWallFocusSourcePose = getCurrentPose()
    const destination = new THREE.Vector3().fromArray(pose.position)
    const flightDistance = camera.position.distanceTo(destination)
    if (currentPointShortcut) consumeAmbientRail('PHOTO_WALL')
    state = STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS_TRANSITION
    endpointPhase = 'PHOTO_WALL_FOCUS_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'PHOTO_WALL_FOCUS_ENTER'
    return transitionTo(pose, {
      allowOfficial: true,
      duration: focusReducedMotion(options.reducedMotionOverride)
        ? 200
        : THREE.MathUtils.clamp(
          Math.max(options.duration ?? 1550, 1250 + flightDistance * 110),
          1550,
          2400,
        ),
      easing: 'smootherstep',
      exactFov: true,
      orientationBlend: true,
      intermediatePosition: focusReducedMotion(options.reducedMotionOverride)
        ? null
        : options.intermediatePosition,
      onComplete: () => {
        state = STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS
        endpointPhase = 'PHOTO_WALL_FOCUS'
        inputOwner = 'CAMERA_DIRECTOR'
        inputType = 'PHOTO_WALL_FIXED_INSPECTION'
        controls.enabled = false
      },
    })
  }

  function closePhotoWallFocus(options = {}) {
    if (![STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS_TRANSITION,
      STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS,
      STUDIO_V2_CAMERA_STATES.PHOTO_WALL_EXIT_TRANSITION,
    ].includes(state)) return false
    if (state === STUDIO_V2_CAMERA_STATES.PHOTO_WALL_EXIT_TRANSITION) return true
    if (transition) transition = null
    state = STUDIO_V2_CAMERA_STATES.PHOTO_WALL_EXIT_TRANSITION
    endpointPhase = 'PHOTO_WALL_EXIT_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'PHOTO_WALL_FOCUS_EXIT'
    return transitionTo(STUDIO_V2_TABLE_OVERVIEW_POSE, {
      allowOfficial: true,
      duration: focusReducedMotion(options.reducedMotionOverride)
        ? 200
        : (options.duration ?? 1350),
      intermediatePosition: focusReducedMotion(options.reducedMotionOverride)
        ? null
        : options.intermediatePosition,
      onComplete: () => {
        endpointPhase = 'TABLE_OVERVIEW'
        enterTableFreeOrbit()
        photoWallFocusLastExit = options.source ?? 'API'
      },
    })
  }

  function refreshPhotoWallFocus() {
    if (transition || state !== STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS || !photoWallFocusPose) return false
    applyFocusPose(photoWallFocusPose)
    return true
  }

  function getPhotoWallFocusState() {
    return {
      state,
      transition: transition?.id ?? null,
      transitionProgress: transition ? rounded(transition.progress, 4) : null,
      inputOwner,
      inputType,
      controlsLocked: !controls.enabled,
      fixedInspection: state === STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS && !transition,
      orbitEnabled: controls.enabled,
      zoomEnabled: controls.enabled && controls.enableZoom,
      sourcePose: photoWallFocusSourcePose,
      lastExit: photoWallFocusLastExit,
      near: camera.near,
      fov: camera.fov,
    }
  }

  function startOverrideReturn(time) {
    returnTransition = {
      startedAt: time,
      duration: STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideReturnMs,
      fromYaw: yawOffset,
      fromPitch: pitchOffset,
      progress: 0,
    }
    overrideIdleDeadline = null
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'RETURN_TO_RAIL'
  }

  function updateOverride(time) {
    if (pointerCandidate?.active) {
      applyHeadLook()
      return
    }
    if (overrideIdleDeadline && time >= overrideIdleDeadline && !returnTransition) {
      startOverrideReturn(time)
    }
    if (returnTransition) {
      const progress = THREE.MathUtils.clamp(
        (time - returnTransition.startedAt) / returnTransition.duration,
        0,
        1,
      )
      returnTransition.progress = progress
      const eased = easeInOutCubic(progress)
      yawOffset = THREE.MathUtils.lerp(returnTransition.fromYaw, 0, eased)
      pitchOffset = THREE.MathUtils.lerp(returnTransition.fromPitch, 0, eased)
      applyHeadLook()
      if (progress >= 1) {
        yawOffset = 0
        pitchOffset = 0
        returnTransition = null
        frozenProgress = null
        debugScrubFrozen = false
        state = STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION
        inputOwner = 'CAMERA_DIRECTOR'
        inputType = 'IDLE_OBSERVATION'
        updateIdleObservation(0)
      }
      return
    }
    applyHeadLook()
  }

  function isPaused(time) {
    return pauseReasons.size > 0 || time < resumeNotBefore
  }

  function updateAmbient(time, deltaMs) {
    if (!experienceStarted || transition) return false
    if (debugScrubFrozen && state === STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT) return false
    if (state === STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE) {
      if (isPaused(time)) {
        applyHeadLook()
        return true
      }
      updateOverride(time)
      return true
    }
    if (state === STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION) {
      if (isPaused(time)) return true
      inputOwner = 'CAMERA_DIRECTOR'
      inputType = 'IDLE_OBSERVATION'
      updateIdleObservation(deltaMs)
      return true
    }
    return false
  }

  function resolveManualCamera() {
    if (state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT) {
      prepareOrbitLimits()
      cameraSafety.prepareControls(camera, controls)
      controls.update()
      readRearBoundary()
      resolveLegacyCandidate()
      return false
    }
    const profile = currentManualProfile()
    if (!profile) return false
    applyControlsProfile(profile)
    controls.update()
    const tableOrbit = state === STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT
    const volumeInspection = tableOrbit
      ? volumeSafety.inspect(camera.position, controls.target, {
        ignoredObstacleIds: ['KITCHEN ISLAND / BODY'],
      })
      : null
    const volumeResult = tableOrbit && volumeInspection.safe
      ? { corrected: false, position: camera.position, target: controls.target }
      : volumeSafety.resolve(camera.position, controls.target)
    safetyClampActive = volumeResult.corrected
    if (volumeResult.corrected) {
      camera.position.copy(volumeResult.position)
      controls.target.copy(volumeResult.target)
      updateControlsWithoutMomentum()
      camera.updateMatrixWorld(true)
    }
    return volumeResult.corrected
  }

  function update(time) {
    if (disposed) return false
    const deltaMs = lastUpdateTime == null
      ? 0
      : Math.min(50, Math.max(0, time - lastUpdateTime))
    lastUpdateTime = time
    const transitionActive = updateTransition(time)
    const ambientActive = updateAmbient(time, deltaMs)
    let corrected = false
    if (!transitionActive && !ambientActive) corrected = resolveManualCamera()
    if (ambientActive && state !== STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT) {
      controls.enabled = false
    } else {
      updateOrbitAvailability()
    }
    updateCount += 1
    return Boolean(transitionActive || ambientActive || corrected)
  }

  function setOrbitEnabled(enabled, { owner = 'SCENE' } = {}) {
    orbitRequested = Boolean(enabled)
    updateOrbitAvailability()
    if (!controls.enabled && owner !== 'SCENE' && !ambientInputAvailable()) inputOwner = owner
    if (controls.enabled && inputOwner === owner) inputOwner = 'NONE'
    return controls.enabled
  }

  function setPauseReason(reason, paused, { resumeDelayMs = 0 } = {}) {
    const wasPaused = pauseReasons.has(reason)
    if (paused) pauseReasons.add(reason)
    else {
      pauseReasons.delete(reason)
      if (wasPaused && !pauseReasons.size && resumeDelayMs > 0) {
        resumeNotBefore = performance.now() + resumeDelayMs
      }
    }
    return pauseReasons.size > 0
  }

  function startAmbientExperience({ automatic = true, immediate = false, startedAt = performance.now() } = {}) {
    experienceStarted = true
    railCompleted = false
    railConsumedBy = 'NONE'
    tableSkipAudit = null
    clearEndpointAudit()
    driftElapsedMs = 0
    observationElapsedMs = 0
    observationYaw = 0
    observationPitch = 0
    debugScrubFrozen = false
    driftWallStartedAt = null
    entryStartedAt = startedAt
    firstCameraMotionAt = null
    stoolPlaneCrossedAt = null
    stoolPlaneCrossingElapsedMs = null
    finalSettleStartedAt = null
    finalSettleElapsedMs = null
    Object.keys(firstMotionSamples).forEach((key) => delete firstMotionSamples[key])
    driftWallCompletedAt = null
    driftPausedFrameMs = 0
    railProgress = 0
    frozenProgress = null
    yawOffset = 0
    pitchOffset = 0
    returnTransition = null
    overrideIdleDeadline = null
    state = STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'START_HOLD'
    applyResolvedPose(STUDIO_V2_ROOM_WIDE_START_POSE, { legacy: false })
    if (automatic) {
      state = STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION
      inputOwner = 'CAMERA_DIRECTOR'
      inputType = 'IDLE_OBSERVATION'
      baseRailPosition.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.position)
      baseRailTarget.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.target)
      baseRailFov = STUDIO_V2_ROOM_WIDE_START_POSE.fov
    }
    else inputOwner = 'NONE'
    updateOrbitAvailability()
    return true
  }

  function resetToRoomWideStart({ automatic = false } = {}) {
    return startAmbientExperience({ automatic, immediate: false })
  }

  function scrubAmbientProgress(progress) {
    if (!debug) return false
    experienceStarted = true
    railCompleted = false
    railConsumedBy = 'NONE'
    tableSkipAudit = null
    clearEndpointAudit()
    railProgress = THREE.MathUtils.clamp(progress, 0, 1)
    driftElapsedMs = elapsedForTravelProgress(railProgress)
    frozenProgress = null
    yawOffset = 0
    pitchOffset = 0
    returnTransition = null
    overrideIdleDeadline = null
    debugScrubFrozen = true
    state = railProgress >= 1
      ? STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW
      : STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT
    endpointPhase = railProgress >= 1 ? 'TABLE_OVERVIEW' : 'DEBUG_RAIL_SCRUB'
    inputOwner = 'NONE'
    inputType = 'DEBUG_SCRUB'
    if (railProgress >= 1) applyResolvedPose(STUDIO_V2_TABLE_OVERVIEW_POSE, { legacy: false })
    else applyRailPose(railProgress)
    controls.enabled = false
    return true
  }

  function jumpToTableOverview() {
    experienceStarted = true
    railProgress = 1
    driftElapsedMs = STUDIO_V2_AMBIENT_CAMERA_CONFIG.durationMs
    currentPathDistance = ambientRail.totalDistance
    railCompleted = true
    debugScrubFrozen = false
    clearEndpointAudit()
    endpointPhase = 'TABLE_OVERVIEW'
    state = STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW
    inputOwner = 'NONE'
    inputType = 'NONE'
    applyResolvedPose(STUDIO_V2_TABLE_OVERVIEW_POSE, { legacy: false })
    updateOrbitAvailability()
    return true
  }

  function requestTableSkip(options = {}) {
    if (![STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
      STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION,
      STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
      STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE,
    ].includes(state) || transition) return false
    const sourcePose = getCurrentPose()
    const sourceProgress = railProgress
    consumeAmbientRail('TABLE')
    state = STUDIO_V2_CAMERA_STATES.TABLE_SKIP_TRANSITION
    endpointPhase = 'TABLE_SKIP_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'TABLE_SKIP'
    const distance = camera.position.distanceTo(new THREE.Vector3().fromArray(STUDIO_V2_TABLE_OVERVIEW_POSE.position))
    const duration = focusReducedMotion(options.reducedMotionOverride)
      ? 200
      : THREE.MathUtils.clamp(650 + distance * 55, 650, 1200)
    const accepted = transitionTo({
      ...STUDIO_V2_TABLE_OVERVIEW_POSE,
      id: 'TABLE_SKIP_TO_OVERVIEW',
      state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    }, {
      allowOfficial: true,
      duration,
      onComplete: () => enterTableFreeOrbit(),
    })
    tableSkipAudit = {
      accepted,
      sourceProgress: rounded(sourceProgress, 4),
      sourcePose,
      durationMs: rounded(duration, 1),
      destination: STUDIO_V2_TABLE_OVERVIEW_POSE.id,
      railConsumed: true,
    }
    return accepted
  }

  function requestOpeningReturn(options = {}) {
    if (transition || ![
      STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
      STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT,
    ].includes(state)) return false
    const destination = new THREE.Vector3().fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.position)
    const distance = camera.position.distanceTo(destination)
    const intermediatePosition = camera.position.clone()
      .lerp(destination, 0.52)
      .add(new THREE.Vector3(0, THREE.MathUtils.clamp(distance * 0.018, 0.08, 0.18), 0))
      .toArray()
    state = STUDIO_V2_CAMERA_STATES.OPENING_RETURN_TRANSITION
    endpointPhase = 'OPENING_RETURN_TRANSITION'
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'OPENING_RETURN'
    return transitionTo(STUDIO_V2_ROOM_WIDE_START_POSE, {
      allowOfficial: true,
      duration: focusReducedMotion(options.reducedMotionOverride)
        ? 200
        : THREE.MathUtils.clamp(1050 + distance * 80, 1250, 1900),
      easing: 'smootherstep',
      exactFov: true,
      orientationBlend: true,
      intermediatePosition: focusReducedMotion(options.reducedMotionOverride)
        ? null
        : intermediatePosition,
      onComplete: () => {
        experienceStarted = true
        observationElapsedMs = 0
        observationYaw = 0
        observationPitch = 0
        baseRailPosition.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.position)
        baseRailTarget.fromArray(STUDIO_V2_ROOM_WIDE_START_POSE.target)
        baseRailFov = STUDIO_V2_ROOM_WIDE_START_POSE.fov
        currentPathDistance = 0
        state = STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION
        endpointPhase = 'IDLE_OBSERVATION'
        inputOwner = 'CAMERA_DIRECTOR'
        inputType = 'IDLE_OBSERVATION'
        updateIdleObservation(0)
      },
    })
  }

  function enterTableFreeOrbit() {
    debugScrubFrozen = false
    state = STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT
    endpointPhase = 'TABLE_FREE_ORBIT'
    orbitRequested = true
    inputOwner = 'NONE'
    inputType = 'NONE'
    applyControlsProfile(STUDIO_V2_TABLE_ORBIT_PROFILE)
    updateControlsWithoutMomentum()
    updateOrbitAvailability()
    return true
  }

  function currentViewPitchDegrees() {
    const direction = controls.target.clone().sub(camera.position).normalize()
    return rounded(THREE.MathUtils.radToDeg(Math.asin(direction.y)), 3)
  }

  function setDebugTableOrbitPose({ radius = 2.05, azimuthDegrees = 0, polarRadians = 1.37 } = {}) {
    if (!debug) return false
    enterTableFreeOrbit()
    const safeRadius = THREE.MathUtils.clamp(
      radius,
      STUDIO_V2_TABLE_ORBIT_PROFILE.minDistance,
      STUDIO_V2_TABLE_ORBIT_PROFILE.maxDistance,
    )
    const safePolar = THREE.MathUtils.clamp(
      polarRadians,
      STUDIO_V2_TABLE_ORBIT_PROFILE.minPolarAngle,
      STUDIO_V2_TABLE_ORBIT_PROFILE.maxPolarAngle,
    )
    controls.target.fromArray(STUDIO_V2_TABLE_OVERVIEW_POSE.target)
    debugOrbitOffset.setFromSphericalCoords(
      safeRadius,
      safePolar,
      THREE.MathUtils.degToRad(azimuthDegrees),
    )
    applyDirectCamera(
      resolvedPosition.copy(controls.target).add(debugOrbitOffset),
      controls.target,
      STUDIO_V2_TABLE_OVERVIEW_POSE.fov,
    )
    return {
      ...getCurrentPose(),
      radius: camera.position.distanceTo(controls.target),
      azimuthDegrees,
      polarRadians: safePolar,
      volume: volumeSafety.inspect(camera.position, controls.target, {
        ignoredObstacleIds: ['KITCHEN ISLAND / BODY'],
      }),
    }
  }

  function setDebugHeadLook({ progress = 0.5, yawDegrees = 0, pitchDegrees = 0 } = {}) {
    if (!debug) return false
    scrubAmbientProgress(THREE.MathUtils.clamp(progress, 0, 0.999))
    frozenProgress = railProgress
    yawOffset = THREE.MathUtils.clamp(
      THREE.MathUtils.degToRad(yawDegrees),
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMax,
    )
    pitchOffset = THREE.MathUtils.clamp(
      THREE.MathUtils.degToRad(pitchDegrees),
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMax,
    )
    state = STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE
    endpointPhase = 'DEBUG_HEAD_LOOK'
    inputOwner = 'DEBUG_HEAD_LOOK'
    inputType = 'DEBUG_OVERRIDE'
    overrideIdleDeadline = null
    returnTransition = null
    applyHeadLook()
    controls.enabled = false
    return true
  }

  function releaseDebugHeadLook() {
    if (!debug || state !== STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE) return false
    pointerCandidate = null
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'OVERRIDE_IDLE'
    overrideIdleDeadline = performance.now() + STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideIdleMs
    return true
  }

  function setDebugReturnProgress(progress = 0.5) {
    if (!debug || state !== STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE) return false
    const now = performance.now()
    startOverrideReturn(now)
    returnTransition.startedAt = now - THREE.MathUtils.clamp(progress, 0, 0.99)
      * STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideReturnMs
    updateOverride(now)
    return true
  }

  function interruptDebugReturn({ yawDegrees = 4, pitchDegrees = 2 } = {}) {
    if (!debug || state !== STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE) return false
    cancelReturn()
    yawOffset = THREE.MathUtils.clamp(
      yawOffset + THREE.MathUtils.degToRad(yawDegrees),
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overrideYawMax,
    )
    pitchOffset = THREE.MathUtils.clamp(
      pitchOffset + THREE.MathUtils.degToRad(pitchDegrees),
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMin,
      STUDIO_V2_AMBIENT_CAMERA_CONFIG.overridePitchMax,
    )
    inputOwner = 'DEBUG_HEAD_LOOK'
    inputType = 'DEBUG_REINTERRUPT'
    applyHeadLook()
    return true
  }

  applyResolvedPose(initialPose, {
    legacy: initialPose.state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT,
  })
  ambientRail.getPoint(0, { position: baseRailPosition, target: baseRailTarget })

  return Object.freeze({
    applyPose(pose) {
      cancelTransition('POSE_REPLACED')
      state = pose.state ?? state
      return applyResolvedPose(pose, { legacy: state === STUDIO_V2_CAMERA_STATES.ROOM_ORBIT })
    },
    beginUserInput,
    cancelTransition,
    closeMacbookFocus,
    closePhotoWallFocus,
    configureMacbookFocus,
    configurePhotoWallFocus,
    captureCurrentPose() {
      return JSON.stringify({ id: 'CAPTURED_CAMERA_POSE', state, ...poseFromCamera(camera, controls) }, null, 2)
    },
    dispose() {
      if (disposed) return
      cancelTransition('ROUTE_DISPOSE')
      disposed = true
      domElement?.removeEventListener('pointerdown', handlePointerDown, true)
      domElement?.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerUp, true)
      domElement?.removeEventListener('wheel', handleWheel, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      reducedMotionQuery.removeEventListener?.('change', handleReducedMotionChange)
      ambientRail.dispose()
      volumeSafety.dispose()
      pauseReasons.clear()
      inputOwner = 'NONE'
      inputType = 'NONE'
    },
    endUserInput,
    enterTableFreeOrbit,
    getAmbientReport() {
      return {
        config: STUDIO_V2_AMBIENT_CAMERA_CONFIG,
        rail: ambientRail.getSnapshot(),
        roomWideStart: STUDIO_V2_ROOM_WIDE_START_POSE,
        tableOverview: STUDIO_V2_TABLE_OVERVIEW_POSE,
        tableOrbitProfile: STUDIO_V2_TABLE_ORBIT_PROFILE,
      }
    },
    getCanonicalPose: getStudioV2CanonicalCameraPose,
    getCurrentPose,
    getCurrentState() {
      return state
    },
    getMacbookFocusState,
    getPhotoWallFocusState,
    getEndpointPhase() {
      return endpointPhase
    },
    getRailProgress() {
      return railProgress
    },
    getReflectionCadence() {
      if (transition) return 'FAST'
      if (state === STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION) return 'SLOW'
      if (state === STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT) return 'SLOW'
      if (state === STUDIO_V2_CAMERA_STATES.AMBIENT_USER_OVERRIDE) return 'HEAD_LOOK'
      if (state === STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT) return 'ORBIT'
      return 'AUTO'
    },
    getDebugSnapshot() {
      const radius = camera.position.distanceTo(controls.target)
      const railSnapshot = ambientRail.getSnapshot()
      const volumeInspection = volumeSafety.inspect(camera.position, controls.target, state === STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT
        ? { ignoredObstacleIds: ['KITCHEN ISLAND / BODY'] }
        : undefined)
      return {
        state,
        pose: getCurrentPose(),
        orbitRadius: Number(radius.toFixed(4)),
        orbitEnabled: controls.enabled,
        viewPitchDegrees: currentViewPitchDegrees(),
        tablePitchRangeDegrees: STUDIO_V2_TABLE_ORBIT_PROFILE.viewPitchDegrees,
        inputOwner,
        inputType,
        transition: transition ? {
          id: transition.id,
          progress: Number(transition.progress.toFixed(4)),
          targetState: transition.targetState,
        } : null,
        lastCancellation,
        safetyClampActive,
        volumeSafe: volumeInspection.safe,
        volumeInspection,
        safety: volumeSafety.getSnapshot(),
        baseline: STUDIO_V2_CAMERA_BASELINE,
        registeredStates: Object.values(STUDIO_V2_CAMERA_STATES),
        updateCount,
        ambient: {
          experienceStarted,
          officialLockedRail: !debug && state === STUDIO_V2_CAMERA_STATES.AMBIENT_DRIFT,
          entryStartedAt: entryStartedAt == null ? null : rounded(entryStartedAt, 3),
          firstMotionSamples: { ...firstMotionSamples },
          railProgress: rounded(railProgress, 6),
          driftElapsedMs: rounded(driftElapsedMs, 1),
          driftDurationMs: STUDIO_V2_AMBIENT_CAMERA_CONFIG.durationMs,
          observationElapsedMs: rounded(observationElapsedMs, 1),
          observationYawDegrees: rounded(THREE.MathUtils.radToDeg(observationYaw), 4),
          observationPitchDegrees: rounded(THREE.MathUtils.radToDeg(observationPitch), 4),
          currentPathDistance: rounded(currentPathDistance),
          totalPathDistance: railSnapshot.totalDistance,
          frozenProgress: frozenProgress == null ? null : rounded(frozenProgress, 6),
          yawOffsetDegrees: rounded(THREE.MathUtils.radToDeg(yawOffset), 2),
          pitchOffsetDegrees: rounded(THREE.MathUtils.radToDeg(pitchOffset), 2),
          startDelayRemainingMs: rounded(startDelayRemainingMs, 1),
          overrideIdleRemainingMs: overrideIdleDeadline == null
            ? null
            : rounded(Math.max(0, overrideIdleDeadline - performance.now()), 1),
          returnProgress: returnTransition ? rounded(returnTransition.progress, 4) : null,
          speedMultiplier,
          debugScrubFrozen,
          pauseReasons: [...pauseReasons],
          paused: pauseReasons.size > 0 || performance.now() < resumeNotBefore,
          visibilityPauseState,
          reducedMotionMedia: reducedMotionQuery.matches,
          reducedMotionOverride,
          reducedMotionActive: effectiveReducedMotion(),
          railCompleted,
          railConsumedBy,
          tableSkipAudit,
          endpointPhase,
          endpointSnapshots: { ...endpointSnapshots },
          endpointDifferences: {
            finalToOverview: endpointDifference(
              endpointSnapshots.FINAL_AMBIENT_DRIFT,
              endpointSnapshots.TABLE_OVERVIEW,
            ),
            overviewToFree: endpointDifference(
              endpointSnapshots.TABLE_OVERVIEW,
              endpointSnapshots.TABLE_FREE_ORBIT,
            ),
          },
          basePosition: roundedVector(baseRailPosition, 6),
          baseTarget: roundedVector(baseRailTarget, 6),
          displayedTarget: roundedVector(controls.target, 6),
          durationAudit: {
            entryStartedAt: entryStartedAt == null ? null : rounded(entryStartedAt, 3),
            firstCameraMotionAt: firstCameraMotionAt == null ? null : rounded(firstCameraMotionAt, 3),
            driftWallStartedAt: driftWallStartedAt == null ? null : rounded(driftWallStartedAt, 3),
            driftWallCompletedAt: driftWallCompletedAt == null ? null : rounded(driftWallCompletedAt, 3),
            stoolPlaneCrossedAt: stoolPlaneCrossedAt == null ? null : rounded(stoolPlaneCrossedAt, 3),
            stoolPlaneCrossingElapsedMs: stoolPlaneCrossingElapsedMs == null
              ? null
              : rounded(stoolPlaneCrossingElapsedMs, 3),
            finalSettleStartedAt: finalSettleStartedAt == null ? null : rounded(finalSettleStartedAt, 3),
            finalSettleElapsedMs: finalSettleElapsedMs == null ? null : rounded(finalSettleElapsedMs, 3),
            pausedFrameMs: rounded(driftPausedFrameMs, 3),
            activeWallDurationMs: driftWallStartedAt == null || driftWallCompletedAt == null
              ? null
              : rounded(driftWallCompletedAt - driftWallStartedAt - driftPausedFrameMs, 3),
          },
          pathSafety: railSnapshot.pathSafety,
          tableOrbitSafety: railSnapshot.tableOrbitSafety,
          pathVisible: railSnapshot.pathVisible,
          controlPointsVisible: railSnapshot.controlPointsVisible,
        },
      }
    },
    isOrbitEnabled() {
      return controls.enabled
    },
    jumpToTableOverview,
    interruptDebugReturn,
    releaseDebugHeadLook,
    resetToAcceptedOpening(options = {}) {
      experienceStarted = false
      railCompleted = false
      state = STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
      if (options.smooth && debug) return transitionTo(STUDIO_V2_CAMERA_POSES.CURRENT_OPENING, { duration: 900 })
      cancelTransition('RESET_OPENING')
      return applyResolvedPose(STUDIO_V2_ACCEPTED_OPENING_POSE, { legacy: true })
    },
    resetToRoomWideStart,
    requestMacbookFocus,
    requestOpeningReturn,
    requestPhotoWallFocus,
    requestTableSkip,
    refreshMacbookFocus,
    refreshPhotoWallFocus,
    scrubAmbientProgress,
    setDebugHeadLook,
    setDebugReturnProgress,
    setDebugTableOrbitPose,
    setAmbientSpeedMultiplier(multiplier) {
      if (!debug || !STUDIO_V2_AMBIENT_CAMERA_CONFIG.speedMultipliers.includes(Number(multiplier))) return false
      speedMultiplier = Number(multiplier)
      return speedMultiplier
    },
    setControlPointsVisible: ambientRail.setControlPointsVisible,
    setMajorObstaclesVisible: volumeSafety.setMajorObstaclesVisible,
    setOrbitEnabled,
    setPathVisible: ambientRail.setPathVisible,
    setPauseReason,
    setReducedMotionOverride(mode) {
      if (!debug || !['AUTO', 'REDUCE', 'ALLOW'].includes(mode)) return false
      reducedMotionOverride = mode
      if (state === STUDIO_V2_CAMERA_STATES.IDLE_OBSERVATION) updateIdleObservation(0)
      updateOrbitAvailability()
      return reducedMotionOverride
    },
    setSafeVolumeVisible: volumeSafety.setSafeVolumeVisible,
    setState,
    setViewport(width) {
      viewportWidth = Math.max(1, width)
      if (!transition) {
        camera.fov = responsiveFov(activeBaseFov, viewportWidth)
        camera.updateProjectionMatrix()
        refreshMacbookFocus()
        refreshPhotoWallFocus()
      }
      return camera.fov
    },
    startAmbientExperience,
    transitionTo,
    update,
  })
}

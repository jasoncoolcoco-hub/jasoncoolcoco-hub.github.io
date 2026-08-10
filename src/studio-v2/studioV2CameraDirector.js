import * as THREE from 'three'
import {
  STUDIO_V2_ACCEPTED_OPENING_POSE,
  STUDIO_V2_CAMERA_BASELINE,
  STUDIO_V2_CAMERA_POSES,
  STUDIO_V2_CAMERA_STATES,
  studioV2CameraPose,
} from './studioV2CameraPoses'
import { createStudioV2CameraVolumeSafety } from './studioV2CameraSafetyVolume'

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value ** 3 : 1 - ((-2 * value + 2) ** 3) / 2
}

function roundedVector(vector, digits = 4) {
  return vector.toArray().map((value) => Number(value.toFixed(digits)))
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

export function createStudioV2CameraDirector({
  camera,
  cameraSafety,
  controls,
  debug = false,
  domElement,
  initialPose = STUDIO_V2_ACCEPTED_OPENING_POSE,
  prepareOrbitLimits = () => {},
  readRearBoundary = () => {},
  responsiveFov = (fov) => fov,
  resolveLegacyCandidate = () => false,
  scene,
}) {
  const volumeSafety = createStudioV2CameraVolumeSafety({ scene, debug })
  const transitionFromPosition = new THREE.Vector3()
  const transitionFromTarget = new THREE.Vector3()
  const transitionToPosition = new THREE.Vector3()
  const transitionToTarget = new THREE.Vector3()
  const resolvedPosition = new THREE.Vector3()
  const resolvedTarget = new THREE.Vector3()
  let state = STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
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

  function clearOrbitMomentum() {
    controls._sphericalDelta?.set(0, 0, 0)
    controls._panOffset?.set(0, 0, 0)
    controls._dollyDirection?.set(0, 0, 0)
    controls._scale = 1
    controls._performCursorZoom = false
  }

  function applyResolvedPose(pose, { updateControls = true } = {}) {
    const clamped = cameraSafety.clampConfig({
      ...pose,
      position: [...pose.position],
      target: [...pose.target],
    })
    const volumeResult = volumeSafety.resolve(
      resolvedPosition.fromArray(clamped.position),
      resolvedTarget.fromArray(clamped.target),
    )
    camera.position.copy(volumeResult.position)
    controls.target.copy(volumeResult.target)
    activeBaseFov = Number.isFinite(pose.fov) ? pose.fov : activeBaseFov
    camera.fov = responsiveFov(activeBaseFov, viewportWidth)
    camera.near = pose.near ?? camera.near
    camera.far = pose.far ?? camera.far
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld(true)
    if (updateControls) controls.update()
    resolveLegacyCandidate()
    safetyClampActive = volumeResult.corrected
    return getCurrentPose()
  }

  function cancelTransition(reason = 'CANCELLED') {
    if (!transition) return false
    transition = null
    lastCancellation = reason
    clearOrbitMomentum()
    controls.enabled = orbitRequested
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

  function handlePointerDown(event) {
    beginUserInput(event.pointerType?.toUpperCase() || 'POINTER')
  }

  function handlePointerUp() {
    endUserInput('ANY')
  }

  function handleWheel() {
    beginUserInput('WHEEL')
    queueMicrotask(() => endUserInput('WHEEL'))
  }

  function handleKeyDown(event) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '='].includes(event.key)) return
    beginUserInput('KEYBOARD')
    queueMicrotask(() => endUserInput('KEYBOARD'))
  }

  domElement?.addEventListener('pointerdown', handlePointerDown, true)
  window.addEventListener('pointerup', handlePointerUp, true)
  window.addEventListener('pointercancel', handlePointerUp, true)
  domElement?.addEventListener('wheel', handleWheel, { capture: true, passive: true })
  window.addEventListener('keydown', handleKeyDown, true)

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
    if (options.pose) applyResolvedPose(options.pose)
    return true
  }

  function transitionTo(poseOrState, options = {}) {
    if (!debug && !options.allowOfficial) return false
    const pose = studioV2CameraPose(poseOrState)
    const safePose = cameraSafety.clampConfig(pose)
    transitionFromPosition.copy(camera.position)
    transitionFromTarget.copy(controls.target)
    transitionToPosition.fromArray(safePose.position)
    transitionToTarget.fromArray(safePose.target)
    transition = {
      id: pose.id ?? String(poseOrState),
      fromFov: camera.fov,
      toFov: responsiveFov(pose.fov ?? activeBaseFov, viewportWidth),
      baseFov: pose.fov ?? activeBaseFov,
      near: pose.near ?? camera.near,
      far: pose.far ?? camera.far,
      duration: Math.max(1, options.duration ?? 900),
      startedAt: performance.now(),
      progress: 0,
      targetState: pose.state ?? state,
    }
    inputOwner = 'CAMERA_DIRECTOR'
    inputType = 'TRANSITION'
    controls.enabled = false
    return true
  }

  function update(time) {
    if (disposed) return false
    if (transition) {
      const progress = THREE.MathUtils.clamp(
        (time - transition.startedAt) / transition.duration,
        0,
        1,
      )
      transition.progress = progress
      const eased = easeInOutCubic(progress)
      camera.position.lerpVectors(transitionFromPosition, transitionToPosition, eased)
      controls.target.lerpVectors(transitionFromTarget, transitionToTarget, eased)
      camera.fov = THREE.MathUtils.lerp(transition.fromFov, transition.toFov, eased)
      camera.near = transition.near
      camera.far = transition.far
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld(true)
      if (progress >= 1) {
        activeBaseFov = transition.baseFov
        state = transition.targetState
        transition = null
        inputOwner = 'NONE'
        inputType = 'NONE'
        controls.enabled = orbitRequested
      }
    }

    prepareOrbitLimits()
    cameraSafety.prepareControls(camera, controls)
    controls.update()
    readRearBoundary()
    resolveLegacyCandidate()
    const volumeResult = volumeSafety.resolve(camera.position, controls.target)
    safetyClampActive = volumeResult.corrected
    if (volumeResult.corrected) {
      camera.position.copy(volumeResult.position)
      controls.target.copy(volumeResult.target)
      clearOrbitMomentum()
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.enableDamping = damping
      camera.updateMatrixWorld(true)
    }
    updateCount += 1
    return Boolean(transition || volumeResult.corrected)
  }

  function setOrbitEnabled(enabled, { owner = 'SCENE' } = {}) {
    orbitRequested = Boolean(enabled)
    controls.enabled = orbitRequested && !transition
    if (!controls.enabled && owner !== 'SCENE') inputOwner = owner
    if (controls.enabled && inputOwner === owner) inputOwner = 'NONE'
    return controls.enabled
  }

  applyResolvedPose(initialPose)

  return Object.freeze({
    applyPose(pose) {
      cancelTransition('POSE_REPLACED')
      return applyResolvedPose(pose)
    },
    beginUserInput,
    cancelTransition,
    captureCurrentPose() {
      return JSON.stringify({
        id: 'CAPTURED_CAMERA_POSE',
        state,
        ...poseFromCamera(camera, controls),
      }, null, 2)
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelTransition('ROUTE_DISPOSE')
      domElement?.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerUp, true)
      domElement?.removeEventListener('wheel', handleWheel, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      volumeSafety.dispose()
      inputOwner = 'NONE'
      inputType = 'NONE'
    },
    endUserInput,
    getCurrentPose,
    getCurrentState() {
      return state
    },
    getDebugSnapshot() {
      const radius = camera.position.distanceTo(controls.target)
      return {
        state,
        pose: getCurrentPose(),
        orbitRadius: Number(radius.toFixed(4)),
        orbitEnabled: controls.enabled,
        inputOwner,
        inputType,
        transition: transition ? {
          id: transition.id,
          progress: Number(transition.progress.toFixed(4)),
          targetState: transition.targetState,
        } : null,
        lastCancellation,
        safetyClampActive,
        safety: volumeSafety.getSnapshot(),
        baseline: STUDIO_V2_CAMERA_BASELINE,
        registeredStates: Object.values(STUDIO_V2_CAMERA_STATES),
        updateCount,
      }
    },
    isOrbitEnabled() {
      return controls.enabled
    },
    resetToAcceptedOpening(options = {}) {
      state = STUDIO_V2_CAMERA_STATES.ROOM_ORBIT
      if (options.smooth && debug) return transitionTo(STUDIO_V2_CAMERA_POSES.CURRENT_OPENING, { duration: 900 })
      cancelTransition('RESET_OPENING')
      return applyResolvedPose(STUDIO_V2_ACCEPTED_OPENING_POSE)
    },
    setMajorObstaclesVisible: volumeSafety.setMajorObstaclesVisible,
    setOrbitEnabled,
    setSafeVolumeVisible: volumeSafety.setSafeVolumeVisible,
    setState,
    setViewport(width) {
      viewportWidth = Math.max(1, width)
      if (!transition) {
        camera.fov = responsiveFov(activeBaseFov, viewportWidth)
        camera.updateProjectionMatrix()
      }
      return camera.fov
    },
    transitionTo,
    update,
  })
}

import * as THREE from 'three'
import {
  STUDIO_V2_CAMERA_STATES,
  STUDIO_V2_PHOTO_WALL_FOCUS_POSE,
} from './studioV2CameraPoses'

export const STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG = Object.freeze({
  clickTolerancePx: 5,
  durationMs: 1550,
  exitDurationMs: 1350,
  reducedMotionDurationMs: 200,
  intermediatePosition: Object.freeze([2.35, 2.45, -0.65]),
})

export function studioV2PhotoWallFocusCanEnter(state) {
  return state === STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT
}

export function createStudioV2PhotoWallFocus({
  camera,
  cameraDirector,
  domElement,
  isInteractionLocked = () => false,
  photoBoardRoot,
}) {
  if (!photoBoardRoot) throw new Error('PHOTO_BOARD_01 interaction target was not found.')
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerIntent = null
  let disposed = false
  let lastRequest = 'NONE'
  let reducedMotionOverride = 'AUTO'
  const listeners = new Set()

  photoBoardRoot.userData.studioV2SemanticId = 'PHOTO_WALL_FOCUS_TARGET'
  cameraDirector.configurePhotoWallFocus({ pose: STUDIO_V2_PHOTO_WALL_FOCUS_POSE })

  function focusState() {
    return {
      ...cameraDirector.getPhotoWallFocusState(),
      semanticTarget: 'PHOTO_WALL_FOCUS_TARGET',
      lastRequest,
      reducedMotionOverride,
    }
  }

  function publish() {
    const next = focusState()
    listeners.forEach((listener) => listener(next))
    return next
  }

  function hit(event) {
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObject(photoBoardRoot, true).length > 0
  }

  function canEnter() {
    return studioV2PhotoWallFocusCanEnter(cameraDirector.getCurrentState())
  }

  function requestFocus(source = 'API') {
    if (!canEnter()) {
      lastRequest = 'BLOCKED_CAMERA_STATE'
      return false
    }
    const accepted = cameraDirector.requestPhotoWallFocus(STUDIO_V2_PHOTO_WALL_FOCUS_POSE, {
      duration: STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG.durationMs,
      intermediatePosition: STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG.intermediatePosition,
      reducedMotionOverride,
      source,
    })
    lastRequest = accepted ? `ENTER:${source}` : 'REJECTED_BY_DIRECTOR'
    publish()
    return accepted
  }

  function closeFocus(source = 'API') {
    if (isInteractionLocked()) {
      lastRequest = 'BLOCKED_PHOTO_DETAIL'
      publish()
      return false
    }
    const accepted = cameraDirector.closePhotoWallFocus({
      duration: STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG.exitDurationMs,
      intermediatePosition: STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG.intermediatePosition,
      reducedMotionOverride,
      source,
    })
    if (accepted) lastRequest = `EXIT:${source}`
    publish()
    return accepted
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    if (isInteractionLocked()) {
      pointerIntent = null
      return
    }
    const state = cameraDirector.getCurrentState()
    const focusOwned = state.startsWith('PHOTO_WALL_')
    pointerIntent = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      downOnBoard: !focusOwned && canEnter() && hit(event),
      focusOwned,
    }
  }

  function onPointerMove(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const distance = Math.hypot(event.clientX - pointerIntent.x, event.clientY - pointerIntent.y)
    if (distance > STUDIO_V2_PHOTO_WALL_FOCUS_CONFIG.clickTolerancePx) pointerIntent.moved = true
  }

  function onPointerUp(event) {
    if (isInteractionLocked()) {
      pointerIntent = null
      return
    }
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const intent = pointerIntent
    pointerIntent = null
    if (intent.moved) return
    if (intent.focusOwned) {
      if (!hit(event)) closeFocus('OUTSIDE_CLICK')
      return
    }
    if (intent.downOnBoard && hit(event)) {
      requestFocus(event.pointerType === 'touch' ? 'TOUCH' : 'CLICK')
    }
  }

  function onKeyDown(event) {
    if (isInteractionLocked()) return
    if (event.key === 'Escape') closeFocus('ESCAPE')
  }

  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('keydown', onKeyDown, true)

  return Object.freeze({
    closeFocus,
    dispose() {
      if (disposed) return
      disposed = true
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      window.removeEventListener('keydown', onKeyDown, true)
      listeners.clear()
    },
    getContract() {
      photoBoardRoot.updateWorldMatrix(true, true)
      const bounds = new THREE.Box3().setFromObject(photoBoardRoot)
      return {
        id: 'PHOTO_WALL_FOCUS_TARGET',
        objectName: photoBoardRoot.name,
        bounds: {
          min: bounds.min.toArray(),
          max: bounds.max.toArray(),
        },
        fixedPose: STUDIO_V2_PHOTO_WALL_FOCUS_POSE,
        controls: Object.freeze({ orbit: false, yaw: false, pitch: false, pan: false, zoom: false }),
        entryState: STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT,
        exitState: STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT,
      }
    },
    getState: focusState,
    requestFocus,
    setReducedMotionOverride(mode) {
      if (!['AUTO', 'REDUCE', 'ALLOW'].includes(mode)) return reducedMotionOverride
      reducedMotionOverride = mode
      publish()
      return reducedMotionOverride
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(focusState())
      return () => listeners.delete(listener)
    },
  })
}

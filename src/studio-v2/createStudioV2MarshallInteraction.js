import * as THREE from 'three'

const MAX_CLICK_MOVEMENT_PX = 6
const MAX_CLICK_DURATION_MS = 600

function findSemanticObject(root, semanticId) {
  let match = null
  root.traverse((object) => {
    if (!match && object.userData.studioV2Id === semanticId) match = object
  })
  return match
}

export function createStudioV2MarshallInteraction({
  audioController,
  camera,
  controls,
  domElement,
  root,
  sceneReady,
  criticalError,
  blockers = [],
}) {
  const marshall = findSemanticObject(root, 'MARSHALL_AMP')
  const guitar = findSemanticObject(root, 'GIBSON_GUITAR')
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const listeners = new Set()
  const originalCursor = domElement.style.cursor
  let activePointer = null
  let disposed = false
  let state = {
    enabled: Boolean(marshall) && sceneReady() && !criticalError(),
    semanticTarget: 'MARSHALL_AMP',
    hitStrategy: 'semantic-model-raycast',
    marshallFound: Boolean(marshall),
    guitarExcluded: Boolean(guitar),
    pointerOver: false,
    pointerMovement: 0,
    lastInteractionResult: 'idle',
    lastPointerDuration: 0,
    routeActive: true,
  }

  const snapshot = () => Object.freeze({ ...state })
  const publish = (patch) => {
    if (disposed) return snapshot()
    state = { ...state, ...patch }
    const next = snapshot()
    listeners.forEach((listener) => listener(next))
    return next
  }

  const interactionAvailable = () => (
    !disposed
    && Boolean(marshall)
    && sceneReady()
    && !criticalError()
  )

  const updatePointer = (event) => {
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
  }

  const hitsMarshall = (event) => {
    if (!interactionAvailable()) return false
    updatePointer(event)
    const semanticRoots = [marshall, guitar, ...blockers].filter(Boolean)
    const candidates = semanticRoots
    const nearestHit = raycaster.intersectObjects(candidates, true)[0]
    if (!nearestHit) return false
    let semanticRoot = nearestHit.object
    while (semanticRoot && !semanticRoots.includes(semanticRoot)) {
      semanticRoot = semanticRoot.parent
    }
    return semanticRoot === marshall
  }

  const setCursorForHit = (hit) => {
    if (!interactionAvailable()) {
      domElement.style.cursor = originalCursor
      return
    }
    domElement.style.cursor = hit ? 'pointer' : (controls.enabled ? 'grab' : originalCursor)
  }

  const handlePointerDown = (event) => {
    if (event.button !== 0 || !interactionAvailable()) return
    const beganOnMarshall = hitsMarshall(event)
    activePointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
      beganOnMarshall,
      movement: 0,
      orbitDragged: false,
    }
    publish({
      pointerMovement: 0,
      lastInteractionResult: beganOnMarshall ? 'pointer-down-marshall' : 'pointer-down-scene',
    })
  }

  const handlePointerMove = (event) => {
    if (activePointer?.id === event.pointerId) {
      activePointer.movement = Math.max(
        activePointer.movement,
        Math.hypot(event.clientX - activePointer.x, event.clientY - activePointer.y),
      )
      publish({ pointerMovement: Number(activePointer.movement.toFixed(2)) })
      if (activePointer.movement > MAX_CLICK_MOVEMENT_PX) {
        domElement.style.cursor = controls.enabled ? 'grabbing' : originalCursor
      }
      return
    }
    const hit = hitsMarshall(event)
    setCursorForHit(hit)
    if (hit !== state.pointerOver) publish({ pointerOver: hit })
  }

  const clearPointer = () => {
    activePointer = null
    publish({ pointerOver: false })
    setCursorForHit(false)
  }

  const handlePointerUp = (event) => {
    const current = activePointer
    if (!current || current.id !== event.pointerId) return
    const duration = performance.now() - current.startedAt
    const movement = Math.max(
      current.movement,
      Math.hypot(event.clientX - current.x, event.clientY - current.y),
    )
    const endedOnMarshall = hitsMarshall(event)
    const canToggle = current.beganOnMarshall
      && endedOnMarshall
      && movement <= MAX_CLICK_MOVEMENT_PX
      && duration <= MAX_CLICK_DURATION_MS
      && !current.orbitDragged
      && !event.defaultPrevented
      && interactionAvailable()
    let result = 'ignored-outside-marshall'
    if (current.beganOnMarshall && !endedOnMarshall) result = 'ignored-pointer-left-marshall'
    if (movement > MAX_CLICK_MOVEMENT_PX) result = 'ignored-camera-drag'
    else if (duration > MAX_CLICK_DURATION_MS) result = 'ignored-long-press'
    else if (current.orbitDragged) result = 'ignored-orbit-controls-drag'
    else if (event.defaultPrevented) result = 'ignored-radio-screen-dismissal'
    else if (!sceneReady()) result = 'ignored-scene-not-ready'
    else if (criticalError()) result = 'ignored-critical-scene-error'
    else if (canToggle) result = 'toggle-requested'
    publish({
      pointerMovement: Number(movement.toFixed(2)),
      lastPointerDuration: Number(duration.toFixed(1)),
      lastInteractionResult: result,
      pointerOver: endedOnMarshall,
    })
    activePointer = null
    setCursorForHit(endedOnMarshall)
    if (canToggle) {
      audioController.toggle().then((audioState) => {
        publish({ lastInteractionResult: `toggled-${audioState.status}` })
      })
    }
  }

  const handlePointerCancel = () => {
    if (activePointer) publish({ lastInteractionResult: 'ignored-pointer-cancelled' })
    clearPointer()
  }

  const handleControlsChange = () => {
    if (activePointer) activePointer.orbitDragged = true
  }

  const pauseForInactivePage = () => {
    audioController.pause()
    publish({ lastInteractionResult: 'paused-route-inactive' })
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') pauseForInactivePage()
  }

  domElement.addEventListener('pointerdown', handlePointerDown)
  domElement.addEventListener('pointermove', handlePointerMove)
  domElement.addEventListener('pointerup', handlePointerUp)
  domElement.addEventListener('pointercancel', handlePointerCancel)
  domElement.addEventListener('pointerleave', handlePointerCancel)
  controls.addEventListener('change', handleControlsChange)
  window.addEventListener('pagehide', pauseForInactivePage)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return Object.freeze({
    getState: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
    toggle(source = 'debug-control') {
      if (!interactionAvailable()) {
        publish({ lastInteractionResult: `ignored-${source}-scene-unavailable` })
        return Promise.resolve(audioController.getState())
      }
      publish({ lastInteractionResult: `toggle-requested-${source}` })
      return audioController.toggle().then((audioState) => {
        publish({ lastInteractionResult: `toggled-${audioState.status}-${source}` })
        return audioState
      })
    },
    dispose() {
      if (disposed) return
      audioController.pause()
      publish({ routeActive: false, enabled: false, lastInteractionResult: 'paused-route-exit' })
      domElement.removeEventListener('pointerdown', handlePointerDown)
      domElement.removeEventListener('pointermove', handlePointerMove)
      domElement.removeEventListener('pointerup', handlePointerUp)
      domElement.removeEventListener('pointercancel', handlePointerCancel)
      domElement.removeEventListener('pointerleave', handlePointerCancel)
      controls.removeEventListener('change', handleControlsChange)
      window.removeEventListener('pagehide', pauseForInactivePage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      domElement.style.cursor = originalCursor
      activePointer = null
      disposed = true
      listeners.clear()
    },
  })
}

export const STUDIO_V2_MARSHALL_CLICK_LIMITS = Object.freeze({
  maxMovementPx: MAX_CLICK_MOVEMENT_PX,
  maxDurationMs: MAX_CLICK_DURATION_MS,
})

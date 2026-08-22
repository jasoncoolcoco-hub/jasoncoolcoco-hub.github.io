import * as THREE from 'three'
import { BACKGROUND_MUSIC_STATES } from './backgroundMusicManager'

export const STUDIO_V2_SPEAKER_MUSIC_FADE = Object.freeze({
  playMs: 1200,
  pauseMs: 850,
})

export function createStudioV2SpeakerMusicInteraction({
  backgroundMusicManager,
  camera,
  domElement,
  isInteractionLocked = () => false,
  onStateChange = () => {},
  speakerRoot,
}) {
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerIntent = null
  let cursorOwned = false
  let disposed = false
  let actionRevision = 0
  let lastAction = 'NONE'

  function hit(event) {
    if (disposed || !speakerRoot || isInteractionLocked()) return false
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObject(speakerRoot, true).length > 0
  }

  function publish() {
    const state = Object.freeze({
      id: 'STANMORE_SPEAKER_01',
      lastAction,
      targetAvailable: Boolean(speakerRoot),
    })
    onStateChange(state)
    return state
  }

  function toggle(source = 'POINTER') {
    if (disposed || isInteractionLocked()) {
      return Promise.resolve(backgroundMusicManager?.getState?.())
    }
    const revision = ++actionRevision
    const before = backgroundMusicManager?.getState?.() ?? {}
    const resuming = before.status !== BACKGROUND_MUSIC_STATES.PLAYING
    lastAction = `${resuming ? 'PLAY' : 'PAUSE'}_REQUESTED:${source}`
    publish()
    return backgroundMusicManager.toggleByUser({
      durationMs: resuming
        ? STUDIO_V2_SPEAKER_MUSIC_FADE.playMs
        : STUDIO_V2_SPEAKER_MUSIC_FADE.pauseMs,
      source: 'marshall-speaker',
    }).then((next) => {
      if (revision === actionRevision) {
        lastAction = `${next.status === BACKGROUND_MUSIC_STATES.PLAYING ? 'PLAYING' : 'PAUSED'}:${source}`
        publish()
      }
      return next
    })
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    if (!hit(event)) {
      pointerIntent = null
      return
    }
    pointerIntent = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function onPointerMove(event) {
    const hovering = hit(event)
    if (hovering) {
      domElement.style.cursor = 'pointer'
      cursorOwned = true
    } else if (cursorOwned) {
      domElement.style.cursor = ''
      cursorOwned = false
    }
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    if (Math.hypot(event.clientX - pointerIntent.x, event.clientY - pointerIntent.y) > 6) {
      pointerIntent.moved = true
    }
  }

  function onPointerUp(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const intent = pointerIntent
    pointerIntent = null
    if (intent.moved || !hit(event)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    void toggle(event.pointerType === 'touch' ? 'TOUCH' : 'CLICK')
  }

  function onPointerLeave() {
    pointerIntent = null
    if (cursorOwned) domElement.style.cursor = ''
    cursorOwned = false
  }

  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointermove', onPointerMove, true)
  domElement.addEventListener('pointerleave', onPointerLeave, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  publish()

  return Object.freeze({
    dispose() {
      if (disposed) return
      disposed = true
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointermove', onPointerMove, true)
      domElement.removeEventListener('pointerleave', onPointerLeave, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      if (cursorOwned) domElement.style.cursor = ''
      pointerIntent = null
      cursorOwned = false
    },
    getState: publish,
    hit,
    toggle,
  })
}

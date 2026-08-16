import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  calculateStudioV2PhotoDetailFit,
  createStudioV2PhotoDetail,
  STUDIO_V2_PHOTO_DETAIL_CONFIG,
  STUDIO_V2_PHOTO_DETAIL_STATES,
} from './studioV2PhotoDetail.js'

function createEventTarget(rect = null) {
  const listeners = new Map()
  return {
    listeners,
    style: { cursor: '' },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    dispatch(type, event) {
      listeners.get(type)?.forEach((listener) => listener(event))
    },
    getBoundingClientRect() {
      return rect ?? { height: 900, left: 0, top: 0, width: 1600 }
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
  }
}

const windowTarget = createEventTarget()
globalThis.window = windowTarget

const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.03, 20)
camera.position.set(0, 0, 2.72)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld(true)
const cameraSnapshot = {
  fov: camera.fov,
  position: camera.position.clone(),
  quaternion: camera.quaternion.clone(),
}

const landscapeFit = calculateStudioV2PhotoDetailFit({
  camera,
  dimensions: { height: 0.2, width: 0.32 },
})
const portraitFit = calculateStudioV2PhotoDetailFit({
  camera,
  dimensions: { height: 0.32, width: 0.2 },
})
const polaroidFit = calculateStudioV2PhotoDetailFit({
  camera,
  dimensions: { height: 0.25, width: 0.2 },
})
assert.ok(Math.abs(landscapeFit.widthRatio - 0.6) < 1e-12)
assert.ok(landscapeFit.heightRatio <= STUDIO_V2_PHOTO_DETAIL_CONFIG.maxHeightRatio)
assert.ok(Math.abs(portraitFit.heightRatio - 0.65) < 1e-12)
assert.ok(portraitFit.widthRatio <= STUDIO_V2_PHOTO_DETAIL_CONFIG.maxWidthRatio)
assert.ok(Math.abs(polaroidFit.heightRatio - 0.65) < 1e-12)

const board = new THREE.Group()
board.position.set(0.12, -0.05, 0)
board.scale.setScalar(1.8)

function createCard(id, dimensions, style, x) {
  const card = new THREE.Group()
  card.position.set(x, 0.08, 0.01)
  card.rotation.z = x < 0 ? 0.12 : -0.09
  card.scale.setScalar(0.39)
  card.userData.studioV2Id = id
  card.userData.photoPackaging = { dimensions, id, style }
  const rigidCard = new THREE.Group()
  rigidCard.name = 'PHOTO_RIGID_CARD'
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(dimensions.width, dimensions.height, 0.008),
    new THREE.MeshBasicMaterial(),
  )
  body.name = 'PHOTO_PAPER_BODY'
  body.castShadow = true
  const image = new THREE.Mesh(
    new THREE.PlaneGeometry(dimensions.width * 0.9, dimensions.height * 0.8),
    new THREE.MeshBasicMaterial(),
  )
  image.name = 'PHOTO_IMAGE_SURFACE'
  image.position.z = 0.005
  rigidCard.add(body, image)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(dimensions.width, dimensions.height),
    new THREE.MeshBasicMaterial({ opacity: 0.25, transparent: true }),
  )
  contactShadow.name = 'PHOTO_CONTACT_SHADOW'
  contactShadow.position.z = -0.002
  card.add(contactShadow, rigidCard)
  board.add(card)
  return { body, card, contactShadow, image, rigidCard }
}

const landscape = createCard('PHOTO_LANDSCAPE', { height: 0.2, width: 0.32 }, 'print', -0.3)
const portrait = createCard('PHOTO_PORTRAIT', { height: 0.32, width: 0.2 }, 'print', 0.3)
const polaroid = createCard('PHOTO_POLAROID', { height: 0.25, width: 0.2 }, 'polaroid', 0)
board.updateMatrixWorld(true)

let cameraState = 'PHOTO_WALL_FOCUS'
let clock = 1000
const hoverLocks = []
const domElement = createEventTarget({ height: 900, left: 0, top: 0, width: 1600 })
const detail = createStudioV2PhotoDetail({
  camera,
  cameraDirector: { getCurrentState: () => cameraState },
  domElement,
  now: () => clock,
  photoBoardRoot: board,
  photoHover: {
    setInteractionLocked(locked) {
      hoverLocks.push(locked)
    },
  },
})

function finishTransition() {
  clock += STUDIO_V2_PHOTO_DETAIL_CONFIG.durationMs
  detail.update(clock)
  board.updateMatrixWorld(true)
}

function pointerAtObject(object, pointerId = 1) {
  board.updateMatrixWorld(true)
  const projected = object.getWorldPosition(new THREE.Vector3()).project(camera)
  return {
    button: 0,
    clientX: (projected.x * 0.5 + 0.5) * 1600,
    clientY: (-projected.y * 0.5 + 0.5) * 900,
    pointerId,
    pointerType: 'mouse',
    stopImmediatePropagation() {},
  }
}

function assertExactBase(cardRecord, base) {
  assert.deepEqual(cardRecord.rigidCard.position.toArray(), base.position.toArray())
  assert.ok(cardRecord.rigidCard.quaternion.angleTo(base.quaternion) < 1e-12)
  assert.deepEqual(cardRecord.rigidCard.scale.toArray(), base.scale.toArray())
}

const base = {
  position: landscape.rigidCard.position.clone(),
  quaternion: landscape.rigidCard.quaternion.clone(),
  scale: landscape.rigidCard.scale.clone(),
}
landscape.rigidCard.position.z = 0.018
landscape.rigidCard.rotation.set(0.02, 0.03, 0)
landscape.rigidCard.scale.setScalar(1.012)
const hoveredOpening = landscape.rigidCard.position.clone()

assert.equal(detail.requestDetail(landscape.card, 'TEST_LANDSCAPE'), true)
assert.deepEqual(landscape.rigidCard.position.toArray(), hoveredOpening.toArray())
assert.equal(landscape.contactShadow.visible, false)
assert.equal(landscape.body.castShadow, true)
assert.equal(detail.requestDetail(portrait.card, 'LOCK_TEST'), false)
assert.equal(detail.getState().interactionState, STUDIO_V2_PHOTO_DETAIL_STATES.OPENING)
assert.equal(detail.getState().fit.landscape, true)
assert.equal(hoverLocks.at(-1), true)
finishTransition()

assert.equal(detail.getState().interactionState, STUDIO_V2_PHOTO_DETAIL_STATES.OPEN)
assert.equal(landscape.contactShadow.visible, false)
const centered = landscape.rigidCard.getWorldPosition(new THREE.Vector3()).project(camera)
assert.ok(Math.abs(centered.x) < 1e-8)
assert.ok(Math.abs(centered.y) < 1e-8)
assert.ok(landscape.rigidCard.getWorldQuaternion(new THREE.Quaternion())
  .angleTo(camera.getWorldQuaternion(new THREE.Quaternion())) < 1e-7)
assert.equal(landscape.body.renderOrder, STUDIO_V2_PHOTO_DETAIL_CONFIG.renderOrder)
assert.deepEqual(camera.position.toArray(), cameraSnapshot.position.toArray())
assert.ok(camera.quaternion.angleTo(cameraSnapshot.quaternion) < 1e-12)
assert.equal(camera.fov, cameraSnapshot.fov)

// Selected-photo click follows the shared close path.
const selectedPointer = pointerAtObject(landscape.rigidCard)
domElement.dispatch('pointerdown', selectedPointer)
windowTarget.dispatch('pointerup', selectedPointer)
assert.equal(detail.getState().lastExit, 'SELECTED_CLICK')
assert.equal(landscape.contactShadow.visible, false)
finishTransition()
assertExactBase(landscape, base)
assert.equal(landscape.contactShadow.visible, true)
assert.equal(landscape.body.renderOrder, 0)
assert.equal(hoverLocks.at(-1), false)

// Outside click, Escape, and API close all restore the same immutable base transform.
for (const [cardRecord, exit] of [
  [portrait, 'OUTSIDE_CLICK'],
  [polaroid, 'ESCAPE'],
  [landscape, 'API_TEST'],
]) {
  assert.equal(detail.requestDetail(cardRecord.card, `TEST_${exit}`), true)
  assert.equal(cardRecord.contactShadow.visible, false)
  finishTransition()
  if (exit === 'OUTSIDE_CLICK') {
    const outside = {
      button: 0,
      clientX: 2,
      clientY: 2,
      pointerId: 2,
      pointerType: 'mouse',
      stopImmediatePropagation() {},
    }
    domElement.dispatch('pointerdown', outside)
    windowTarget.dispatch('pointerup', outside)
  } else if (exit === 'ESCAPE') {
    windowTarget.dispatch('keydown', { key: 'Escape', stopImmediatePropagation() {} })
  } else {
    detail.closeDetail(exit)
  }
  assert.equal(detail.getState().lastExit, exit)
  finishTransition()
  assert.equal(detail.getState().interactionState, STUDIO_V2_PHOTO_DETAIL_STATES.IDLE)
  assert.equal(cardRecord.contactShadow.visible, true)
}

for (let cycle = 0; cycle < 5; cycle += 1) {
  assert.equal(detail.requestDetail(landscape.card, 'REPEAT'), true)
  assert.equal(landscape.contactShadow.visible, false)
  finishTransition()
  assert.equal(detail.closeDetail('REPEAT'), true)
  finishTransition()
  assertExactBase(landscape, base)
  assert.equal(landscape.contactShadow.visible, true)
}

assert.equal(detail.requestDetail(polaroid.card, 'LIFECYCLE'), true)
finishTransition()
cameraState = 'PHOTO_WALL_EXIT_TRANSITION'
detail.update(clock + 1)
assert.equal(detail.getState().interactionState, STUDIO_V2_PHOTO_DETAIL_STATES.IDLE)
assert.equal(detail.getState().lastExit, 'FOCUS_LIFECYCLE_RESET')
assert.equal(hoverLocks.at(-1), false)
assert.equal(polaroid.contactShadow.visible, true)

detail.dispose()
for (const { body, contactShadow, image } of [landscape, portrait, polaroid]) {
  body.geometry.dispose()
  body.material.dispose()
  contactShadow.geometry.dispose()
  contactShadow.material.dispose()
  image.geometry.dispose()
  image.material.dispose()
}

console.log('Studio V2 single-photo detail open, fit, exit, lock, and drift smoke passed.')

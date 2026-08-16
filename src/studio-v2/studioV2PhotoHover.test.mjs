import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  createStudioV2PhotoHover,
  STUDIO_V2_PHOTO_HOVER_CONFIG,
  studioV2PhotoHoverEnabled,
  studioV2PhotoHoverEase,
  studioV2PhotoTiltFromBoardPosition,
} from './studioV2PhotoHover.js'

assert.equal(studioV2PhotoHoverEnabled('TABLE_FREE_ORBIT'), false)
assert.equal(studioV2PhotoHoverEnabled('PHOTO_WALL_FOCUS_TRANSITION'), false)
assert.equal(studioV2PhotoHoverEnabled('PHOTO_WALL_FOCUS'), true)
assert.equal(studioV2PhotoHoverEase(0), 0)
assert.equal(studioV2PhotoHoverEase(1), 1)
assert.ok(studioV2PhotoHoverEase(0.5) > studioV2PhotoHoverEase(0.25))
assert.ok(studioV2PhotoHoverEase(0.5) > 0.8)

const topLeftTilt = studioV2PhotoTiltFromBoardPosition({ x: 10, y: 10 })
const bottomLeftTilt = studioV2PhotoTiltFromBoardPosition({ x: 10, y: 90 })
const topCenterTilt = studioV2PhotoTiltFromBoardPosition({ x: 50, y: 10 })
const bottomCenterTilt = studioV2PhotoTiltFromBoardPosition({ x: 50, y: 90 })
const rightTilt = studioV2PhotoTiltFromBoardPosition({ x: 90, y: 50 })
const centerTilt = studioV2PhotoTiltFromBoardPosition({ x: 50, y: 50 })
const nearCenterTilt = studioV2PhotoTiltFromBoardPosition({ x: 54, y: 52 })
assert.ok(topLeftTilt.xDegrees > 0 && topLeftTilt.yDegrees > 0)
assert.ok(bottomLeftTilt.xDegrees < 0 && bottomLeftTilt.yDegrees > 0)
assert.ok(topCenterTilt.xDegrees > 0 && Math.abs(topCenterTilt.yDegrees) < 1e-12)
assert.ok(bottomCenterTilt.xDegrees < 0 && Math.abs(bottomCenterTilt.yDegrees) < 1e-12)
assert.ok(rightTilt.yDegrees < 0)
assert.equal(centerTilt.xDegrees, 0)
assert.equal(centerTilt.yDegrees, 0)
assert.ok(Math.abs(nearCenterTilt.xDegrees) < 0.1)
assert.ok(Math.abs(nearCenterTilt.yDegrees) < 0.1)
assert.ok(Math.abs(topLeftTilt.xDegrees) <= STUDIO_V2_PHOTO_HOVER_CONFIG.maxTiltXDegrees)
assert.ok(Math.abs(topLeftTilt.yDegrees) <= STUDIO_V2_PHOTO_HOVER_CONFIG.maxTiltYDegrees)

const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10)
camera.position.set(0, 0, 2)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld(true)

const board = new THREE.Group()
const sharedShadowMaterial = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true })

function createCard(id, x, z, boardCoordinates) {
  const card = new THREE.Group()
  card.position.set(x, 0, z)
  card.rotation.z = x < 0 ? 0.12 : -0.08
  card.userData.studioV2Id = id
  card.userData.photoPackaging = { boardCoordinates, id }
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial(),
  )
  photo.name = 'PHOTO_IMAGE_SURFACE'
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.58, 0.01),
    new THREE.MeshBasicMaterial(),
  )
  body.name = 'PHOTO_PAPER_BODY'
  const rigidCard = new THREE.Group()
  rigidCard.name = 'PHOTO_RIGID_CARD'
  rigidCard.add(body, photo)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), sharedShadowMaterial)
  shadow.name = 'PHOTO_CONTACT_SHADOW'
  shadow.position.z = -0.001
  card.add(shadow, rigidCard)
  board.add(card)
  return { body, card, photo, rigidCard, shadow }
}

const left = createCard('PHOTO_LEFT', -0.45, 0.01, { x: 10, y: 10 })
const right = createCard('PHOTO_RIGHT', 0.45, 0.02, { x: 90, y: 90 })
board.updateMatrixWorld(true)
const leftBaseQuaternion = left.card.quaternion.clone()
const rightBaseQuaternion = right.card.quaternion.clone()
const leftShadowWorldQuaternion = left.shadow.getWorldQuaternion(new THREE.Quaternion())

let cameraState = 'TABLE_FREE_ORBIT'
const listeners = new Map()
const domElement = {
  style: { cursor: '' },
  addEventListener(type, listener) {
    listeners.set(type, listener)
  },
  removeEventListener(type) {
    listeners.delete(type)
  },
  getBoundingClientRect() {
    return { height: 100, left: 0, top: 0, width: 100 }
  },
}

const hover = createStudioV2PhotoHover({
  camera,
  cameraDirector: { getCurrentState: () => cameraState },
  domElement,
  photoBoardRoot: board,
})

listeners.get('pointermove')({ clientX: 26, clientY: 50 })
hover.update(0)
assert.equal(hover.getState().hoveredId, null)
assert.equal(left.card.position.z, 0.01)

cameraState = 'PHOTO_WALL_FOCUS'
listeners.get('pointermove')({ clientX: 26, clientY: 50 })
for (const time of [0, 50, 100, 150, 200]) hover.update(time)

assert.equal(hover.getState().hoveredId, 'PHOTO_LEFT')
assert.equal(hover.getState().liftedCount, 1)
assert.equal(domElement.style.cursor, 'pointer')
assert.equal(left.card.position.z, 0.01)
assert.equal(right.card.position.z, 0.02)
assert.ok(Math.abs(left.rigidCard.position.z - STUDIO_V2_PHOTO_HOVER_CONFIG.liftLocal) < 1e-12)
assert.equal(right.rigidCard.position.z, 0)
assert.notEqual(left.shadow.material, sharedShadowMaterial)
assert.equal(right.shadow.material, sharedShadowMaterial)
assert.ok(left.shadow.material.opacity > sharedShadowMaterial.opacity)
assert.deepEqual(left.card.scale.toArray(), [1, 1, 1])
assert.deepEqual(left.rigidCard.scale.toArray(), [
  STUDIO_V2_PHOTO_HOVER_CONFIG.scale,
  STUDIO_V2_PHOTO_HOVER_CONFIG.scale,
  STUDIO_V2_PHOTO_HOVER_CONFIG.scale,
])
assert.deepEqual(right.card.scale.toArray(), [1, 1, 1])
assert.deepEqual(right.rigidCard.scale.toArray(), [1, 1, 1])
assert.ok(left.shadow.scale.x < right.shadow.scale.x)
assert.equal(left.shadow.position.z, -0.001)
assert.ok(left.rigidCard.rotation.x > 0)
assert.ok(left.rigidCard.rotation.y > 0)
assert.equal(left.body.parent, left.rigidCard)
assert.equal(left.photo.parent, left.rigidCard)
board.updateMatrixWorld(true)
assert.ok(left.shadow.getWorldQuaternion(new THREE.Quaternion()).angleTo(leftShadowWorldQuaternion) < 1e-7)

cameraState = 'PHOTO_WALL_EXIT_TRANSITION'
hover.update(250)
assert.equal(hover.getState().hoveredId, null)
assert.equal(hover.getState().liftedCount, 0)
assert.equal(domElement.style.cursor, '')
assert.equal(left.card.position.z, 0.01)
assert.equal(right.card.position.z, 0.02)
assert.deepEqual(left.card.scale.toArray(), [1, 1, 1])
assert.deepEqual(right.card.scale.toArray(), [1, 1, 1])
assert.equal(left.rigidCard.position.z, 0)
assert.deepEqual(left.rigidCard.scale.toArray(), [1, 1, 1])
assert.deepEqual(left.shadow.scale.toArray(), [1, 1, 1])
assert.equal(left.shadow.position.z, -0.001)
assert.ok(left.card.quaternion.angleTo(leftBaseQuaternion) < 1e-12)
assert.ok(right.card.quaternion.angleTo(rightBaseQuaternion) < 1e-12)
assert.equal(left.shadow.material, sharedShadowMaterial)
assert.equal(right.shadow.material, sharedShadowMaterial)

hover.dispose()
assert.equal(listeners.size, 0)

left.photo.geometry.dispose()
left.photo.material.dispose()
left.body.geometry.dispose()
left.body.material.dispose()
left.shadow.geometry.dispose()
right.photo.geometry.dispose()
right.photo.material.dispose()
right.body.geometry.dispose()
right.body.material.dispose()
right.shadow.geometry.dispose()
sharedShadowMaterial.dispose()

console.log('Studio V2 PHOTO_WALL_FOCUS-only hover and exit-reset smoke passed.')

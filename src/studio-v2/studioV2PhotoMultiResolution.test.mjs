import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { createStudioV2PhotoDetail, STUDIO_V2_PHOTO_DETAIL_CONFIG } from './studioV2PhotoDetail.js'

function eventTarget(overrides = {}) {
  const listeners = new Map()
  return {
    ...overrides,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(listener)
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener)
    },
  }
}

const windowTarget = eventTarget()
globalThis.window = windowTarget

const manifest = JSON.parse(fs.readFileSync('public/studio-v2/photo-wall/manifest.json', 'utf8'))
const activePhotos = manifest.photos.filter(
  ({ enabled, x, y }) => enabled && Number.isFinite(x) && Number.isFinite(y),
)
assert.equal(activePhotos.length, 70)
assert.equal(manifest.qualityTiers.room.maxDimension, 320)
assert.equal(manifest.qualityTiers.focus.maxDimension, 960)
assert.equal(manifest.qualityTiers.detail.source, 'generated')

const tierPath = (photo, tier) => {
  if (tier === 'detail') return photo.generatedFilename
  const stem = photo.generatedFilename.split('/').pop().replace(/\.[^.]+$/, '')
  return `${manifest.qualityTiers[tier].directory}/${stem}.jpg`
}
for (const tier of ['room', 'focus', 'detail']) {
  assert.equal(new Set(activePhotos.map((photo) => tierPath(photo, tier))).size, 70)
  activePhotos.forEach((photo) => {
    assert.ok(fs.existsSync(`public/studio-v2/photo-wall/${tierPath(photo, tier)}`))
  })
}

const packagingSource = fs.readFileSync('src/studio-v2/studioV2PhotoPackaging.js', 'utf8')
const sceneSource = fs.readFileSync('src/studio-v2/createStudioV2Scene.js', 'utf8')
const focusSource = fs.readFileSync('src/studio-v2/studioV2PhotoWallFocus.js', 'utf8')
const derivativeSource = fs.readFileSync('scripts/generate-studio-v2-photo-derivatives.py', 'utf8')
assert.match(packagingSource, /visibleTier = 'room'/)
assert.match(packagingSource, /focusTextures\.set\(id, texture\)/)
assert.match(packagingSource, /card\.surface\.material\.map = texture/)
assert.match(packagingSource, /idleAutoUpgrade: false/)
assert.doesNotMatch(packagingSource, /group\.remove\(|group\.clear\(/)
assert.match(sceneSource, /sceneExpansionResource\.preloadPhotoWallFocusQuality\(\)\.then/)
assert.match(sceneSource, /activateFocusQuality:/)
assert.match(sceneSource, /prepareDetailQuality:/)
assert.match(focusSource, /WAITING_FOCUS_QUALITY/)
assert.match(focusSource, /Promise\.resolve\(preloadFocusQuality\(\)\)/)
assert.match(focusSource, /if \(!activateFocusQuality\(\)\)/)
assert.match(focusSource, /activateRoomQuality\(\)/)
assert.match(derivativeSource, /ROOM_RESAMPLING = Image\.Resampling\.BOX/)
assert.match(derivativeSource, /DETAIL_RESAMPLING = Image\.Resampling\.LANCZOS/)
assert.match(derivativeSource, /ROOM_RESAMPLING if spec\["id"\] == "room" else DETAIL_RESAMPLING/)

const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100)
camera.position.set(0, 0, 3)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld(true)
const domElement = eventTarget({
  getBoundingClientRect: () => ({ height: 900, left: 0, top: 0, width: 1600 }),
  style: {},
})

const detailBoard = new THREE.Group()
const card = new THREE.Group()
card.userData.studioV2Id = 'PHOTO_DETAIL_MULTI_RES_TEST'
card.userData.photoPackaging = { dimensions: { height: 0.2, width: 0.3 }, slotNumber: 1 }
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(0.3, 0.2),
  new THREE.MeshBasicMaterial(),
)
shadow.name = 'PHOTO_CONTACT_SHADOW'
const rigidCard = new THREE.Group()
rigidCard.name = 'PHOTO_RIGID_CARD'
rigidCard.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial()))
card.add(shadow, rigidCard)
detailBoard.add(card)
detailBoard.updateMatrixWorld(true)

let detailReady = false
let resolveDetail
let restoredDetailId = null
let clock = 1000
let cameraState = 'PHOTO_WALL_FOCUS'
const detail = createStudioV2PhotoDetail({
  activateDetailQuality: () => detailReady,
  camera,
  cameraDirector: { getCurrentState: () => cameraState },
  domElement,
  now: () => clock,
  photoBoardRoot: detailBoard,
  photoHover: { setInteractionLocked() {} },
  prepareDetailQuality: () => new Promise((resolve) => { resolveDetail = resolve }),
  restoreDetailQuality: (id) => { restoredDetailId = id },
})
assert.equal(detail.requestDetailById('PHOTO_DETAIL_MULTI_RES_TEST', 'MULTI_RES_TEST'), true)
assert.equal(detail.getState().interactionState, 'PHOTO_DETAIL_LOADING')
assert.equal(rigidCard.position.z, 0)
detailReady = true
resolveDetail(true)
await Promise.resolve()
await Promise.resolve()
assert.equal(detail.getState().interactionState, 'PHOTO_DETAIL_OPENING')
clock += STUDIO_V2_PHOTO_DETAIL_CONFIG.durationMs
detail.update(clock)
assert.equal(detail.getState().interactionState, 'PHOTO_DETAIL')
assert.equal(detail.closeDetail('MULTI_RES_TEST'), true)
clock += STUDIO_V2_PHOTO_DETAIL_CONFIG.durationMs
detail.update(clock)
assert.equal(detail.getState().interactionState, 'IDLE')
assert.equal(restoredDetailId, 'PHOTO_DETAIL_MULTI_RES_TEST')
detail.dispose()

shadow.geometry.dispose()
shadow.material.dispose()
rigidCard.children[0].geometry.dispose()
rigidCard.children[0].material.dispose()
delete globalThis.window

console.log('Studio V2 Photo Wall multi-resolution loading smoke passed.')

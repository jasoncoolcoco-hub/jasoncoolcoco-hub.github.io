import assert from 'node:assert/strict'
import {
  ENTRY_CRITICAL_ASSETS,
  ENTRY_READY_CONDITIONS,
  STUDIO_V2_ASSET_TIERS,
  VISUAL_READY_ASSETS,
  createStudioV2EntryGate,
  resolveStudioV2EntryRequests,
  resolveStudioV2VisualReadyManifest,
} from './studioV2EntryGate.js'

const tier1 = new Set(STUDIO_V2_ASSET_TIERS.tier1)
const tier2 = new Set(STUDIO_V2_ASSET_TIERS.tier2)
const tier3 = new Set(STUDIO_V2_ASSET_TIERS.tier3)
const visualReady = new Set(STUDIO_V2_ASSET_TIERS.visualReady)

assert.equal([...tier1].some((id) => tier2.has(id) || tier3.has(id) || visualReady.has(id)), false)
assert.equal([...tier2].some((id) => tier3.has(id) || visualReady.has(id)), false)
ENTRY_CRITICAL_ASSETS.forEach(({ id }) => assert.equal(tier1.has(id), true))
VISUAL_READY_ASSETS.forEach(({ id }) => assert.equal(visualReady.has(id), true))

const requests = resolveStudioV2EntryRequests({
  roomUrl: '/room.glb',
  macbookUrl: '/macbook.glb',
  photoBoardUrl: '/photo-board.glb',
  photoManifestUrl: '/photo-manifest.json',
  polaroidCameraUrl: '/polaroid-camera.glb',
  speakerUrl: '/speaker.glb',
})

assert.deepEqual(
  requests.map(({ url }) => url).sort(),
  ['/macbook.glb', '/photo-board.glb', '/room.glb'],
)
assert.equal(requests.some(({ url }) => /marshall|guitar|folder|camera|coffee/.test(url)), false)
assert.equal(ENTRY_CRITICAL_ASSETS.some(({ id }) => /MARSHALL|GUITAR|RADIO|FOLDER/.test(id)), false)
assert.equal(VISUAL_READY_ASSETS.some(({ id }) => id === 'DOCUMENT_FOLDER_01'), false)
assert.equal(VISUAL_READY_ASSETS.some(({ id }) => id === 'COFFEE_CUP_01'), false)

assert.deepEqual(
  resolveStudioV2VisualReadyManifest({
    photoManifestUrl: '/photo-manifest.json',
    polaroidCameraUrl: '/polaroid-camera.glb',
    speakerUrl: '/speaker.glb',
  }).map(({ url }) => url),
  ['/polaroid-camera.glb', '/speaker.glb', '/photo-manifest.json'],
)

const gate = createStudioV2EntryGate({
  deliveryConfig: {
    roomUrl: '/room.glb',
    macbookUrl: '/macbook.glb',
    photoBoardUrl: '/photo-board.glb',
    photoManifestUrl: '/photo-manifest.json',
    polaroidCameraUrl: '/polaroid-camera.glb',
    speakerUrl: '/speaker.glb',
  },
  startedAt: 0,
})
ENTRY_CRITICAL_ASSETS.forEach(({ id }) => gate.markAssetReady(id))
ENTRY_READY_CONDITIONS.forEach((condition) => gate.markCondition(condition))
const sceneReady = gate.markSceneReady()
assert.equal(sceneReady.sceneReady, true)
assert.equal(sceneReady.visualReady, false)
assert.equal(sceneReady.interactionsEnabled, false)
VISUAL_READY_ASSETS.forEach(({ id }) => gate.markAssetReady(id))
const visualReadyState = gate.markVisualReady()
assert.equal(visualReadyState.visualReady, true)
assert.equal(visualReadyState.interactionsEnabled, true)
assert.equal(visualReadyState.photoWallReady, true)

console.log('Studio V2 cold-load tier smoke test passed.')

import assert from 'node:assert/strict'
import {
  ENTRY_CRITICAL_ASSETS,
  STUDIO_V2_ASSET_TIERS,
  resolveStudioV2EntryRequests,
} from './studioV2EntryGate.js'

const tier1 = new Set(STUDIO_V2_ASSET_TIERS.tier1)
const tier2 = new Set(STUDIO_V2_ASSET_TIERS.tier2)
const tier3 = new Set(STUDIO_V2_ASSET_TIERS.tier3)

assert.equal([...tier1].some((id) => tier2.has(id) || tier3.has(id)), false)
assert.equal([...tier2].some((id) => tier3.has(id)), false)
ENTRY_CRITICAL_ASSETS.forEach(({ id }) => assert.equal(tier1.has(id), true))

const requests = resolveStudioV2EntryRequests({
  roomUrl: '/room.glb',
  macbookUrl: '/macbook.glb',
  marshallUrl: '/marshall.glb',
  guitarUrl: '/guitar.glb',
  photoBoardUrl: '/photo-board.glb',
  polaroidCameraUrl: '/polaroid-camera.glb',
  documentFolderUrl: '/document-folder.glb',
  coffeeCupUrl: '/coffee-cup.glb',
})

assert.deepEqual(
  requests.map(({ url }) => url).sort(),
  ['/guitar.glb', '/macbook.glb', '/marshall.glb', '/photo-board.glb', '/room.glb'],
)
assert.equal(requests.some(({ url }) => /camera|folder|coffee/.test(url)), false)

console.log('Studio V2 cold-load tier smoke test passed.')

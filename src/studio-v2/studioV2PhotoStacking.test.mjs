import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  calculateStudioV2PolaroidLayout,
  STUDIO_V2_PHOTO_CARD_SCALE,
} from './studioV2PhotoPackaging.js'
import { STUDIO_V2_PHOTO_BOARD_SURFACE } from './studioV2PhotoBoardLayout.js'
import {
  bringStudioV2PhotoStackToFront,
  moveStudioV2PhotoStackBackward,
  resolveStudioV2PhotoDepthRanks,
} from './studioV2PhotoStacking.js'

const options = { boardHeight: 1, boardWidth: 2, cardScale: 1 }
const records = [
  { height: 0.2, id: 'A', rotation: 0, slotNumber: 1, width: 0.4, x: 50, y: 50, zOrder: 9.99 },
  { height: 0.2, id: 'B', rotation: 2, slotNumber: 2, width: 0.4, x: 55, y: 50, zOrder: 9.99 },
  { height: 0.2, id: 'C', rotation: 0, slotNumber: 3, width: 0.4, x: 85, y: 50, zOrder: 9.99 },
]
const depthPlan = resolveStudioV2PhotoDepthRanks(records, options)
assert.equal(depthPlan.ranks.get('A'), 0)
assert.equal(depthPlan.ranks.get('B'), 1)
assert.equal(depthPlan.ranks.get('C'), 0)
assert.equal(depthPlan.maximumRank, 1)
assert.deepEqual(depthPlan.overlappingPairs, [{ lowerId: 'A', upperId: 'B' }])

const frontChanges = bringStudioV2PhotoStackToFront(records, records[0])
assert.equal(records[0].zOrder, 1)
assert.ok(frontChanges.length > 0)
assert.deepEqual([...records].sort((a, b) => a.zOrder - b.zOrder).map(({ id }) => id), ['B', 'C', 'A'])

const backwardChanges = moveStudioV2PhotoStackBackward(records, records[0])
assert.ok(backwardChanges.length > 0)
assert.deepEqual([...records].sort((a, b) => a.zOrder - b.zOrder).map(({ id }) => id), ['B', 'A', 'C'])

for (let index = 0; index < 20; index += 1) {
  bringStudioV2PhotoStackToFront(records, records[index % records.length])
}
assert.ok(records.every(({ zOrder }) => zOrder >= 0 && zOrder <= 1))
assert.equal(new Set(records.map(({ zOrder }) => zOrder)).size, records.length)

const manifest = JSON.parse(fs.readFileSync('public/studio-v2/photo-wall/manifest.json', 'utf8'))
const placedPhotos = manifest.photos.filter((photo) => (
  photo.enabled && Number.isFinite(photo.x) && Number.isFinite(photo.y)
))
const manifestRecords = placedPhotos.map((photo, index) => {
  const dimensions = calculateStudioV2PolaroidLayout(
    photo.aspectRatio,
    manifest.normalizedSize,
    index + 1,
  ).dimensions
  return {
    ...photo,
    height: dimensions.height,
    slotNumber: index + 1,
    width: dimensions.width,
  }
})
const manifestDepthPlan = resolveStudioV2PhotoDepthRanks(manifestRecords, {
  boardHeight: STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight,
  boardWidth: STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth,
  cardScale: STUDIO_V2_PHOTO_CARD_SCALE,
})
assert.equal(manifestDepthPlan.maximumRank, 1)
assert.deepEqual(manifestDepthPlan.overlappingPairs, [
  {
    lowerId: 'PHOTO_GPDG9690_4C9EF4D8',
    upperId: 'PHOTO_IMG_8438_50937B1D',
  },
  {
    lowerId: 'PHOTO_IMG_2618_F2EFE204',
    upperId: 'PHOTO_IMG_8438_50937B1D',
  },
])

console.log('Studio V2 deterministic Photo Wall depth stacking smoke passed.')

import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  studioV2PhotoWallAdjustmentEnabled,
  studioV2PositionToPhotoBoardCoordinates,
} from './studioV2PhotoBoardLayout.js'
import {
  bringStudioV2PhotoRecordToFront,
  measureStudioV2PhotoWallOcclusion,
  resolveStudioV2SecondLayerIds,
  STUDIO_V2_PHOTO_FIRST_LAYER_COUNT,
  STUDIO_V2_PHOTO_OCCLUSION_LIMIT,
} from './studioV2PhotoWallAdjustment.js'

assert.equal(
  studioV2PhotoWallAdjustmentEnabled(
    new URLSearchParams('debug=1&photoWallReview=1&photoWallAdjust=1'),
    true,
  ),
  true,
)
assert.equal(
  studioV2PhotoWallAdjustmentEnabled(
    new URLSearchParams('photoWallAdjust=1'),
    true,
  ),
  false,
)
assert.equal(
  studioV2PhotoWallAdjustmentEnabled(
    new URLSearchParams('photoWallReview=1&photoWallAdjust=1'),
    false,
  ),
  false,
)

const center = studioV2PositionToPhotoBoardCoordinates({ x: -0.675, y: -0.3375 })
assert.ok(Math.abs(center.x - 50) <= 1e-10)
assert.ok(Math.abs(center.y - 50) <= 1e-10)

const manifest = JSON.parse(fs.readFileSync('public/studio-v2/photo-wall/manifest.json', 'utf8'))
const realPhotos = manifest.photos.filter(({ width, height }) => (
  Number.isFinite(width) && Number.isFinite(height)
))
const secondLayerIds = resolveStudioV2SecondLayerIds(manifest)
assert.equal(STUDIO_V2_PHOTO_FIRST_LAYER_COUNT, 39)
assert.equal(realPhotos.length, 72)
assert.equal(secondLayerIds.size, 33)
assert.ok(realPhotos.slice(0, 39).every(({ id }) => !secondLayerIds.has(id)))
assert.ok(realPhotos.slice(39).every(({ id }) => secondLayerIds.has(id)))
assert.equal(realPhotos.slice(39).filter(({ enabled }) => enabled).length, 31)

const source = fs.readFileSync('src/studio-v2/createStudioV2Scene.js', 'utf8')
const page = fs.readFileSync('src/studio-v2/StudioV2ImportPage.jsx', 'utf8')
const adjustmentSource = fs.readFileSync('src/studio-v2/studioV2PhotoWallAdjustment.js', 'utf8')
assert.match(source, /staticPhotoWallAdjustment = staticPhotoWallReview && photoWallAdjustment/)
assert.match(source, /createStudioV2PhotoWallAdjustment/)
assert.match(page, /photoWallAdjustment: photoWallAdjustmentEnabled/)
assert.match(page, /data-photo-wall-adjustment=/)
assert.doesNotMatch(adjustmentSource, /validateCommit|RELEASE TO VALIDATE|WOULD BE .* HIDDEN/)
assert.match(adjustmentSource, /editableRecords = records\.filter\(\(\{ id \}\) => realPhotoIds\.has\(id\)\)/)
assert.match(adjustmentSource, /localStorage\.setItem\(SNAPSHOT_STORAGE_KEY/)
assert.match(adjustmentSource, /data-field="rotation" step="0\.1"/)
assert.match(adjustmentSource, /data-action="rotate-down"/)
assert.match(adjustmentSource, /data-action="rotate-up"/)
assert.match(adjustmentSource, /rotationStep = event\.altKey \? 0\.1 : event\.shiftKey \? 3 : 1/)
assert.match(adjustmentSource, /rotationInput\.addEventListener\('input', onRotationInput\)/)
assert.match(adjustmentSource, /zOrder: rounded\(record\.zOrder\)/)

const stackingRecords = [
  { id: 'OLD', slotNumber: 1, zOrder: 0 },
  { id: 'NEW_A', slotNumber: 40, zOrder: 10 },
  { id: 'NEW_B', slotNumber: 41, zOrder: 10 },
]
const stackingChanges = bringStudioV2PhotoRecordToFront(stackingRecords, stackingRecords[0])
assert.equal(stackingRecords[0].zOrder, 1)
assert.equal(stackingRecords[1].zOrder, 0)
assert.equal(stackingRecords[2].zOrder, 0.5)
assert.deepEqual(new Set(stackingChanges.map(({ id }) => id)), new Set(['OLD', 'NEW_A', 'NEW_B']))

const baseCard = {
  height: 0.2,
  rotation: 0,
  width: 0.2,
  y: 50,
}
const protectedCard = {
  ...baseCard,
  id: 'OLD',
  slotNumber: 1,
  x: 50,
  zOrder: 0,
}
const clearSecondLayerCard = {
  ...baseCard,
  id: 'NEW',
  slotNumber: 40,
  x: 70,
  zOrder: 6,
}
const clearAudit = measureStudioV2PhotoWallOcclusion(
  [protectedCard, clearSecondLayerCard],
  100,
)
assert.equal(clearAudit.valid, true)
assert.equal(clearAudit.failures.length, 0)

const obscuringSecondLayerCard = {
  ...clearSecondLayerCard,
  x: 50.5,
}
const blockedAudit = measureStudioV2PhotoWallOcclusion(
  [protectedCard, obscuringSecondLayerCard],
  100,
)
assert.equal(blockedAudit.valid, false)
assert.ok(blockedAudit.maximumOcclusion > STUDIO_V2_PHOTO_OCCLUSION_LIMIT)
assert.deepEqual(blockedAudit.failures.map(({ id }) => id), ['OLD'])

console.log('Studio V2 Photo Wall manual adjustment smoke passed.')

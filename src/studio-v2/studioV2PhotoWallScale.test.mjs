import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  calculateStudioV2PolaroidLayout,
  calculateStudioV2PrintDimensions,
  STUDIO_V2_PHOTO_CARD_SCALE,
  STUDIO_V2_PHOTO_SCALE_PASS,
} from './studioV2PhotoPackaging.js'

assert.equal(STUDIO_V2_PHOTO_SCALE_PASS, 0.78)
assert.equal(STUDIO_V2_PHOTO_CARD_SCALE, 0.702)
assert.ok(Math.abs(STUDIO_V2_PHOTO_CARD_SCALE / 0.9 - STUDIO_V2_PHOTO_SCALE_PASS) < 1e-12)

for (const aspect of [0.75, 1, 1.5]) {
  const print = calculateStudioV2PrintDimensions(aspect, 'medium')
  const polaroid = calculateStudioV2PolaroidLayout(aspect, 'medium', 1)
  assert.ok(Math.abs(print.width * STUDIO_V2_PHOTO_CARD_SCALE / print.width - 0.702) < 1e-12)
  assert.ok(Math.abs(print.height * STUDIO_V2_PHOTO_CARD_SCALE / print.height - 0.702) < 1e-12)
  assert.ok(Math.abs(polaroid.dimensions.width * STUDIO_V2_PHOTO_CARD_SCALE / polaroid.dimensions.width - 0.702) < 1e-12)
  assert.ok(Math.abs(polaroid.dimensions.height * STUDIO_V2_PHOTO_CARD_SCALE / polaroid.dimensions.height - 0.702) < 1e-12)
  assert.equal(polaroid.top, polaroid.side)
  assert.ok(polaroid.bottom > polaroid.top)
}

const packagingSource = fs.readFileSync('src/studio-v2/studioV2PhotoPackaging.js', 'utf8')
assert.match(
  packagingSource,
  /card\.group\.scale\.setScalar\(STUDIO_V2_PHOTO_CARD_SCALE \/ boardScale\)/,
)

console.log('Studio V2 photo-wall current×0.78 / base×0.702 scale smoke passed.')

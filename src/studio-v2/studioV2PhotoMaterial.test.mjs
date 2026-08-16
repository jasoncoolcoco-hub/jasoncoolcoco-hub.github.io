import assert from 'node:assert/strict'
import {
  calculateStudioV2PolaroidLayout,
  STUDIO_V2_PHOTO_CARD_SCALE,
  STUDIO_V2_PHOTO_MATERIAL_PROFILE,
  STUDIO_V2_PHOTO_SCALE_PASS,
  STUDIO_V2_POLAROID_VARIANTS,
} from './studioV2PhotoPackaging.js'

assert.equal(STUDIO_V2_PHOTO_SCALE_PASS, 0.78)
assert.equal(STUDIO_V2_PHOTO_CARD_SCALE, 0.702)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.printBorderWidth >= 0.006)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness >= 0.012)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness < 0.015)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperEdgeRoughness >= 0.95)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness >= 0.6)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness < STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperEdgeRoughness)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoat < 0.06)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoatRoughness >= 0.88)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity > 0.4)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity < 0.55)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowMargin < 0.018)

for (let slotNumber = 1; slotNumber <= STUDIO_V2_POLAROID_VARIANTS.length; slotNumber += 1) {
  const layout = calculateStudioV2PolaroidLayout(1.5, 'medium', slotNumber)
  assert.equal(layout.top, layout.side)
  assert.ok(layout.bottom > layout.top * 3)
  assert.ok(layout.bottom < layout.top * 4)
}

console.log('Studio V2 photo border proportions and restrained material smoke passed.')

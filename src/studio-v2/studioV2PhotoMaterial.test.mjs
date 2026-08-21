import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  calculateStudioV2PolaroidLayout,
  STUDIO_V2_PHOTO_CARD_SCALE,
  STUDIO_V2_PHOTO_MATERIAL_PROFILE,
  STUDIO_V2_PHOTO_SCALE_PASS,
  STUDIO_V2_POLAROID_VARIANTS,
} from './studioV2PhotoPackaging.js'

const packagingSource = readFileSync(new URL('./studioV2PhotoPackaging.js', import.meta.url), 'utf8')

assert.equal(STUDIO_V2_PHOTO_SCALE_PASS, 0.78)
assert.equal(STUDIO_V2_PHOTO_CARD_SCALE, 0.702)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.printBorderWidth >= 0.006)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness >= 0.012)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness < 0.015)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperEdgeRoughness >= 0.95)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness >= 0.7)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness < STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperEdgeRoughness)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageEnvMapIntensity <= 0.04)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity > 0.4)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity < 0.55)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowMargin < 0.018)
assert.match(
  packagingSource,
  /mesh\.name = 'PHOTO_IMAGE_SURFACE'[\s\S]*?mesh\.castShadow = false[\s\S]*?mesh\.receiveShadow = false/,
)
assert.match(
  packagingSource,
  /shadow\.name = 'PHOTO_CONTACT_SHADOW'[\s\S]*?shadow\.castShadow = false[\s\S]*?shadow\.receiveShadow = false/,
)
assert.match(packagingSource, /new THREE\.MeshBasicMaterial\(\{[\s\S]*?map: texture/)
assert.match(packagingSource, /photoCardRepresentation: 'independent-opaque-stable-plane'/)
assert.match(packagingSource, /representationHandoff: false/)
assert.match(packagingSource, /uniform vec4 studioV2ImageRect/)
assert.match(packagingSource, /fwidth\(vMapUv\.x\)/)
assert.match(packagingSource, /studioV2PhotoCoverage = smoothstep/)
assert.doesNotMatch(packagingSource, /PHOTO_PAPER_BODY/)
assert.doesNotMatch(packagingSource, /RoundedBoxGeometry/)
assert.doesNotMatch(packagingSource, /MeshPhysicalMaterial/)
assert.doesNotMatch(packagingSource, /roughnessMap:/)
assert.doesNotMatch(packagingSource, /bumpMap:/)
assert.doesNotMatch(packagingSource, /clearcoat:/)

for (let slotNumber = 1; slotNumber <= STUDIO_V2_POLAROID_VARIANTS.length; slotNumber += 1) {
  const layout = calculateStudioV2PolaroidLayout(1.5, 'medium', slotNumber)
  assert.equal(layout.top, layout.side)
  assert.ok(layout.bottom > layout.top * 3)
  assert.ok(layout.bottom < layout.top * 4)
}

console.log('Studio V2 stable independent photo-card material smoke passed.')

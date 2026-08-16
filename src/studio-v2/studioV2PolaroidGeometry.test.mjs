import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import {
  calculateStudioV2PolaroidLayout,
  STUDIO_V2_PHOTO_MATERIAL_PROFILE,
  STUDIO_V2_POLAROID_VARIANTS,
} from './studioV2PhotoPackaging.js'

const tolerance = 1e-10
const geometryTolerance = 1e-7

for (const aspect of [0.75, 1, 1.5]) {
  for (let slot = 1; slot <= STUDIO_V2_POLAROID_VARIANTS.length; slot += 1) {
    const layout = calculateStudioV2PolaroidLayout(aspect, 'medium', slot)
    const halfWidth = layout.dimensions.width / 2
    const halfHeight = layout.dimensions.height / 2
    const imageLeft = -layout.windowDimensions.width / 2
    const imageRight = layout.windowDimensions.width / 2
    const imageTop = layout.windowOffsetY + layout.windowDimensions.height / 2
    const imageBottom = layout.windowOffsetY - layout.windowDimensions.height / 2

    assert.ok(Math.abs(imageLeft - -halfWidth - layout.side) < tolerance)
    assert.ok(Math.abs(halfWidth - imageRight - layout.side) < tolerance)
    assert.ok(Math.abs(halfHeight - imageTop - layout.top) < tolerance)
    assert.ok(Math.abs(imageBottom - -halfHeight - layout.bottom) < tolerance)
    assert.equal(layout.top, layout.side)
    assert.ok(layout.bottom > layout.top)

    const geometry = new RoundedBoxGeometry(
      layout.dimensions.width,
      layout.dimensions.height,
      STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness,
      2,
      0.0019,
    )
    geometry.computeBoundingBox()
    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    assert.ok(Math.abs(size.x - layout.dimensions.width) < geometryTolerance)
    assert.ok(Math.abs(size.y - layout.dimensions.height) < geometryTolerance)
    assert.ok(Math.abs(size.z - STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness) < geometryTolerance)
    geometry.dispose()
  }
}

const matrix = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0, 0.02),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0.03, -0.04, 0.12)),
  new THREE.Vector3(1.012, 1.012, 1.012),
)
const elements = matrix.elements
const basisX = new THREE.Vector3(elements[0], elements[1], elements[2])
const basisY = new THREE.Vector3(elements[4], elements[5], elements[6])
const basisZ = new THREE.Vector3(elements[8], elements[9], elements[10])
assert.ok(Math.abs(basisX.clone().normalize().dot(basisY.clone().normalize())) < tolerance)
assert.ok(Math.abs(basisX.clone().normalize().dot(basisZ.clone().normalize())) < tolerance)
assert.ok(Math.abs(basisY.clone().normalize().dot(basisZ.clone().normalize())) < tolerance)
assert.ok(Math.abs(basisX.length() - basisY.length()) < tolerance)
assert.ok(Math.abs(basisY.length() - basisZ.length()) < tolerance)

const packagingSource = fs.readFileSync('src/studio-v2/studioV2PhotoPackaging.js', 'utf8')
assert.match(packagingSource, /rigidCard\.name = 'PHOTO_RIGID_CARD'/)
assert.match(packagingSource, /rigidCard\.add\(createPaperBody/)
assert.match(packagingSource, /rigidCard\.add\(surface\)/)
assert.match(packagingSource, /group\.add\(rigidCard\)/)

console.log('Studio V2 rectangular Polaroid geometry and rigid transform smoke passed.')

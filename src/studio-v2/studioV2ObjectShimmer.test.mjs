import assert from 'node:assert/strict'
import fs from 'node:fs'

const expansionSource = fs.readFileSync(
  new URL('./studioV2SceneExpansion.js', import.meta.url),
  'utf8',
)
const placedObjectsSource = fs.readFileSync(
  new URL('./studioV2PlacedObjects.js', import.meta.url),
  'utf8',
)

assert.match(expansionSource, /SHADOW_FREE_BODY_WITH_DEPTH_BIASED_SURFACE_DETAILS/)
assert.match(expansionSource, /planarDepthThreshold: 0\.00025/)
assert.match(expansionSource, /polygonOffsetFactor: -1/)
assert.match(expansionSource, /polygonOffsetUnits: -1/)
assert.match(expansionSource, /material\.normalScale\.setScalar\(0\.18\)/)
assert.match(expansionSource, /object\.castShadow = isPolaroidCamera/)
assert.match(expansionSource, /object\.receiveShadow = isPolaroidCamera/)

assert.match(placedObjectsSource, /SHADOW_FREE_THIN_OBJECT/)
assert.match(placedObjectsSource, /const isMacbook = anchorName === 'MACBOOK_ISLAND_01'/)
assert.match(placedObjectsSource, /object\.castShadow = isMacbook/)
assert.match(placedObjectsSource, /object\.receiveShadow = isMacbook/)
assert.match(placedObjectsSource, /id: 'macbook-aluminium-deck'[\s\S]*?normalScale: 0\.18[\s\S]*?roughness: 0\.48/)
assert.match(placedObjectsSource, /id: 'macbook-display-glass'[\s\S]*?envMapIntensity: 0\.1[\s\S]*?normalScale: 0[\s\S]*?roughness: 0\.46/)
assert.match(placedObjectsSource, /id: 'macbook-hinge'[\s\S]*?envMapIntensity: 0\.62[\s\S]*?normalScale: 0\.12[\s\S]*?roughness: 0\.5/)

console.log('Studio V2 Polaroid and MacBook shimmer stabilization smoke passed.')

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
const sceneConfigSource = fs.readFileSync(
  new URL('./studioV2Config.js', import.meta.url),
  'utf8',
)
const sceneSource = fs.readFileSync(
  new URL('./createStudioV2Scene.js', import.meta.url),
  'utf8',
)
const materialTuningSource = fs.readFileSync(
  new URL('./studioV2MaterialTuning.js', import.meta.url),
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
assert.match(placedObjectsSource, /id: 'macbook-aluminium-deck'[\s\S]*?envMapIntensity: 0\.68[\s\S]*?normalScale: 0\.18[\s\S]*?roughness: 0\.48/)
assert.match(placedObjectsSource, /id: 'macbook-display-glass'[\s\S]*?envMapIntensity: 0\.1[\s\S]*?normalScale: 0[\s\S]*?roughness: 0\.46/)
assert.match(placedObjectsSource, /id: 'macbook-hinge'[\s\S]*?envMapIntensity: 0\.62[\s\S]*?normalScale: 0\.12[\s\S]*?roughness: 0\.5/)
assert.match(sceneConfigSource, /StudioV2KitchenMetal: \{[\s\S]*?metalness: 0\.78[\s\S]*?roughness: 0\.4[\s\S]*?envMapIntensity: 0\.96[\s\S]*?normalScale: 0\.28/)
assert.match(sceneSource, /const casters = new Set\(\[[\s\S]*?'StudioV2KitchenMetal'/)
assert.match(materialTuningSource, /color: '#111110'/)
assert.match(materialTuningSource, /toneMapped: false/)
assert.doesNotMatch(materialTuningSource, /StudioV2KitchenSinkStable|detachedVariants/)
assert.doesNotMatch(placedObjectsSource, /createStableComponentGeometry|minimumComponentTriangles/)
assert.doesNotMatch(expansionSource, /createStableComponentGeometry|minimumComponentTriangles/)

console.log('Studio V2 accepted MacBook, kitchen metal, and cabinet seam baseline smoke passed.')

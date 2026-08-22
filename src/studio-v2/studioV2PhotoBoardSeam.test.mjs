import assert from 'node:assert/strict'
import fs from 'node:fs'

const expansionSource = fs.readFileSync(
  new URL('./studioV2SceneExpansion.js', import.meta.url),
  'utf8',
)

assert.match(expansionSource, /architecture: 'TWO_TRIANGLE_CORK_SURFACE_FLUSH_WITH_FRAME'/)
assert.match(expansionSource, /surfaceHeight: 0\.94/)
assert.match(expansionSource, /surfaceWidth: 1\.94/)
assert.match(expansionSource, /surfaceZ: 0\.01255/)
assert.match(expansionSource, /isPhotoBoardSurface[\s\S]*?createStablePhotoBoardSurfaceGeometry\(\)/)
assert.match(expansionSource, /role !== 'photo' && role !== 'photoBoard'/)
assert.match(expansionSource, /object\.receiveShadow = isPolaroidCamera[\s\S]*?: true/)
assert.doesNotMatch(expansionSource, /photoBoardSeamIsolation/)

console.log('Studio V2 Photo Wall cork/frame seam stabilization smoke passed.')

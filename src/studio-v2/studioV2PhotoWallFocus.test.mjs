import assert from 'node:assert/strict'
import fs from 'node:fs'

const poses = fs.readFileSync('src/studio-v2/studioV2CameraPoses.js', 'utf8')
const director = fs.readFileSync('src/studio-v2/studioV2CameraDirector.js', 'utf8')
const interaction = fs.readFileSync('src/studio-v2/studioV2PhotoWallFocus.js', 'utf8')
const scene = fs.readFileSync('src/studio-v2/createStudioV2Scene.js', 'utf8')

for (const state of [
  'PHOTO_WALL_FOCUS_TRANSITION',
  'PHOTO_WALL_FOCUS',
  'PHOTO_WALL_EXIT_TRANSITION',
]) {
  assert.match(poses, new RegExp(`${state}: '${state}'`))
}

assert.match(poses, /const acceptedPhotoWallReview = STUDIO_V2_CAMERA_PRESETS\.PHOTO_WALL_REVIEW/)
assert.match(poses, /export const STUDIO_V2_PHOTO_WALL_FOCUS_POSE/)
assert.match(interaction, /return state === STUDIO_V2_CAMERA_STATES\.TABLE_FREE_ORBIT/)
assert.match(interaction, /raycaster\.intersectObject\(photoBoardRoot, true\)/)
assert.match(interaction, /event\.key === 'Escape'/)
assert.match(interaction, /isInteractionLocked\(\)/)
assert.match(interaction, /BLOCKED_PHOTO_DETAIL/)
assert.match(interaction, /BLOCKED_PHOTO_ASSETS/)
assert.match(interaction, /orbit: false, yaw: false, pitch: false, pan: false, zoom: false/)

assert.match(director, /state = STUDIO_V2_CAMERA_STATES\.PHOTO_WALL_FOCUS_TRANSITION/)
assert.match(director, /exactFov: true/)
assert.match(director, /state = STUDIO_V2_CAMERA_STATES\.PHOTO_WALL_FOCUS/)
assert.match(director, /controls\.enabled = false/)
assert.match(director, /state = STUDIO_V2_CAMERA_STATES\.PHOTO_WALL_EXIT_TRANSITION/)
assert.match(director, /transitionTo\(STUDIO_V2_TABLE_OVERVIEW_POSE/)
assert.match(director, /enterTableFreeOrbit\(\)/)

assert.match(scene, /createStudioV2PhotoWallFocus\(\{/)
assert.match(scene, /getObjectByName\(STUDIO_V2_SCENE_EXPANSION_IDS\.photoBoard\)/)
assert.match(scene, /requestPhotoWallFocus\(source = 'RUNTIME'\)/)
assert.match(scene, /closePhotoWallFocus\(source = 'RUNTIME'\)/)
assert.match(scene, /createStudioV2PhotoDetail\(\{/)
assert.match(scene, /photoDetail\?\.update\(time\)/)

console.log('Studio V2 photo-wall camera-flow smoke passed.')

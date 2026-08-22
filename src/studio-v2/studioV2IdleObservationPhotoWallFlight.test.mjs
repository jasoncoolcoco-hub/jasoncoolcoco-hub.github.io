import assert from 'node:assert/strict'
import fs from 'node:fs'

function source(name) {
  return fs.readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')
}

const ambient = source('studioV2AmbientCamera.js')
const director = source('studioV2CameraDirector.js')
const focus = source('studioV2PhotoWallFocus.js')
const macbook = source('studioV2MacbookFocus.js')
const poses = source('studioV2CameraPoses.js')
const scene = source('createStudioV2Scene.js')

assert.match(poses, /IDLE_OBSERVATION: 'IDLE_OBSERVATION'/)
assert.match(ambient, /macbookAttentionMeters: 0\.055/)
assert.match(ambient, /maximumYawRadians: THREE\.MathUtils\.degToRad\(0\.34\)/)
assert.match(ambient, /maximumPitchRadians: THREE\.MathUtils\.degToRad\(0\.18\)/)
assert.doesNotMatch(ambient, /openingHoldMs/)

const idleUpdate = director.match(/function updateIdleObservation\(deltaMs\) \{[\s\S]*?\n  \}/)?.[0] ?? ''
assert.match(idleUpdate, /baseRailPosition\.fromArray\(STUDIO_V2_ROOM_WIDE_START_POSE\.position\)/)
assert.match(idleUpdate, /entryBlend = 1 - Math\.exp\(-seconds \/ observation\.entryBlendSeconds\)/)
assert.match(idleUpdate, /baseRailTarget\.x \+= observation\.macbookAttentionMeters/)
assert.match(idleUpdate, /observationYaw/)
assert.match(idleUpdate, /observationPitch/)
assert.doesNotMatch(idleUpdate, /camera\.position\.(?:add|lerp)|applyRailPose/)

const ambientUpdate = director.match(/function updateAmbient\(time, deltaMs\) \{[\s\S]*?\n  \}/)?.[0] ?? ''
assert.match(ambientUpdate, /state === STUDIO_V2_CAMERA_STATES\.IDLE_OBSERVATION/)
assert.match(ambientUpdate, /updateIdleObservation\(deltaMs\)/)
assert.doesNotMatch(ambientUpdate, /driftElapsedMs \+ deltaMs|applyRailPose/)

assert.match(director, /photoWallFocusSourcePose = getCurrentPose\(\)/)
assert.match(director, /flightDistance = camera\.position\.distanceTo\(destination\)/)
assert.match(director, /1250 \+ flightDistance \* 110/)
assert.match(focus, /STUDIO_V2_CAMERA_STATES\.IDLE_OBSERVATION/)
assert.match(macbook, /'ROOM_WIDE_START', 'IDLE_OBSERVATION', 'AMBIENT_DRIFT'/)
assert.match(focus, /camera\.position\.clone\(\)[\s\S]*?\.lerp\(destination, 0\.55\)/)
assert.match(focus, /intermediatePosition,/)
assert.match(director, /easing: 'smootherstep'/)
assert.match(director, /orientationBlend: true/)
assert.match(director, /\.slerp\(transition\.orientation\.to, eased\)/)
assert.match(director, /function requestOpeningReturn\(options = \{\}\)/)
assert.match(director, /state = STUDIO_V2_CAMERA_STATES\.IDLE_OBSERVATION[\s\S]*?updateIdleObservation\(0\)/)
assert.match(macbook, /openingReturnTargets/)
assert.match(macbook, /raycaster\.intersectObjects\(target, true\)/)
assert.match(macbook, /createMacbookDistanceMaterialStabilizer/)
assert.match(macbook, /smoothstep\(distance, 0\.45, 1\.15\)/)
assert.match(macbook, /\.lerp\(destination, 0\.56\)/)
assert.match(scene, /object\.userData\.studioV2SemanticId = 'RETURN_TO_OPENING'/)
assert.match(scene, /findOpeningReturnStoolTargets\(modelRoot\)/)
assert.doesNotMatch(scene, /STOOL_SIDE_OPENING_RETURN_TARGET/)

const packaging = source('studioV2PhotoPackaging.js')
const textureSwap = packaging.match(/function applyTexture\(card, texture\) \{[\s\S]*?\n  \}/)?.[0] ?? ''
assert.doesNotMatch(textureSwap, /needsUpdate/)
assert.match(packaging, /renderer\.initTexture\?\.\(loaded\.texture\)/)

assert.match(poses, /position: Object\.freeze\(\[\.\.\.acceptedPhotoWallReview\.position\]\)/)
assert.doesNotMatch(scene, /AmbientThresholdDiagnostic|ambientThresholdDiagnostic/)

console.log('Studio V2 idle observation + current-point Photo Wall flight smoke passed.')

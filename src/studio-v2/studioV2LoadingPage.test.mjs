import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  createStudioV2EntryGate,
  ENTRY_READY_CONDITIONS,
  STUDIO_V2_ENTRY_PROGRESS_WEIGHTS,
} from './studioV2EntryGate.js'
import {
  STUDIO_V2_LOADING_STAGES,
  studioV2LoadingStage,
} from './studioV2LoadingProgress.js'

const deliveryConfig = {
  roomUrl: '/room.glb',
  macbookUrl: '/macbook.glb',
  photoBoardUrl: '/board.glb',
  polaroidCameraUrl: '/camera.glb',
  photoManifestUrl: '/photo-wall.json',
  speakerUrl: '/speaker.glb',
}

const gate = createStudioV2EntryGate({ deliveryConfig })
assert.equal(gate.snapshot().progress, 0)
assert.equal(gate.markAssetProgress('ROOM_ENVIRONMENT', 10).progress, 4.9)
assert.equal(gate.markAssetProgress('ROOM_ENVIRONMENT', 50).progress, 24.5)
assert.equal(gate.markAssetProgress('ROOM_ENVIRONMENT', 20).progress, 24.5)
assert.equal(gate.markAssetReady('ROOM_ENVIRONMENT').progress, 49)

gate.markAssetReady('MACBOOK_ISLAND_01')
gate.markAssetReady('PHOTO_BOARD_01')
gate.markAssetReady('POLAROID_CAMERA_01')
gate.markAssetReady('STANMORE_SPEAKER_01')
gate.markAssetReady('PHOTO_WALL_PHOTOS')
ENTRY_READY_CONDITIONS.forEach((condition) => gate.markCondition(condition))
assert.equal(gate.snapshot().progress, 100)

const totalWeight = Object.values(STUDIO_V2_ENTRY_PROGRESS_WEIGHTS).flatMap(Object.values)
  .reduce((total, weight) => total + weight, 0)
assert.equal(totalWeight, 100)
assert.deepEqual(STUDIO_V2_LOADING_STAGES.map(({ label }) => label), [
  'INITIALIZING SPACE',
  'PREPARING LIGHT',
  'DEVELOPING MEMORIES',
  'FINALIZING STUDIO',
  'READY',
])
assert.equal(studioV2LoadingStage(0).label, 'INITIALIZING SPACE')
assert.equal(studioV2LoadingStage(18).label, 'PREPARING LIGHT')
assert.equal(studioV2LoadingStage(55).label, 'DEVELOPING MEMORIES')
assert.equal(studioV2LoadingStage(88).label, 'FINALIZING STUDIO')
assert.equal(studioV2LoadingStage(99.9).label, 'FINALIZING STUDIO')
assert.equal(studioV2LoadingStage(100).label, 'READY')

const [component, page, styles, scene, placedObjects, sceneExpansion] = await Promise.all([
  readFile(new URL('./StudioV2Loading.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./StudioV2ImportPage.jsx', import.meta.url), 'utf8'),
  readFile(new URL('./studio-v2.css', import.meta.url), 'utf8'),
  readFile(new URL('./createStudioV2Scene.js', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2PlacedObjects.js', import.meta.url), 'utf8'),
  readFile(new URL('./studioV2SceneExpansion.js', import.meta.url), 'utf8'),
])

assert.match(component, /JASON PERSONAL WEBSITE/)
assert.match(component, /A PERSONAL DIGITAL SPACE/)
assert.match(component, /role="progressbar"/)
assert.match(component, /STUDIO_V2_LOADING_STAGES\.map/)
assert.match(page, /exiting=\{loadingExiting\}/)
assert.match(page, /ready=\{ready\}/)
assert.match(styles, /\.studio-v2__loading \{[\s\S]*background: #f7f7f5;/)
assert.match(styles, /\.studio-v2__loading-percentage span \{[\s\S]*font-size: clamp\(/)
assert.match(scene, /entryGate\.markAssetProgress\('ROOM_ENVIRONMENT', progressValue\)/)
assert.match(placedObjects, /onAssetProgress\?\.\(assetId, event\)/)
assert.match(sceneExpansion, /onAssetProgress\?\.\(id, event\)/)

console.log('Studio V2 real-progress loading page tests passed.')

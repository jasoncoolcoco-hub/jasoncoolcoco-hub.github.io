import assert from 'node:assert/strict'
import fs from 'node:fs'
import { STUDIO_V2_ANCHORS } from './studioV2Anchors.js'
import { STUDIO_V2_ASSET_PATHS } from './studioV2AssetPaths.js'
import { createStudioV2DeliveryConfig } from './studioV2DerivativeConfig.js'
import {
  STUDIO_V2_ASSET_TIERS,
  VISUAL_READY_ASSETS,
} from './studioV2EntryGate.js'

const speakerId = 'STANMORE_SPEAKER_01'
const speakerAnchor = STUDIO_V2_ANCHORS[speakerId]
const macbookAnchor = STUDIO_V2_ANCHORS.MACBOOK_ISLAND_01
const expansionSource = fs.readFileSync(
  new URL('./studioV2SceneExpansion.js', import.meta.url),
  'utf8',
)

assert.ok(speakerAnchor)
assert.deepEqual(speakerAnchor.position, [1.34, 1.417, -1.05])
assert.deepEqual(speakerAnchor.rotation, [0, -1.570796, 0])
assert.ok(Math.abs(speakerAnchor.position[1] - macbookAnchor.position[1]) <= 0.003)
assert.ok(Math.abs(speakerAnchor.position[2] - macbookAnchor.position[2]) >= 0.99)
assert.ok(Math.abs(speakerAnchor.position[2] - macbookAnchor.position[2]) <= 1.01)
assert.ok(speakerAnchor.position[0] > macbookAnchor.position[0])
assert.ok(speakerAnchor.position[0] < STUDIO_V2_ANCHORS.POLAROID_CAMERA_01.position[0])

assert.equal(
  STUDIO_V2_ASSET_PATHS.speaker,
  'models/fred-studio-v2/objects/marshall_stanmore_iii.glb',
)
assert.ok(fs.statSync(`public/${STUDIO_V2_ASSET_PATHS.speaker}`).size > 3_000_000)
assert.equal(createStudioV2DeliveryConfig().speakerUrl, `/${STUDIO_V2_ASSET_PATHS.speaker}`)
assert.equal(STUDIO_V2_ASSET_TIERS.visualReady.includes(speakerId), true)
assert.equal(VISUAL_READY_ASSETS.some(({ id }) => id === speakerId), true)

assert.match(expansionSource, /speaker: 'STANMORE_SPEAKER_01'/)
assert.match(expansionSource, /targetSize: 0\.35/)
assert.match(expansionSource, /FULL_GEOMETRY_SHADOW_FREE_TRILINEAR_SATIN/)
assert.match(expansionSource, /STUDIO_V2_SPEAKER_STABILITY_PROFILE = Object\.freeze\(\{[\s\S]*?castShadow: false/)
assert.match(expansionSource, /STUDIO_V2_SPEAKER_STABILITY_PROFILE = Object\.freeze\(\{[\s\S]*?disabledMaps:[\s\S]*?emissiveIntensity: 0[\s\S]*?envMapIntensity: 0\.12[\s\S]*?metalness: 0\.06[\s\S]*?normalScale: 0[\s\S]*?receiveShadow: false[\s\S]*?roughness: 0\.82[\s\S]*?textureAnisotropy: 1/)
assert.match(expansionSource, /createStaticPlacement\(speakerGltf, renderer, ASSET_CONFIG\.speaker/)
assert.doesNotMatch(expansionSource, /createStableComponentGeometry|minimumComponentTriangles/)
assert.doesNotMatch(expansionSource, /createStudioV2MarshallInteraction/)
assert.doesNotMatch(expansionSource, /createStudioV2RadioPanel/)

const speakerBuffer = fs.readFileSync(`public/${STUDIO_V2_ASSET_PATHS.speaker}`)
const speakerJsonLength = speakerBuffer.readUInt32LE(12)
const speakerGltf = JSON.parse(
  speakerBuffer.subarray(20, 20 + speakerJsonLength).toString().replace(/\u0000+$/, ''),
)
assert.equal(speakerGltf.meshes.length, 1)
assert.equal(speakerGltf.accessors[speakerGltf.meshes[0].primitives[0].indices].count, 30_681)

console.log('Studio V2 static Stanmore desk placement smoke passed.')

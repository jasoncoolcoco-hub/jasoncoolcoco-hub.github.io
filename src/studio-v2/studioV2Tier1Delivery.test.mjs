import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  isStudioV2CdnAssetPath,
  joinStudioV2AssetUrl,
  STUDIO_V2_ASSET_PATHS,
  STUDIO_V2_CDN_ASSET_PATHS,
  STUDIO_V2_TIER1_GLB_PATHS,
  STUDIO_V2_VISUAL_READY_GLB_PATHS,
} from './studioV2AssetPaths.js'
import { studioV2AssetBaseUrl, studioV2AssetUrl } from './studioV2AssetUrl.js'
import { createStudioV2DeliveryConfig } from './studioV2DerivativeConfig.js'
import {
  preloadStudioV2Tier1Assets,
  studioV2Tier1PreloadDescriptors,
} from './studioV2Tier1Preload.js'

const retiredPhotoWallBootstrapPath = 'studio-v2/photo-wall/photo-wall-room-bootstrap.jpg'

assert.equal(studioV2AssetBaseUrl({ assetBaseUrl: '', siteBaseUrl: '/' }), '/')
assert.equal(
  studioV2AssetUrl(STUDIO_V2_ASSET_PATHS.room, {
    assetBaseUrl: 'https://cdn.example.com/fred-studio/v1',
    siteBaseUrl: '/',
  }),
  'https://cdn.example.com/fred-studio/v1/models/fred-studio-v2/optimised/meshopt/room_meshopt.glb',
)
assert.equal(isStudioV2CdnAssetPath(STUDIO_V2_ASSET_PATHS.photoManifest), true)
assert.equal(isStudioV2CdnAssetPath(STUDIO_V2_ASSET_PATHS.polaroidCamera), true)
assert.equal(isStudioV2CdnAssetPath('models/fred-studio-v2/objects/coffee_cup.glb'), false)
assert.equal(isStudioV2CdnAssetPath('models/fred-studio-v2/objects/document_file_folder.glb'), false)
assert.equal(isStudioV2CdnAssetPath('models/fred-studio-v2/optimised/meshopt/marshall_amp_conservative_meshopt.glb'), false)
assert.equal(isStudioV2CdnAssetPath('models/fred-studio-v2/optimised/meshopt/gibson_guitar_conservative_meshopt.glb'), false)
assert.equal(isStudioV2CdnAssetPath('audio/fred-studio/catalog.published.json'), false)
assert.equal(
  studioV2AssetUrl('audio/fred-studio/catalog.published.json', {
    assetBaseUrl: 'https://cdn.example.com/fred-studio/v1',
    siteBaseUrl: '/',
  }),
  '/audio/fred-studio/catalog.published.json',
)
assert.equal(
  studioV2AssetUrl(STUDIO_V2_ASSET_PATHS.polaroidCamera, {
    assetBaseUrl: 'https://cdn.example.com/fred-studio/v1',
    siteBaseUrl: '/',
  }),
  'https://cdn.example.com/fred-studio/v1/models/fred-studio-v2/objects/polaroid_camera.glb',
)
assert.equal(
  studioV2AssetUrl(STUDIO_V2_ASSET_PATHS.room, {
    assetBaseUrl: 'https://cdn.example.com/fred-studio/v1',
    assetCacheKey: 'browser cold / edge cold',
    siteBaseUrl: '/',
  }),
  'https://cdn.example.com/fred-studio/v1/models/fred-studio-v2/optimised/meshopt/room_meshopt.glb?stage5g2=browser%20cold%20%2F%20edge%20cold',
)
assert.equal(
  studioV2AssetUrl('audio/fred-studio/catalog.published.json', {
    assetBaseUrl: 'https://cdn.example.com/fred-studio/v1',
    assetCacheKey: 'browser-cold',
    siteBaseUrl: '/',
  }),
  '/audio/fred-studio/catalog.published.json',
)
assert.equal(joinStudioV2AssetUrl('/asset.glb', '/subpath'), '/subpath/asset.glb')

const delivery = createStudioV2DeliveryConfig({}, false)
assert.equal(delivery.roomUrl, `/${STUDIO_V2_ASSET_PATHS.room}`)
assert.equal(delivery.macbookUrl, `/${STUDIO_V2_ASSET_PATHS.macbook}`)
assert.equal(delivery.photoManifestUrl, `/${STUDIO_V2_ASSET_PATHS.photoManifest}`)
assert.equal('photoWallBootstrapUrl' in delivery, false)
assert.deepEqual(STUDIO_V2_TIER1_GLB_PATHS, [
  STUDIO_V2_ASSET_PATHS.room,
  STUDIO_V2_ASSET_PATHS.macbook,
])
assert.deepEqual(STUDIO_V2_VISUAL_READY_GLB_PATHS, [
  STUDIO_V2_ASSET_PATHS.polaroidCamera,
])

assert.equal(isStudioV2CdnAssetPath(retiredPhotoWallBootstrapPath), false)

const builtHtml = fs.readFileSync('dist/index.html', 'utf8')
assert.equal(builtHtml.includes('model/gltf-binary'), false)
const preloadDescriptors = studioV2Tier1PreloadDescriptors((path) => `/${path}`)
assert.deepEqual(
  preloadDescriptors.map(({ href }) => href),
  STUDIO_V2_TIER1_GLB_PATHS.map((path) => `/${path}`),
)
assert.equal(new Set(preloadDescriptors.map(({ href }) => href)).size, 2)
assert.deepEqual(preloadDescriptors.map(({ fetchPriority }) => fetchPriority), [
  'high', 'auto',
])
preloadDescriptors.forEach((descriptor) => {
  assert.equal(descriptor.as, 'fetch')
  assert.equal(descriptor.crossOrigin, 'anonymous')
  assert.equal(descriptor.type, 'model/gltf-binary')
})
const preloadElements = new Map()
const fakeDocument = {
  createElement: () => ({ dataset: {} }),
  getElementById: (id) => preloadElements.get(id) ?? null,
  head: {
    append: (element) => preloadElements.set(element.id, element),
  },
}
assert.equal(preloadStudioV2Tier1Assets(fakeDocument).length, 2)
assert.equal(preloadStudioV2Tier1Assets(fakeDocument).length, 2)
assert.equal(preloadElements.size, 2)

const photoManifest = JSON.parse(fs.readFileSync('public/studio-v2/photo-wall/manifest.json', 'utf8'))
const activePhotos = photoManifest.photos.filter(
  ({ enabled, x, y }) => enabled && Number.isFinite(x) && Number.isFinite(y),
)
const fullPhotoBytes = activePhotos.reduce((total, { generatedFilename }) => (
  total + fs.statSync(`public/studio-v2/photo-wall/${generatedFilename}`).size
), 0)
assert.equal(activePhotos.length, 70)
assert.equal(fullPhotoBytes, 46_645_984)

const tierPath = (photo, tier) => {
  const stem = photo.generatedFilename.split('/').pop().replace(/\.[^.]+$/, '')
  return `${photoManifest.qualityTiers[tier].directory}/${stem}.jpg`
}
const roomPhotoBytes = activePhotos.reduce((total, photo) => (
  total + fs.statSync(`public/studio-v2/photo-wall/${tierPath(photo, 'room')}`).size
), 0)
const focusPhotoBytes = activePhotos.reduce((total, photo) => (
  total + fs.statSync(`public/studio-v2/photo-wall/${tierPath(photo, 'focus')}`).size
), 0)
assert.equal(roomPhotoBytes, 1_055_932)
assert.equal(focusPhotoBytes, 10_507_471)

const activeRuntimePaths = [
  ...STUDIO_V2_CDN_ASSET_PATHS,
  ...activePhotos.map((photo) => `studio-v2/photo-wall/${tierPath(photo, 'room')}`),
]
const activeRuntimeBytes = activeRuntimePaths.reduce(
  (total, path) => total + fs.statSync(`public/${path}`).size,
  0,
)
assert.equal(activeRuntimePaths.length, 75)
assert.equal(
  activeRuntimeBytes,
  35_423_787,
)

const sceneSource = fs.readFileSync('src/studio-v2/createStudioV2Scene.js', 'utf8')
const expansionSource = fs.readFileSync('src/studio-v2/studioV2SceneExpansion.js', 'utf8')
const readyIndex = sceneSource.indexOf('entryGate.markSceneReady()')
const visualReadyIndex = sceneSource.indexOf('entryGate.markVisualReady(', readyIndex)
const readyCallbackIndex = sceneSource.indexOf('onReady?.(audit)', visualReadyIndex)
const roomPhotoIndex = expansionSource.indexOf('const photoPackaging = await createRoomPhotoPackaging()')
const photoReadyIndex = expansionSource.indexOf("onAssetReady?.('PHOTO_WALL_PHOTOS'", roomPhotoIndex)
assert.equal(readyIndex > -1, true)
assert.equal(visualReadyIndex > readyIndex, true)
assert.equal(readyCallbackIndex > visualReadyIndex, true)
assert.equal(roomPhotoIndex > -1, true)
assert.equal(photoReadyIndex > roomPhotoIndex, true)
assert.equal(sceneSource.includes('sceneExpansionResource.loadVisualReadyAssets()'), true)
assert.equal(sceneSource.includes('sceneExpansionResource.preloadPhotoWallFocusQuality()'), true)
assert.equal(sceneSource.includes('sceneExpansionResource.loadDeferredAssets()'), false)
assert.equal(sceneSource.includes('loadFullPhotoWall'), false)
assert.equal(expansionSource.includes('createStudioV2PhotoWallBootstrap'), false)
assert.equal(expansionSource.includes('photoWallBootstrapUrl'), false)
assert.equal(expansionSource.includes('group.visible = false'), false)
assert.equal((expansionSource.match(/photoBoardPlacement\.placement\.add\(photoPackaging\.group\)/g) ?? []).length, 1)

console.log('Studio V2 Tier 1 delivery prototype smoke test passed.')

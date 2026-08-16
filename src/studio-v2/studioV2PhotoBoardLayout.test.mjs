import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {
  boardCoordinatesToStudioV2Position,
  createStudioV2PhotoBoardCoordinateOverlay,
  resolveStudioV2PhotoBoardCoordinates,
  studioV2PhotoBoardGridEnabled,
  studioV2PhotoSlotOverlayEnabled,
  studioV2PhotoWallDebugPanelEnabled,
  studioV2PhotoWallReviewEnabled,
  STUDIO_V2_PHOTO_BOARD_DEPTH,
  STUDIO_V2_PHOTO_BOARD_SURFACE,
} from './studioV2PhotoBoardLayout.js'
import {
  calculateStudioV2PrintDimensions,
  calculateStudioV2PolaroidLayout,
  resolveStudioV2PhotoManifest,
  resolveStudioV2PolaroidVariant,
  STUDIO_V2_PHOTO_CARD_SCALE,
  STUDIO_V2_PHOTO_MATERIAL_PROFILE,
  STUDIO_V2_POLAROID_VARIANTS,
} from './studioV2PhotoPackaging.js'
import { readStudioV2PhotoMetadata } from '../../scripts/intake-studio-v2-photos.mjs'

function assertVector(actual, expected, tolerance = 1e-9) {
  expected.forEach((value, index) => {
    assert.ok(Math.abs(actual.getComponent(index) - value) <= tolerance, `${actual.toArray()} != ${expected}`)
  })
}

const topLeft = boardCoordinatesToStudioV2Position({ x: 0, y: 0 })
const bottomRight = boardCoordinatesToStudioV2Position({ x: 100, y: 100 })
const center = boardCoordinatesToStudioV2Position({ x: 50, y: 50 })
assertVector(topLeft, [-0.0205, -0.0205, 0.0013])
assertVector(bottomRight, [-1.3295, -0.6545, 0.0013])
assertVector(center, [-0.675, -0.3375, 0.0013])

const board = new THREE.Group()
board.position.set(4.975, 2.5575, -5.075)
board.scale.setScalar(2)
assertVector(
  boardCoordinatesToStudioV2Position({ x: 0, y: 0, space: 'world', boardObject: board }),
  [4.934, 2.5165, -5.0724],
)
assertVector(
  boardCoordinatesToStudioV2Position({ x: 100, y: 100, space: 'world', boardObject: board }),
  [2.316, 1.2485, -5.0724],
)
assertVector(
  boardCoordinatesToStudioV2Position({ x: 50, y: 50, space: 'world', boardObject: board }),
  [3.625, 1.8825, -5.0724],
)

const baseDepth = boardCoordinatesToStudioV2Position({ x: 50, y: 50, zOrder: 0, space: 'world', boardObject: board }).z
const overlapDepth = boardCoordinatesToStudioV2Position({ x: 50, y: 50, zOrder: 1, space: 'world', boardObject: board }).z
assert.ok(Math.abs(overlapDepth - baseDepth - STUDIO_V2_PHOTO_BOARD_DEPTH.zOrderStepWorld) <= 1e-9)
assert.deepEqual(resolveStudioV2PhotoBoardCoordinates({ x: 999, y: -999, zOrder: 999 }), {
  x: 110,
  y: -10,
  zOrder: 10,
})

const landscape = calculateStudioV2PrintDimensions(1.5, 'medium')
const portrait = calculateStudioV2PrintDimensions(0.75, 'medium')
assert.ok(Math.abs(landscape.width / landscape.height - 1.5) <= 1e-12)
assert.ok(Math.abs(portrait.width / portrait.height - 0.75) <= 1e-12)
assert.ok(Math.abs(landscape.width * landscape.height - portrait.width * portrait.height) <= 1e-12)

for (let slotNumber = 1; slotNumber <= 3; slotNumber += 1) {
  const polaroid = calculateStudioV2PolaroidLayout(1.5, 'medium', slotNumber)
  assert.equal(polaroid.top, polaroid.side)
  assert.ok(polaroid.bottom > polaroid.top)
  assert.ok(polaroid.bottom > polaroid.side)
  assert.ok(polaroid.dimensions.width < landscape.width)
  assert.ok(Math.abs(polaroid.windowDimensions.width / polaroid.windowDimensions.height - 1.5) <= 1e-12)
}
assert.equal(new Set([1, 2, 3].map((slot) => resolveStudioV2PolaroidVariant(slot).id)).size, 3)
assert.equal(resolveStudioV2PolaroidVariant(1).id, resolveStudioV2PolaroidVariant(4).id)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness >= 0.007)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperBumpScale > 0)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness >= 0.6)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness <= 0.8)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoat > 0)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoat < 0.1)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoatRoughness > 0.75)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity > 0)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity < 0.6)
assert.ok(
  STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowBoardLift
    < STUDIO_V2_PHOTO_BOARD_DEPTH.baseOffsetWorld,
)
assert.ok(STUDIO_V2_POLAROID_VARIANTS.every(({ roughness }) => roughness >= 0.9))
assert.ok(STUDIO_V2_POLAROID_VARIANTS.every(({ edgeColor }) => /^#[0-9a-f]{6}$/i.test(edgeColor)))

assert.equal(studioV2PhotoBoardGridEnabled(new URLSearchParams('photoGrid=1'), true), true)
assert.equal(studioV2PhotoBoardGridEnabled(new URLSearchParams('photoGrid=1'), false), false)
assert.equal(studioV2PhotoBoardGridEnabled(new URLSearchParams(), true), false)
assert.equal(studioV2PhotoWallReviewEnabled(new URLSearchParams('photoWallReview=1'), true), true)
assert.equal(studioV2PhotoWallReviewEnabled(new URLSearchParams('photoWallReview=1'), false), false)
assert.equal(studioV2PhotoWallReviewEnabled(new URLSearchParams(), true), false)
assert.equal(studioV2PhotoSlotOverlayEnabled(new URLSearchParams('photoSlots=1'), true), true)
assert.equal(studioV2PhotoSlotOverlayEnabled(new URLSearchParams('photoSlots=1'), false), false)
assert.equal(studioV2PhotoSlotOverlayEnabled(new URLSearchParams(), true), false)
assert.equal(studioV2PhotoWallDebugPanelEnabled(new URLSearchParams(), true), true)
assert.equal(studioV2PhotoWallDebugPanelEnabled(new URLSearchParams('photoWallReview=1'), true), false)
assert.equal(studioV2PhotoWallDebugPanelEnabled(new URLSearchParams('photoWallReview=1&debugPanel=1'), true), true)
assert.equal(studioV2PhotoWallDebugPanelEnabled(new URLSearchParams('photoWallReview=1&debugPanel=1'), false), false)

globalThis.document = {
  createElement: () => ({
    getContext: () => ({
      clearRect() {},
      fillText() {},
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
    }),
    height: 0,
    width: 0,
  }),
}
const overlay = createStudioV2PhotoBoardCoordinateOverlay()
assert.equal(overlay.name, 'PHOTO_BOARD_COORDINATE_OVERLAY')
assert.equal(overlay.userData.developmentOnly, true)
assert.ok(overlay.children.length > 20)
delete globalThis.document

const manifest = JSON.parse(fs.readFileSync('public/studio-v2/photo-wall/manifest.json', 'utf8'))
const resolvedManifest = resolveStudioV2PhotoManifest(manifest)
const realPhotos = resolvedManifest.photos.filter(({ width, height }) => Number.isFinite(width) && Number.isFinite(height))
assert.equal(realPhotos.length, 39)
assert.equal(realPhotos.filter(({ orientation }) => orientation === 'landscape').length, 36)
assert.equal(realPhotos.filter(({ orientation }) => orientation === 'portrait').length, 3)
assert.ok(realPhotos.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)))
assert.deepEqual(realPhotos.map(({ slotNumber }) => slotNumber), Array.from({ length: 39 }, (_, index) => index + 1))
assert.equal(new Set(realPhotos.map(({ slotNumber }) => slotNumber)).size, 39)
assert.ok(realPhotos.every(({ filename }) => fs.existsSync(`public/studio-v2/photo-wall/source/${filename}`)))
assert.equal(resolvedManifest.packagingMode, 'all-polaroid')
assert.equal(resolvedManifest.normalizedSize, 'medium')
assert.equal(realPhotos.filter(({ style }) => style === 'print').length, 0)
assert.equal(realPhotos.filter(({ style }) => style === 'polaroid').length, 39)
assert.ok(realPhotos.every(({ size }) => size === 'medium'))
assert.ok(realPhotos.every(({ rotation }) => Math.abs(rotation) <= 4))

const cardBounds = []
for (const photo of realPhotos) {
  assert.ok(photo.generatedFilename?.startsWith('generated/'))
  const generatedPath = `public/studio-v2/photo-wall/${photo.generatedFilename}`
  assert.ok(fs.existsSync(generatedPath))
  const generated = readStudioV2PhotoMetadata(generatedPath)
  assert.ok(Math.max(generated.width, generated.height) <= 1920)
  assert.ok(Math.abs(generated.aspectRatio - photo.aspectRatio) <= 0.002)

  const aspect = photo.width / photo.height
  const layout = calculateStudioV2PolaroidLayout(aspect, photo.size, photo.slotNumber)
  assert.equal(layout.top, layout.side)
  assert.ok(layout.bottom > layout.top * 3)
  const { width: cardWidth, height: cardHeight } = layout.dimensions
  const radians = Math.abs(photo.rotation) * Math.PI / 180
  const rotatedWidth = (
    Math.abs(cardWidth * Math.cos(radians)) + Math.abs(cardHeight * Math.sin(radians))
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  const rotatedHeight = (
    Math.abs(cardWidth * Math.sin(radians)) + Math.abs(cardHeight * Math.cos(radians))
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  const halfBoardX = rotatedWidth / STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth * 50
  const halfBoardY = rotatedHeight / STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight * 50
  assert.ok(photo.x - halfBoardX >= 0 && photo.x + halfBoardX <= 100, `${photo.id} crosses the board's horizontal edge`)
  assert.ok(photo.y - halfBoardY >= 0 && photo.y + halfBoardY <= 100, `${photo.id} crosses the board's vertical edge`)
  cardBounds.push({
    halfBoardX,
    halfBoardY,
    id: photo.id,
    slotNumber: photo.slotNumber,
    x: photo.x,
    y: photo.y,
  })
}

for (let leftIndex = 0; leftIndex < cardBounds.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < cardBounds.length; rightIndex += 1) {
    const left = cardBounds[leftIndex]
    const right = cardBounds[rightIndex]
    const horizontalOverlap = Math.abs(left.x - right.x) < left.halfBoardX + right.halfBoardX
    const verticalOverlap = Math.abs(left.y - right.y) < left.halfBoardY + right.halfBoardY
    assert.ok(
      !(horizontalOverlap && verticalOverlap),
      `Photo slots ${left.slotNumber} and ${right.slotNumber} overlap.`,
    )
  }
}
assert.ok(resolvedManifest.photos.every((photo) => (
  ['x', 'y', 'rotation', 'size', 'zOrder', 'style', 'enabled'].every((field) => field in photo)
)))

console.log('Studio V2 photo-board coordinate smoke passed.')

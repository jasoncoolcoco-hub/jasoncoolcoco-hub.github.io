import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import {
  boardCoordinatesToStudioV2Position,
  createStudioV2PhotoBoardCoordinateOverlay,
  resolveStudioV2PhotoBoardCoordinates,
  studioV2PhotoBoardGridEnabled,
  studioV2PhotoSlotOverlayEnabled,
  studioV2PhotoWallAdjustmentEnabled,
  studioV2PhotoWallDebugPanelEnabled,
  studioV2PhotoWallReviewEnabled,
  STUDIO_V2_PHOTO_BOARD_DEPTH,
  STUDIO_V2_PHOTO_BOARD_SURFACE,
} from './studioV2PhotoBoardLayout.js'
import {
  calculateStudioV2PrintDimensions,
  calculateStudioV2PolaroidLayout,
  resolveStudioV2PhotoManifest,
  resolveStudioV2PhotoTierPath,
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
assert.equal(STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperBumpScale, undefined)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness >= 0.6)
assert.ok(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageRoughness <= 0.8)
assert.equal(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoat, undefined)
assert.equal(STUDIO_V2_PHOTO_MATERIAL_PROFILE.imageClearcoatRoughness, undefined)
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
assert.equal(studioV2PhotoWallAdjustmentEnabled(new URLSearchParams('photoWallReview=1&photoWallAdjust=1'), true), true)
assert.equal(studioV2PhotoWallAdjustmentEnabled(new URLSearchParams('photoWallAdjust=1'), true), false)
assert.equal(studioV2PhotoWallAdjustmentEnabled(new URLSearchParams('photoWallReview=1&photoWallAdjust=1'), false), false)
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
const intakePhotos = resolvedManifest.photos.filter(({ width, height }) => Number.isFinite(width) && Number.isFinite(height))
const realPhotos = intakePhotos.filter(({ enabled, x, y }) => (
  enabled && Number.isFinite(x) && Number.isFinite(y)
))
const unplacedPhotos = intakePhotos.filter(({ enabled, x, y }) => (
  !enabled || !Number.isFinite(x) || !Number.isFinite(y)
))
const originalPhotos = realPhotos.slice(0, 39)
const secondLayerPhotos = realPhotos.slice(39)
assert.equal(intakePhotos.length, 72)
assert.equal(realPhotos.length, 70)
assert.equal(originalPhotos.length, 39)
assert.equal(secondLayerPhotos.length, 31)
assert.deepEqual(unplacedPhotos.map(({ filename }) => filename), ['IMG_9790.jpeg', 'IMG_9975.jpeg'])
assert.equal(realPhotos.filter(({ orientation }) => orientation === 'landscape').length, 46)
assert.equal(realPhotos.filter(({ orientation }) => orientation === 'portrait').length, 24)
assert.ok(realPhotos.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)))
assert.deepEqual(realPhotos.map(({ slotNumber }) => slotNumber), Array.from({ length: 70 }, (_, index) => index + 1))
assert.equal(new Set(realPhotos.map(({ slotNumber }) => slotNumber)).size, 70)
assert.ok(intakePhotos.every(({ filename }) => fs.existsSync(`public/studio-v2/photo-wall/source/${filename}`)))
assert.equal(resolvedManifest.packagingMode, 'all-polaroid')
assert.equal(resolvedManifest.normalizedSize, 'medium')
assert.equal(realPhotos.filter(({ style }) => style === 'print').length, 0)
assert.equal(realPhotos.filter(({ style }) => style === 'polaroid').length, 70)
assert.ok(realPhotos.every(({ size }) => size === 'medium'))
assert.ok(realPhotos.every(({ rotation }) => Number.isFinite(rotation)))
assert.ok(realPhotos.every(({ zOrder }) => zOrder >= -10 && zOrder <= 10))

const cardBounds = []
const cardsCrossingBoardEdge = []
const cardsOutsideUsableMargin = []
for (const photo of realPhotos) {
  assert.ok(photo.generatedFilename?.startsWith('generated/'))
  const generatedPath = `public/studio-v2/photo-wall/${photo.generatedFilename}`
  assert.ok(fs.existsSync(generatedPath))
  const generated = readStudioV2PhotoMetadata(generatedPath)
  assert.ok(Math.max(generated.width, generated.height) <= 1920)
  assert.ok(Math.abs(generated.aspectRatio - photo.aspectRatio) <= 0.002)
  for (const [tier, maxDimension] of [['room', 320], ['focus', 960]]) {
    const tierFilename = resolveStudioV2PhotoTierPath(photo, resolvedManifest.qualityTiers, tier)
    const tierPath = `public/studio-v2/photo-wall/${tierFilename}`
    assert.ok(fs.existsSync(tierPath))
    const derivative = readStudioV2PhotoMetadata(tierPath)
    assert.ok(Math.max(derivative.width, derivative.height) <= maxDimension)
    assert.ok(Math.abs(derivative.aspectRatio - photo.aspectRatio) <= 0.008)
  }

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
  if (
    photo.x - halfBoardX < 0
    || photo.x + halfBoardX > 100
    || photo.y - halfBoardY < 0
    || photo.y + halfBoardY > 100
  ) {
    cardsCrossingBoardEdge.push(photo.slotNumber)
  }
  cardBounds.push({
    cardHeight,
    cardWidth,
    halfBoardX,
    halfBoardY,
    id: photo.id,
    isSecondLayer: photo.slotNumber > 39,
    rotation: photo.rotation,
    slotNumber: photo.slotNumber,
    x: photo.x,
    y: photo.y,
    zOrder: photo.zOrder,
  })
  const cardCorners = [
    [-cardWidth / 2, -cardHeight / 2],
    [cardWidth / 2, -cardHeight / 2],
    [cardWidth / 2, cardHeight / 2],
    [-cardWidth / 2, cardHeight / 2],
  ].map(([localX, localY]) => boardPointFromCardLocal({
    cardHeight,
    cardWidth,
    rotation: photo.rotation,
    x: photo.x,
    y: photo.y,
  }, localX, localY))
  if (!cardCorners.every(({ x, y }) => x >= 2 && x <= 98 && y >= 2 && y <= 98)) {
    cardsOutsideUsableMargin.push(photo.slotNumber)
  }
}

let overlapPairCount = 0
for (let leftIndex = 0; leftIndex < cardBounds.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < cardBounds.length; rightIndex += 1) {
    const left = cardBounds[leftIndex]
    const right = cardBounds[rightIndex]
    const horizontalOverlap = Math.abs(left.x - right.x) < left.halfBoardX + right.halfBoardX
    const verticalOverlap = Math.abs(left.y - right.y) < left.halfBoardY + right.halfBoardY
    const overlaps = horizontalOverlap && verticalOverlap
    if (overlaps) overlapPairCount += 1
  }
}
assert.ok(overlapPairCount > 0)

function boardPointFromCardLocal(card, localX, localY) {
  const radians = card.rotation * Math.PI / 180
  const worldX = (
    localX * Math.cos(radians) - localY * Math.sin(radians)
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  const worldY = (
    localX * Math.sin(radians) + localY * Math.cos(radians)
  ) * STUDIO_V2_PHOTO_CARD_SCALE
  return {
    x: card.x - worldX / STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth * 100,
    y: card.y - worldY / STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight * 100,
  }
}

function cardContainsBoardPoint(card, point) {
  const worldX = -(point.x - card.x) / 100 * STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth
  const worldY = -(point.y - card.y) / 100 * STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight
  const radians = card.rotation * Math.PI / 180
  const localX = (
    worldX * Math.cos(radians) + worldY * Math.sin(radians)
  ) / STUDIO_V2_PHOTO_CARD_SCALE
  const localY = (
    -worldX * Math.sin(radians) + worldY * Math.cos(radians)
  ) / STUDIO_V2_PHOTO_CARD_SCALE
  return (
    Math.abs(localX) <= card.cardWidth / 2
    && Math.abs(localY) <= card.cardHeight / 2
  )
}

function cardsHaveBoundingOverlap(left, right) {
  return (
    Math.abs(left.x - right.x) < left.halfBoardX + right.halfBoardX
    && Math.abs(left.y - right.y) < left.halfBoardY + right.halfBoardY
  )
}

function measureCombinedOcclusion(target, allCards, resolution = 220) {
  const occluders = allCards.filter((candidate) => (
    candidate.slotNumber !== target.slotNumber
    && cardsHaveBoundingOverlap(target, candidate)
    && (
      candidate.zOrder > target.zOrder
      || (
        candidate.zOrder === target.zOrder
        && candidate.slotNumber > target.slotNumber
      )
    )
  ))
  if (occluders.length === 0) return 0
  let coveredSamples = 0
  const totalSamples = resolution * resolution
  for (let row = 0; row < resolution; row += 1) {
    const localY = ((row + 0.5) / resolution - 0.5) * target.cardHeight
    for (let column = 0; column < resolution; column += 1) {
      const localX = ((column + 0.5) / resolution - 0.5) * target.cardWidth
      const point = boardPointFromCardLocal(target, localX, localY)
      if (occluders.some((candidate) => cardContainsBoardPoint(candidate, point))) {
        coveredSamples += 1
      }
    }
  }
  return coveredSamples / totalSamples
}

const globalOcclusionAuditCards = cardBounds
const globalOcclusionAudit = globalOcclusionAuditCards.map((card) => ({
  occlusion: measureCombinedOcclusion(card, globalOcclusionAuditCards),
  slotNumber: card.slotNumber,
}))
const photosAboveGlobalOcclusionLimit = globalOcclusionAudit.filter(({ occlusion }) => occlusion > 0.1)
console.log(JSON.stringify({
  aboveTenPercent: photosAboveGlobalOcclusionLimit.length,
  cardsCrossingBoardEdge,
  cardsOutsideUsableMargin,
  failures: photosAboveGlobalOcclusionLimit.map(({ occlusion, slotNumber }) => ({
    occlusion: Number((occlusion * 100).toFixed(2)),
    slotNumber,
  })),
  maximumOcclusionPercent: Number((Math.max(...globalOcclusionAudit.map(({ occlusion }) => occlusion)) * 100).toFixed(2)),
  topOcclusions: [...globalOcclusionAudit]
    .sort((left, right) => right.occlusion - left.occlusion)
    .slice(0, 8)
    .map(({ occlusion, slotNumber }) => ({ occlusion: Number((occlusion * 100).toFixed(2)), slotNumber })),
}))
assert.ok(globalOcclusionAudit.every(({ occlusion }) => Number.isFinite(occlusion)))
assert.ok(resolvedManifest.photos.every((photo) => (
  ['x', 'y', 'rotation', 'size', 'zOrder', 'style', 'enabled'].every((field) => field in photo)
)))

console.log('Studio V2 photo-board coordinate smoke passed.')

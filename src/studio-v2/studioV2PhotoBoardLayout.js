import * as THREE from 'three'

export const STUDIO_V2_PHOTO_BOARD_SURFACE = Object.freeze({
  height: 0.634,
  localOrigin: Object.freeze([-0.675, -0.3375, -0.0007]),
  normal: Object.freeze([0, 0, 1]),
  width: 1.309,
  worldHeight: 1.268,
  worldWidth: 2.618,
})

export const STUDIO_V2_PHOTO_BOARD_COORDINATES = Object.freeze({
  min: 0,
  max: 100,
  safeMin: -10,
  safeMax: 110,
  xDirection: 'LEFT_TO_RIGHT',
  yDirection: 'TOP_TO_BOTTOM',
  anchor: 'VISUAL_CENTER',
})

export const STUDIO_V2_PHOTO_BOARD_DEPTH = Object.freeze({
  baseOffsetWorld: 0.004,
  gridOffsetWorld: 0.0012,
  zOrderStepWorld: 0.00025,
  minimumZOrder: -10,
  maximumZOrder: 10,
})

function finiteCoordinate(value, label) {
  if (!Number.isFinite(value)) throw new Error(`Photo board ${label} must be a finite number.`)
  return THREE.MathUtils.clamp(
    value,
    STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMin,
    STUDIO_V2_PHOTO_BOARD_COORDINATES.safeMax,
  )
}

export function resolveStudioV2PhotoBoardCoordinates({ x, y, zOrder = 0 }) {
  if (!Number.isFinite(zOrder)) throw new Error('Photo board zOrder must be a finite number.')
  return Object.freeze({
    x: finiteCoordinate(x, 'x'),
    y: finiteCoordinate(y, 'y'),
    zOrder: THREE.MathUtils.clamp(
      zOrder,
      STUDIO_V2_PHOTO_BOARD_DEPTH.minimumZOrder,
      STUDIO_V2_PHOTO_BOARD_DEPTH.maximumZOrder,
    ),
  })
}

export function boardCoordinatesToStudioV2Position({
  x,
  y,
  zOrder = 0,
  boardScale = 2,
  space = 'local',
  boardObject = null,
}, target = new THREE.Vector3()) {
  if (!(boardScale > 0)) throw new Error('Photo board scale must be greater than zero.')
  const resolved = resolveStudioV2PhotoBoardCoordinates({ x, y, zOrder })
  const [centerX, centerY, surfaceZ] = STUDIO_V2_PHOTO_BOARD_SURFACE.localOrigin
  const horizontalProgress = resolved.x / 100
  const verticalProgress = resolved.y / 100
  target.set(
    centerX + STUDIO_V2_PHOTO_BOARD_SURFACE.width / 2
      - STUDIO_V2_PHOTO_BOARD_SURFACE.width * horizontalProgress,
    centerY + STUDIO_V2_PHOTO_BOARD_SURFACE.height / 2
      - STUDIO_V2_PHOTO_BOARD_SURFACE.height * verticalProgress,
    surfaceZ + (
      STUDIO_V2_PHOTO_BOARD_DEPTH.baseOffsetWorld
      + resolved.zOrder * STUDIO_V2_PHOTO_BOARD_DEPTH.zOrderStepWorld
    ) / boardScale,
  )
  if (space === 'local') return target
  if (space !== 'world') throw new Error(`Unsupported photo board position space: ${space}.`)
  if (!boardObject?.localToWorld) throw new Error('A Three.js boardObject is required for world positions.')
  boardObject.updateWorldMatrix(true, false)
  return boardObject.localToWorld(target)
}

export function studioV2PhotoBoardGridEnabled(searchParams, debug = false) {
  return Boolean(debug && searchParams?.get?.('photoGrid') === '1')
}

export function studioV2PhotoWallReviewEnabled(searchParams, debug = false) {
  return Boolean(debug && searchParams?.get?.('photoWallReview') === '1')
}

export function studioV2PhotoSlotOverlayEnabled(searchParams, debug = false) {
  return Boolean(debug && searchParams?.get?.('photoSlots') === '1')
}

export function studioV2PhotoWallDebugPanelEnabled(searchParams, debug = false) {
  if (!debug) return false
  return !studioV2PhotoWallReviewEnabled(searchParams, debug)
    || searchParams?.get?.('debugPanel') === '1'
}

function createGridLines(step, z, material, boardScale) {
  const positions = []
  for (let coordinate = 0; coordinate <= 100; coordinate += step) {
    if (step === 5 && coordinate % 10 === 0) continue
    const verticalTop = boardCoordinatesToStudioV2Position({ x: coordinate, y: 0, boardScale })
    const verticalBottom = boardCoordinatesToStudioV2Position({ x: coordinate, y: 100, boardScale })
    const horizontalLeft = boardCoordinatesToStudioV2Position({ x: 0, y: coordinate, boardScale })
    const horizontalRight = boardCoordinatesToStudioV2Position({ x: 100, y: coordinate, boardScale })
    positions.push(
      verticalTop.x, verticalTop.y, z,
      verticalBottom.x, verticalBottom.y, z,
      horizontalLeft.x, horizontalLeft.y, z,
      horizontalRight.x, horizontalRight.y, z,
    )
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const lines = new THREE.LineSegments(geometry, material)
  lines.renderOrder = 20
  return lines
}

function createCoordinateLabel(text, position, boardScale) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '600 28px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = 'rgba(255, 248, 224, 0.9)'
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({
    depthTest: true,
    depthWrite: false,
    map: texture,
    transparent: true,
    toneMapped: false,
  })
  const label = new THREE.Sprite(material)
  const widthWorld = Math.max(0.07, text.length * 0.025)
  label.scale.set(widthWorld / boardScale, 0.032 / boardScale, 1)
  label.position.copy(position)
  label.renderOrder = 21
  return label
}

export function createStudioV2PhotoBoardCoordinateOverlay({ boardScale = 2 } = {}) {
  const overlay = new THREE.Group()
  overlay.name = 'PHOTO_BOARD_COORDINATE_OVERLAY'
  overlay.userData.studioV2Id = 'PHOTO_BOARD_COORDINATE_OVERLAY'
  overlay.userData.developmentOnly = true
  const z = STUDIO_V2_PHOTO_BOARD_SURFACE.localOrigin[2]
    + STUDIO_V2_PHOTO_BOARD_DEPTH.gridOffsetWorld / boardScale
  const majorMaterial = new THREE.LineBasicMaterial({
    color: 0xfff0bd,
    depthWrite: false,
    opacity: 0.48,
    transparent: true,
  })
  const minorMaterial = new THREE.LineBasicMaterial({
    color: 0xfff0bd,
    depthWrite: false,
    opacity: 0.18,
    transparent: true,
  })
  overlay.add(
    createGridLines(5, z, minorMaterial, boardScale),
    createGridLines(10, z, majorMaterial, boardScale),
  )

  for (let coordinate = 0; coordinate <= 100; coordinate += 10) {
    const xPosition = boardCoordinatesToStudioV2Position({ x: coordinate, y: 0, boardScale })
    xPosition.y -= 0.018 / boardScale
    xPosition.z = z
    overlay.add(createCoordinateLabel(coordinate === 0 ? '(0,0)' : `${coordinate}`, xPosition, boardScale))
    if (coordinate === 0) continue
    const yPosition = boardCoordinatesToStudioV2Position({ x: 0, y: coordinate, boardScale })
    yPosition.x -= 0.034 / boardScale
    yPosition.z = z
    overlay.add(createCoordinateLabel(`${coordinate}`, yPosition, boardScale))
  }
  const center = boardCoordinatesToStudioV2Position({ x: 50, y: 50, boardScale })
  center.y += 0.025 / boardScale
  center.z = z
  overlay.add(createCoordinateLabel('(50,50)', center, boardScale))
  return overlay
}

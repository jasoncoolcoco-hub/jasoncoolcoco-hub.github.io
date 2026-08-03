function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const roomFootprint = {
  corners: {
    A: [-28, 0, -18],
    B: [-28, 0, 18],
    C: [28, 0, 18],
    D: [28, 0, -18],
  },
  wall1Edge: ['A', 'B'],
  wall2Edge: ['B', 'C'],
  openEdges: [['C', 'D'], ['D', 'A']],
}

const roofCorners = {
  A: [-28, 31.5, -18],
  B: [-28, 8, 18],
  C: [28, 20.5, 18],
  D: [28, 44, -18],
}

const heroCameraConfig = {
  position: [24, 38, -48],
  target: [-3.5, 8.5, 4],
  fov: 66,
  near: 0.4,
  far: 180,
  roll: -0.018,
}

export const approvedRectangularStudioShellV1 = deepFreeze({
  id: 'rectangular-studio-shell-v1',
  status: 'approved',
  approvedCommit: 'e2d57be',
  dimensions: {
    unit: 'estimated metres',
    width: 56,
    depth: 36,
    maximumHeight: 44,
    minimumCeilingHeight: 8,
  },
  roomFootprint,
  floorPlan: roomFootprint,
  roofCorners,
  floor: {
    position: [0, -0.18, 0],
    width: 56,
    depth: 36,
    elevation: 0,
    material: 'concrete',
    visibility: true,
  },
  wall1: {
    edge: ['A', 'B'],
    edgeCoordinates: [roomFootprint.corners.A, roomFootprint.corners.B],
    position: [-27.82, 0, 0],
    rotation: [0, 0, 0],
    edgeLength: 36,
    width: 0.3,
    height: 24,
    depth: 35.4,
    elevation: 0.35,
    roofInset: 0.12,
    bayCount: 10,
    material: 'glass',
    visibility: true,
  },
  wall2: {
    edge: ['B', 'C'],
    edgeCoordinates: [roomFootprint.corners.B, roomFootprint.corners.C],
    position: [0, 0, 18],
    rotation: [0, 0, 0],
    length: 56,
    roofStartHeight: 8,
    roofEndHeight: 20.5,
    material: 'deepFloor',
    visibility: true,
  },
  roof: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    width: 56,
    depth: 36,
    thickness: 0.7,
    corners: roofCorners,
    cornerHeights: {
      A: roofCorners.A[1],
      B: roofCorners.B[1],
      C: roofCorners.C[1],
      D: roofCorners.D[1],
    },
    slope: {
      risePerMetreX: 0.2232142857,
      risePerMetreZ: -0.6527777778,
      wall1FallAngleDegrees: 33.1356095487,
      wall2RiseAngleDegrees: 12.5829624941,
    },
    elevation: 0,
    material: 'ceiling',
    visibility: true,
  },
  heroCameraConfig,
})

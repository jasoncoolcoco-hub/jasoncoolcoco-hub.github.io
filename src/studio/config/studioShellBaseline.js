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

// Frozen record of the approved 56 m × 36 m shell before the coordinate-system expansion.
export const previousShellBaseline = approvedRectangularStudioShellV1

const expandedRoomFootprint = {
  origin: 'D',
  corners: {
    D: [0, 0, 0],
    A: [112, 0, 0],
    B: [112, 0, 72],
    C: [0, 0, 72],
  },
  wall1Edge: ['A', 'B'],
  wall2Edge: ['B', 'C'],
  openEdges: [['C', 'D'], ['D', 'A']],
}

const expandedRoofCorners = {
  D: [0, 57.2, 0],
  A: [112, 40.8111111111, 0],
  B: [112, 10, 72],
  C: [0, 26.3888888889, 72],
}

const expandedHeroCameraConfig = {
  position: [15, 76, -76],
  target: [59, 16, 43],
  fov: 64,
  near: 0.5,
  far: 340,
  roll: -0.014,
}

export const studioCoordinateSystem = deepFreeze({
  unit: 'metre',
  metresPerUnit: 1,
  originCorner: 'D',
  origin: expandedRoomFootprint.corners.D,
  axes: {
    x: { from: 'D', to: 'A', direction: [1, 0, 0] },
    y: { direction: [0, 1, 0] },
    z: { from: 'D', to: 'C', direction: [0, 0, 1] },
  },
  floorBounds: {
    x: [0, 112],
    y: 0,
    z: [0, 72],
  },
  corners: expandedRoomFootprint.corners,
})

export const expandedRectangularStudioShellV1 = deepFreeze({
  id: 'expanded-rectangular-studio-shell-v1',
  status: 'coordinate-baseline',
  basedOn: previousShellBaseline.id,
  dimensions: {
    unit: 'metres',
    width: 112,
    depth: 72,
    maximumHeight: 57.2,
    minimumCeilingHeight: 10,
  },
  roomFootprint: expandedRoomFootprint,
  floorPlan: expandedRoomFootprint,
  roofCorners: expandedRoofCorners,
  floor: {
    position: [56, -0.18, 36],
    width: 112,
    depth: 72,
    thickness: 0.32,
    elevation: 0,
    material: 'concrete',
    visibility: true,
  },
  wall1: {
    edge: ['A', 'B'],
    edgeCoordinates: [expandedRoomFootprint.corners.A, expandedRoomFootprint.corners.B],
    position: [111.82, 0, 36],
    rotation: [0, 0, 0],
    edgeLength: 72,
    width: 0.3,
    height: 33.6,
    depth: 71.4,
    elevation: 0.35,
    roofInset: 0.12,
    bayCount: 20,
    glassThickness: 0.07,
    frameWidth: 0.32,
    interiorDirectionX: -1,
    material: 'glass',
    visibility: true,
  },
  wall2: {
    edge: ['B', 'C'],
    edgeCoordinates: [expandedRoomFootprint.corners.B, expandedRoomFootprint.corners.C],
    position: [56, 0, 72],
    rotation: [0, 0, 0],
    length: 112,
    thickness: 0.24,
    roofStartHeight: 10,
    roofEndHeight: 26.3888888889,
    material: 'deepFloor',
    visibility: true,
  },
  roof: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    width: 112,
    depth: 72,
    thickness: 0.7,
    corners: expandedRoofCorners,
    cornerHeights: {
      A: expandedRoofCorners.A[1],
      B: expandedRoofCorners.B[1],
      C: expandedRoofCorners.C[1],
      D: expandedRoofCorners.D[1],
    },
    slope: {
      risePerMetreX: -0.1463293651,
      risePerMetreZ: -0.4279320988,
      xAngleDegrees: -8.325,
      zAngleDegrees: -23.169,
      directionPreservedFrom: previousShellBaseline.id,
    },
    elevation: 0,
    material: 'ceiling',
    visibility: true,
  },
  heroCameraConfig: expandedHeroCameraConfig,
  coordinateSystem: studioCoordinateSystem,
})

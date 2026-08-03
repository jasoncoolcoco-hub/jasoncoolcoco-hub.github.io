function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export const approvedRectangularStudioShellV1 = deepFreeze({
  id: 'rectangular-studio-shell-v1',
  status: 'approved',
  dimensions: {
    unit: 'estimated metres',
    width: 56,
    depth: 36,
    maximumHeight: 44,
    minimumCeilingHeight: 8,
  },
  floorPlan: {
    corners: {
      A: [-28, 0, -18],
      B: [-28, 0, 18],
      C: [28, 0, 18],
      D: [28, 0, -18],
    },
    wall1Edge: ['A', 'B'],
    wall2Edge: ['B', 'C'],
    openEdges: [['C', 'D'], ['D', 'A']],
  },
  floor: {
    position: [0, -0.18, 0],
    width: 56,
    depth: 36,
    elevation: 0,
    material: 'concrete',
    visibility: true,
  },
  wall1: {
    position: [-27.82, 0, 0],
    rotation: [0, 0, 0],
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
    material: 'deepFloor',
    visibility: true,
  },
  roof: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    width: 56,
    depth: 36,
    thickness: 0.7,
    cornerHeights: { A: 31.5, B: 8, C: 20.5, D: 44 },
    elevation: 0,
    material: 'ceiling',
    visibility: true,
  },
})

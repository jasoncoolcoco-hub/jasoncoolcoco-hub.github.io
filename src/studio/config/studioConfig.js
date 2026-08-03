export const studioDimensions = {
  unit: 'estimated metres',
  width: 36,
  depth: 44,
  maximumHeight: 42,
  minimumCeilingHeight: 0.08,
}

export const shellGeometry = {
  apexPosition: [-12, 0.08, 20],
  floorExtent: {
    wall1Base: [-14, 0, -24],
    wall2Base: [22, 0, -24],
    width: 36,
    depth: 44,
  },
  wall1Extent: {
    basePosition: [-14, 0, -24],
    baseHeight: 22,
    runToApex: 44.05,
  },
  wall2Extent: {
    basePosition: [22, 0, -24],
    baseHeight: 42,
    runToApex: 55.61,
  },
  roofHeight: 42,
  roofSlope: {
    wall1Degrees: 26.45,
    wall2Degrees: 37.01,
  },
}

export const studioLayout = {
  floor: {
    position: [0, -0.18, 0],
    width: 40,
    depth: 48,
    elevation: 0,
    material: 'concrete',
    visibility: false,
  },
  timberFloor: {
    position: [-10.6, 0.025, 0.8],
    width: 18.2,
    depth: 46.4,
    elevation: 0.025,
    material: 'timber',
    visibility: false,
  },
  displayWall: {
    position: [8.4, 6.8, -1.6],
    rotation: [0, 0.06, 0],
    width: 17.4,
    height: 13,
    depth: 0.54,
    elevation: 0.3,
    material: 'displayWall',
    visibility: false,
  },
  redCurtain: {
    position: [1.9, 5.35, 3.4],
    rotation: [0, -0.035, 0],
    width: 9.4,
    height: 9.7,
    depth: 0.28,
    elevation: 0.5,
    material: 'redCurtain',
    visibility: false,
  },
  rearCurtain: {
    position: [-5.4, 3.2, 10.6],
    rotation: [0, 0, 0],
    width: 9.6,
    height: 5.6,
    depth: 0.18,
    elevation: 0.4,
    material: 'rearCurtain',
    visibility: false,
  },
  centralStage: {
    position: [0.7, 0.2, -7.1],
    rotation: [0, 0.025, 0],
    width: 24.8,
    depth: 17.8,
    height: 0.84,
    elevation: 0.2,
    material: 'stage',
    visibility: false,
  },
  glassFacade: {
    position: [-19.82, 0, 0],
    rotation: [0, 0, 0],
    width: 0.3,
    height: 24,
    depth: 47.4,
    elevation: 0.35,
    roofInset: 0.12,
    bayCount: 10,
    material: 'glass',
    visibility: true,
  },
  slopedCeiling: {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    width: 40,
    depth: 48,
    thickness: 0.7,
    slope: { leftFront: 31.5, rightFront: 30.5, leftRear: 8, rightRear: 20.5 },
    elevation: 0,
    material: 'ceiling',
    visibility: false,
  },
  ceilingCanopy: {
    position: [-1, 0, -4.2],
    rotation: [0, -0.03, 0],
    width: 21,
    depth: 15.5,
    slope: 2.35,
    anchorGap: 0.75,
    elevation: 0,
    material: 'canopy',
    visibility: false,
  },
}

export const heroCameraConfig = {
  position: [24, 34, -44],
  target: [10, 10, 4],
  fov: 67,
  near: 0.4,
  far: 180,
  roll: -0.012,
}

export const debugViews = {
  hero: heroCameraConfig,
  top: {
    position: [0, 92, 0.01],
    target: [0, 0, 0],
    fov: 50,
  },
  left: {
    position: [52, 26, -20],
    target: [-3, 11, 1],
    fov: 52,
  },
  right: {
    position: [-52, 26, -12],
    target: [-4, 11, 2],
    fov: 50,
  },
  section: {
    position: [0, 32, -68],
    target: [-7, 11, 4],
    fov: 52,
  },
  shell: {
    position: [40, 38, -64],
    target: [-5, 13, 3],
    fov: 58,
  },
}

export const studioMaterials = {
  concrete: { color: '#8d8273', roughness: 0.94 },
  paleFloor: { color: '#b9aa95', roughness: 0.95 },
  deepFloor: { color: '#766e64', roughness: 0.96 },
  timber: { color: '#765039', roughness: 0.76 },
  displayWall: { color: '#ddd8cd', roughness: 0.92 },
  ceiling: { color: '#a88866', roughness: 0.88 },
  ceilingEdge: { color: '#5c4939', roughness: 0.9 },
  canopy: { color: '#d7d0c1', roughness: 0.96 },
  redCurtain: { color: '#6d190f', roughness: 0.98 },
  rearCurtain: { color: '#d8d6cf', roughness: 0.97 },
  stage: { color: '#d8cdbd', roughness: 0.93 },
  stageSeam: { color: '#8d8276' },
  glass: { color: '#397682', roughness: 0.24, opacity: 0.42 },
  glassFrame: { color: '#778783', roughness: 0.4, metalness: 0.56 },
  column: { color: '#7b3b25', roughness: 0.72 },
  darkExterior: { color: '#082a32', roughness: 1 },
  stair: { color: '#8b8175', roughness: 0.86 },
}

export const studioLightingConfig = {
  hemisphere: { sky: '#f0ddc4', ground: '#342b27', intensity: 1.42 },
  warmKey: { color: '#ffe3b6', intensity: 2.45, position: [15, 22, -9] },
  wallFill: { color: '#fff0d5', intensity: 11, position: [14, 10, -2], distance: 42 },
  coolFacade: { color: '#7bc4d6', intensity: 17, position: [-18, 10, 6], distance: 50 },
  ceilingFill: { color: '#e9b77d', intensity: 11, position: [0, 12, -15], distance: 46 },
}

export const inferredGeometry = [
  'Single apex location beyond the photographed interior',
  'Wall 1 and Wall 2 base extents inferred from perspective',
  'Roof height and asymmetric slope between the two wall bases',
  'Exact triangular glass mullion spacing',
  'Open entrance boundary opposite the apex',
]

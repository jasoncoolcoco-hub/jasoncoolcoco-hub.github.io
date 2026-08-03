import { approvedRectangularStudioShellV1 } from './studioShellBaseline.js'

export const studioShellBaseline = approvedRectangularStudioShellV1

export const studioDimensions = approvedRectangularStudioShellV1.dimensions

export const roomFootprint = approvedRectangularStudioShellV1.roomFootprint

export const floorPlan = roomFootprint

export const roofCorners = approvedRectangularStudioShellV1.roofCorners

export const studioLayout = {
  floor: approvedRectangularStudioShellV1.floor,
  timberFloor: {
    position: [-18.2, 0.015, 0],
    width: 18.4,
    depth: 35.2,
    thickness: 0.055,
    boardWidth: 0.72,
    boardGap: 0.028,
    elevation: 0.015,
    material: 'timber',
    visibility: true,
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
    position: [0.7, 0, -7.1],
    rotation: [0, 0.025, 0],
    width: 24.8,
    depth: 17.8,
    height: 0.84,
    elevation: 0,
    material: 'stage',
    visibility: false,
  },
  glassFacade: approvedRectangularStudioShellV1.wall1,
  slopedCeiling: approvedRectangularStudioShellV1.roof,
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

export const heroCameraConfig = approvedRectangularStudioShellV1.heroCameraConfig

export const debugViews = {
  hero: heroCameraConfig,
  top: {
    position: [0, 100, 0.01],
    target: [0, 0, 0],
    fov: 50,
  },
  left: {
    position: [55, 24, -20],
    target: [-2, 11, 0],
    fov: 52,
  },
  right: {
    position: [-55, 24, -12],
    target: [-1, 11, 0],
    fov: 50,
  },
  section: {
    position: [55, 26, -42],
    target: [-5, 12, 8],
    fov: 55,
  },
  shell: {
    position: [55, 40, -48],
    target: [-3, 14, 2],
    fov: 55,
  },
  glass: {
    position: [2, 15, -26],
    target: [-27, 9, 1],
    fov: 42,
  },
  floor: {
    position: [18, 8, -28],
    target: [-8, 0, -2],
    fov: 47,
  },
  junction: {
    position: [35, 25, -4],
    target: [-16, 12, 17],
    fov: 44,
  },
}

export const studioMaterials = {
  concrete: { color: '#9a907e', roughness: 0.96 },
  paleFloor: { color: '#b9aa95', roughness: 0.95 },
  deepFloor: { color: '#bbb4a9', roughness: 0.96 },
  timber: { color: '#795f4b', roughness: 0.86 },
  displayWall: { color: '#ddd8cd', roughness: 0.92 },
  ceiling: { color: '#8d7764', roughness: 0.9 },
  ceilingEdge: { color: '#655749', roughness: 0.84 },
  canopy: { color: '#d7d0c1', roughness: 0.96 },
  redCurtain: { color: '#6d190f', roughness: 0.98 },
  rearCurtain: { color: '#d8d6cf', roughness: 0.97 },
  stage: { color: '#d8cdbd', roughness: 0.93 },
  stageSeam: { color: '#8d8276' },
  glass: { color: '#a8b9b8', roughness: 0.065, opacity: 0.92 },
  glassFrame: { color: '#555e5d', roughness: 0.34, metalness: 0.72 },
  column: { color: '#7b3b25', roughness: 0.72 },
  darkExterior: { color: '#10232b', roughness: 0.92 },
  stair: { color: '#8b8175', roughness: 0.86 },
}

export const studioLightingConfig = {
  ambient: { color: '#d9d4ca', intensity: 0.14 },
  hemisphere: { sky: '#d9e2df', ground: '#473e36', intensity: 0.42 },
  warmKey: {
    color: '#ffe0b4',
    intensity: 1.9,
    position: [22, 38, -24],
    target: [-2, 1, 7],
  },
  warmBounce: {
    color: '#ffd8a5',
    intensity: 5.8,
    position: [10, 20, -13],
    target: [0, 2, 5],
    width: 30,
    height: 18,
  },
  coolFacade: {
    color: '#9ac5cf',
    intensity: 5,
    position: [-30, 13, 0],
    target: [-5, 7, 0],
    width: 28,
    height: 22,
  },
  nightPractical: { color: '#ffc27f', intensity: 90, position: [8, 5, -8], distance: 34 },
}

export const studioRenderingConfig = {
  maxDpr: 1.65,
  exposure: 1.06,
  shadowMapSize: 2048,
  shadowBias: -0.00018,
  shadowNormalBias: 0.035,
  textureSizes: { floor: 512, wall: 512, roof: 512, timber: 1024 },
}

export const inferredGeometry = [
  'Rectangular 56m × 36m floor plan and corner coordinates',
  'Wall 1 occupying edge A–B and Wall 2 occupying edge B–C',
  'Open boundaries along edges C–D and D–A',
  'Roof corner heights and full rectangular projection',
  'Exact glass bay spacing and exterior void depth',
]

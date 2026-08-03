import {
  expandedRectangularStudioShellV1,
  previousShellBaseline,
  studioCoordinateSystem,
} from './studioShellBaseline.js'

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export { previousShellBaseline, studioCoordinateSystem }

export const studioShellBaseline = expandedRectangularStudioShellV1

export const studioDimensions = studioShellBaseline.dimensions

export const roomFootprint = studioShellBaseline.roomFootprint

export const floorPlan = roomFootprint

export const roofCorners = studioShellBaseline.roofCorners

export const studioCoordinates = deepFreeze({
  shellCenter: [56, 0, 36],
  timberFloorCenter: [92.4, 0.015, 36],
  displayWallAnchor: [39.2, 6.8, 32.8],
  redCurtainAnchor: [52.2, 5.35, 42.8],
  rearCurtainAnchor: [66.8, 3.2, 57.2],
  centralStageAnchor: [54.6, 0, 21.8],
  ceilingCanopyAnchor: [58, 0, 27.6],
  lighting: {
    warmKey: [12, 50, -12],
    warmKeyTarget: [60, 1, 50],
    warmBounce: [36, 26, 10],
    warmBounceTarget: [56, 2, 46],
    coolFacade: [116, 19, 36],
    coolFacadeTarget: [66, 8, 36],
    nightPractical: [40, 6, 20],
  },
})

export const studioLayout = {
  floor: studioShellBaseline.floor,
  timberFloor: {
    position: studioCoordinates.timberFloorCenter,
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
    position: studioCoordinates.displayWallAnchor,
    rotation: [0, 0.06, 0],
    width: 17.4,
    height: 13,
    depth: 0.54,
    elevation: 0.3,
    material: 'displayWall',
    visibility: false,
  },
  redCurtain: {
    position: studioCoordinates.redCurtainAnchor,
    rotation: [0, -0.035, 0],
    width: 9.4,
    height: 9.7,
    depth: 0.28,
    elevation: 0.5,
    material: 'redCurtain',
    visibility: false,
  },
  rearCurtain: {
    position: studioCoordinates.rearCurtainAnchor,
    rotation: [0, 0, 0],
    width: 9.6,
    height: 5.6,
    depth: 0.18,
    elevation: 0.4,
    material: 'rearCurtain',
    visibility: false,
  },
  centralStage: {
    position: studioCoordinates.centralStageAnchor,
    rotation: [0, 0.025, 0],
    width: 24.8,
    depth: 17.8,
    height: 0.84,
    elevation: 0,
    material: 'stage',
    visibility: false,
  },
  glassFacade: studioShellBaseline.wall1,
  slopedCeiling: studioShellBaseline.roof,
  ceilingCanopy: {
    position: studioCoordinates.ceilingCanopyAnchor,
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

export const heroCameraConfig = studioShellBaseline.heroCameraConfig

export const debugViews = {
  hero: heroCameraConfig,
  top: {
    position: [56, 155, 38],
    target: [56, 0, 36],
    fov: 50,
  },
  left: {
    position: [-62, 38, 18],
    target: [54, 18, 38],
    fov: 52,
  },
  right: {
    position: [174, 38, 18],
    target: [58, 18, 38],
    fov: 50,
  },
  section: {
    position: [12, 68, -82],
    target: [58, 20, 45],
    fov: 55,
  },
  shell: {
    position: [8, 82, -88],
    target: [58, 22, 42],
    fov: 55,
  },
  glass: {
    position: [72, 24, -8],
    target: [112, 18, 35],
    fov: 42,
  },
  floor: {
    position: [30, 14, -24],
    target: [66, 0, 30],
    fov: 47,
  },
  junction: {
    position: [70, 38, 37],
    target: [106, 18, 70],
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
    position: studioCoordinates.lighting.warmKey,
    target: studioCoordinates.lighting.warmKeyTarget,
  },
  warmBounce: {
    color: '#ffd8a5',
    intensity: 5.8,
    position: studioCoordinates.lighting.warmBounce,
    target: studioCoordinates.lighting.warmBounceTarget,
    width: 44,
    height: 24,
  },
  coolFacade: {
    color: '#9ac5cf',
    intensity: 5,
    position: studioCoordinates.lighting.coolFacade,
    target: studioCoordinates.lighting.coolFacadeTarget,
    width: 54,
    height: 32,
  },
  nightPractical: {
    color: '#ffc27f',
    intensity: 90,
    position: studioCoordinates.lighting.nightPractical,
    distance: 34,
  },
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
  'Rectangular 112m × 72m floor plan with D at world origin',
  'Wall 1 occupying edge A–B and Wall 2 occupying edge B–C',
  'Open boundaries along edges C–D and D–A',
  'Roof corner heights and full rectangular projection',
  'Exact glass bay spacing and exterior void depth',
]

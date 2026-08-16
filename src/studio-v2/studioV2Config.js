export const STUDIO_V2_MODEL_URL = `${import.meta.env.BASE_URL}models/fred-studio-v2/loft_interior_6_for_free.glb`

export const STUDIO_V2_MODEL_TRANSFORM = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
}

export const STUDIO_V2_REMOVED_DINING_GROUPS = [
  { name: 'Cube005', role: 'DINING TABLE TOP' },
  { name: 'Cube006', role: 'DINING TABLE LEGS AND SUPPORTS' },
  { name: 'node_0004', role: 'DINING CHAIRS SOUTH' },
  { name: 'node_0005', role: 'DINING CHAIRS NORTH' },
]

export const STUDIO_V2_REMOVED_WINDOW_DECORATION_GROUPS = [
  { name: 'Plane007', role: 'WINDOW HANGING BANNER 1' },
  { name: 'Plane008', role: 'WINDOW HANGING BANNER 2' },
  { name: 'Plane009', role: 'WINDOW HANGING BANNER 3' },
  { name: 'Plane010', role: 'WINDOW HANGING BANNER 4' },
  { name: 'Plane011', role: 'WINDOW HANGING BANNER 5' },
]

export const STUDIO_V2_CAMERA_PRESETS = {
  REFERENCE: {
    position: [-6.42, 1.92, 0.3],
    target: [-2.35, 1.62, 0.16],
    fov: 50,
    near: 0.05,
    far: 160,
  },
  FOV_44: {
    position: [-6.42, 1.92, 0.3],
    target: [-2.35, 1.62, 0.16],
    fov: 44,
    near: 0.05,
    far: 160,
  },
  FOV_46: {
    position: [-6.42, 1.92, 0.3],
    target: [-2.35, 1.62, 0.16],
    fov: 46,
    near: 0.05,
    far: 160,
  },
  FOV_50: {
    position: [-6.42, 1.92, 0.3],
    target: [-2.35, 1.62, 0.16],
    fov: 50,
    near: 0.05,
    far: 160,
  },
  OPPOSITE: {
    position: [2.2, 1.92, 0.1],
    target: [-2.35, 1.55, 0],
    fov: 50,
    near: 0.05,
    far: 160,
  },
  SOFA_DETAIL: {
    position: [-5.05, 1.52, 0.3],
    target: [-4.96, 0.76, -2.58],
    fov: 48,
    near: 0.05,
    far: 160,
  },
  FLOOR_RUG_DETAIL: {
    position: [-2.55, 1.95, -1.45],
    target: [0.1, 0.02, -1.45],
    fov: 50,
    near: 0.05,
    far: 160,
  },
  KITCHEN_DETAIL: {
    position: [2.45, 1.82, -3.05],
    target: [4.85, 1.35, -2.05],
    fov: 48,
    near: 0.05,
    far: 160,
  },
  MUSIC_CLOSE: {
    position: [-3.3, 0.88, 0.28],
    target: [-2.03, 0.55, 1.4],
    fov: 34,
    near: 0.03,
    far: 160,
  },
  GUITAR_CLOSE: {
    position: [-3.08, 0.72, 0.5],
    target: [-2.15, 0.53, 1.25],
    fov: 30,
    near: 0.03,
    far: 160,
  },
  GUITAR_SIDE: {
    position: [-1.1, 0.74, 0.2],
    target: [-2.15, 0.53, 1.25],
    fov: 32,
    near: 0.03,
    far: 160,
  },
  GUITAR_HEADSTOCK: {
    position: [-3.08, 0.98, 0.5],
    target: [-2.15, 0.9, 1.25],
    fov: 24,
    near: 0.03,
    far: 160,
  },
  GUITAR_BODY: {
    position: [-3.08, 0.46, 0.5],
    target: [-2.15, 0.3, 1.25],
    fov: 24,
    near: 0.03,
    far: 160,
  },
  MARSHALL_FRONT: {
    position: [-3.15, 0.74, 0.54],
    target: [-1.91, 0.52, 1.56],
    fov: 30,
    near: 0.03,
    far: 160,
  },
  MARSHALL_CONTROL: {
    position: [-3.12, 1.03, 0.58],
    target: [-1.92, 0.94, 1.55],
    fov: 22,
    near: 0.03,
    far: 160,
  },
  MACBOOK_CLOSE: {
    position: [-0.34, 1.67, -0.05],
    target: [0.961, 1.51, -0.05],
    fov: 25,
    near: 0.03,
    far: 160,
  },
  PHOTO_WALL_REVIEW: {
    position: [3.625, 1.8825, -2.35],
    target: [3.625, 1.8825, -4.45],
    fov: 42,
    near: 0.03,
    far: 160,
  },
}

export const STUDIO_V2_DEFAULT_CAMERA = 'REFERENCE'

export const STUDIO_V2_LIGHTING_CANDIDATES = {
  LIGHTING_A: {
    label: 'DARK / REFERENCE',
    exposure: 0.86,
    environmentIntensity: 0.85,
    hemisphere: {
      sky: '#fffaf2',
      ground: '#332d28',
      intensity: 0.11,
    },
    key: {
      color: '#fff0d9',
      intensity: 0.96,
      position: [5.8, 8, 4.6],
      shadowIntensity: 0.82,
    },
    fill: {
      color: '#d5dfed',
      intensity: 0.1,
      position: [-4, 3, -3],
    },
  },
  LIGHTING_B: {
    label: 'BALANCED',
    exposure: 0.91,
    environmentIntensity: 0.95,
    hemisphere: {
      sky: '#fffaf2',
      ground: '#39322c',
      intensity: 0.14,
    },
    key: {
      color: '#fff0d9',
      intensity: 1.1,
      position: [5.8, 8, 4.1],
      shadowIntensity: 0.74,
    },
    fill: {
      color: '#d5dfed',
      intensity: 0.17,
      position: [-4, 3, -3],
    },
  },
  LIGHTING_C: {
    label: 'BRIGHTER INTERIOR',
    exposure: 0.98,
    environmentIntensity: 1.08,
    hemisphere: {
      sky: '#fffaf2',
      ground: '#403830',
      intensity: 0.18,
    },
    key: {
      color: '#fff0d9',
      intensity: 1.22,
      position: [5.5, 8, 3.7],
      shadowIntensity: 0.66,
    },
    fill: {
      color: '#d5dfed',
      intensity: 0.24,
      position: [-4, 3, -3],
    },
  },
}

export const STUDIO_V2_SELECTED_LIGHTING = 'LIGHTING_B'
export const STUDIO_V2_LIGHTING_BASELINE = STUDIO_V2_LIGHTING_CANDIDATES[STUDIO_V2_SELECTED_LIGHTING]
export const STUDIO_V2_LIGHTING = {
  ...STUDIO_V2_LIGHTING_BASELINE,
  label: 'DIRECTIONAL DAYLIGHT HIERARCHY',
  exposure: 0.76,
  environmentIntensity: 0.55,
  key: {
    ...STUDIO_V2_LIGHTING_BASELINE.key,
    color: '#fff8ef',
    intensity: 1.44,
    position: [-2.2, 4.6, -5.6],
    target: [-2.2, 0.5, -0.3],
    shadowIntensity: 0.5,
    shadowRadius: 5,
    shadowMapSize: 2048,
    shadowCamera: {
      left: -8,
      right: 8,
      top: 6,
      bottom: -4,
      near: 0.5,
      far: 24,
    },
    shadowBias: -0.00035,
    shadowNormalBias: 0.025,
  },
  fill: {
    ...STUDIO_V2_LIGHTING_BASELINE.fill,
    color: '#e6edf4',
    intensity: 0,
    position: [-5.5, 3.2, 2.8],
  },
  windowFill: {
    color: '#fff8ef',
    intensity: 0.42,
    position: [-0.4, 1.25, -5.25],
    target: [-3.6, 1.15, 0.8],
    width: 11,
    height: 3.2,
  },
  ceilingBounce: {
    color: '#f4eadc',
    intensity: 0.08,
    position: [-2, 4.08, -1.1],
    target: [-2, 0.8, -1.1],
    width: 8,
    height: 4.5,
  },
}

export const STUDIO_V2_SHADOW_PROFILES = Object.freeze({
  CURRENT_STAGE3_1: Object.freeze({
    label: 'CURRENT STAGE 3.1',
    shadowType: 'PCFShadowMap',
    keyIntensity: 1.6,
    windowFillIntensity: 0.32,
    ceilingBounceIntensity: 0.08,
    environmentIntensity: 0.55,
    exposure: 0.76,
    shadowIntensity: 0.56,
    shadowRadius: 3,
    blurSamples: 8,
    bias: -0.00035,
    normalBias: 0.025,
  }),
  IMPROVED_PCF_SOFT: Object.freeze({
    label: 'IMPROVED PCF SOFT',
    shadowType: 'PCFSoftShadowMap',
    keyIntensity: 1.44,
    windowFillIntensity: 0.42,
    ceilingBounceIntensity: 0.08,
    environmentIntensity: 0.55,
    exposure: 0.76,
    shadowIntensity: 0.5,
    shadowRadius: 5,
    blurSamples: 8,
    bias: -0.00035,
    normalBias: 0.025,
  }),
  VSM_SOFT: Object.freeze({
    label: 'VSM SOFT',
    shadowType: 'VSMShadowMap',
    keyIntensity: 1.42,
    windowFillIntensity: 0.42,
    ceilingBounceIntensity: 0.08,
    environmentIntensity: 0.55,
    exposure: 0.76,
    shadowIntensity: 0.5,
    shadowRadius: 4.2,
    blurSamples: 12,
    bias: -0.00025,
    normalBias: 0.018,
  }),
})

export const STUDIO_V2_SELECTED_SHADOW_PROFILE = 'IMPROVED_PCF_SOFT'

export const STUDIO_V2_RENDERING = {
  clearColor: '#151817',
  exposure: STUDIO_V2_LIGHTING.exposure,
  toneMapping: 'NEUTRAL',
  maxPixelRatio: 2,
  environmentIntensity: STUDIO_V2_LIGHTING.environmentIntensity,
}

export const STUDIO_V2_CONTROLS = {
  dampingFactor: 0.06,
  minDistance: 1.2,
  maxDistance: 4.65,
  minPolarAngle: Math.PI * 0.12,
  maxPolarAngle: Math.PI * 0.82,
  rotateSpeed: 0.42,
  zoomSpeed: 0.62,
  panSpeed: 0.42,
}

export const STUDIO_V2_OFFICIAL_CONTROLS = {
  dampingFactor: 0.14,
  minDistance: 0.4,
  maxDistance: 0.44,
  minPolarAngle: 1.3,
  maxPolarAngle: 1.7,
}

export const OFFICIAL_VIEW_MIN_AZIMUTH = -140 * Math.PI / 180
export const OFFICIAL_VIEW_MAX_AZIMUTH = -64 * Math.PI / 180

export const OFFICIAL_REAR_WALL_ENABLED = true
export const OFFICIAL_REAR_WALL_POSITION = [
  -6.001382586904363,
  1.8891436796244,
  0.2856003838247201,
]
export const OFFICIAL_REAR_WALL_NORMAL = {
  min: [-0.7660444431189779, 0, 0.6427876096865395],
  max: [-0.43837114678907746, 0, -0.898794046299167],
}
export const OFFICIAL_REAR_WALL_MARGIN = {
  minDegrees: 25,
  maxDegrees: 49,
}

export const OFFICIAL_REAR_VIRTUAL_WALL = {
  enabled: OFFICIAL_REAR_WALL_ENABLED,
  type: 'INVISIBLE_DIRECTIONAL_HALF_SPACE_PAIR',
  visible: false,
  castsShadow: false,
  receivesShadow: false,
  officialRouteOnly: true,
  occlusionProtectionEnabled: true,
  visualOcclusionBarrierAdded: false,
  wallFillerFallbackActive: false,
  wallFillerFallbackReason: 'STRICT_AZIMUTH_LIMITS_FULLY_COVER_VIEWPORT_EDGES',
  anchor: OFFICIAL_REAR_WALL_POSITION,
  normals: OFFICIAL_REAR_WALL_NORMAL,
  margin: OFFICIAL_REAR_WALL_MARGIN,
  minAzimuth: OFFICIAL_VIEW_MIN_AZIMUTH,
  maxAzimuth: OFFICIAL_VIEW_MAX_AZIMUTH,
  updateStage: 'BEFORE_ORBITCONTROLS_CANDIDATE_AND_RENDER',
}

export const OFFICIAL_VIEW_SECTOR = {
  openingAzimuth: -1.5364118496421866,
  openingAzimuthDegrees: -88.02991457838571,
  openingForwardDirection: [
    0.9967081264181825,
    -0.0734674294657138,
    -0.034284800417333075,
  ],
  minAzimuth: OFFICIAL_VIEW_MIN_AZIMUTH,
  maxAzimuth: OFFICIAL_VIEW_MAX_AZIMUTH,
  minAzimuthDegrees: -140,
  maxAzimuthDegrees: -64,
  totalDegrees: 76,
  visuallyObservedWallBoundariesDegrees: {
    min: -165,
    max: -15,
  },
  visualSafetyMarginDegrees: {
    min: OFFICIAL_REAR_WALL_MARGIN.minDegrees,
    max: OFFICIAL_REAR_WALL_MARGIN.maxDegrees,
  },
  virtualRearWallRequired: true,
  occlusionPlaneRequired: false,
  wallFillerFallbackActive: false,
}

// Orbit presentation and any future first-person walk mode are intentionally
// separate systems. A walk mode will need a capsule/character controller,
// simplified architecture and furniture colliders, and swept/continuous
// collision detection. The orbit furniture push-out solver must not be reused.
export const OFFICIAL_CAMERA_SAFE_VOLUME = {
  shape: 'CYLINDER',
  center: [-6.001382586904363, 1.8891436796244, 0.2856003838247201],
  fixedTarget: [-6.001382586904363, 1.8891436796244, 0.2856003838247201],
  minY: 1.82,
  maxY: 2.02,
  horizontalRadius: 0.44,
  minDistance: STUDIO_V2_OFFICIAL_CONTROLS.minDistance,
  maxDistance: STUDIO_V2_OFFICIAL_CONTROLS.maxDistance,
  openingDistance: 0.42,
  minPolarAngle: STUDIO_V2_OFFICIAL_CONTROLS.minPolarAngle,
  maxPolarAngle: STUDIO_V2_OFFICIAL_CONTROLS.maxPolarAngle,
  architectureClearance: 0.1,
  pan: false,
  zoom: true,
  furnitureCollision: false,
  futureWalkMode: {
    separateSystemRequired: true,
    controller: 'CAPSULE_OR_CHARACTER_CONTROLLER',
    colliders: 'SIMPLIFIED_ARCHITECTURE_AND_MAJOR_FURNITURE',
    movement: 'SWEPT_OR_CONTINUOUS_COLLISION_DETECTION',
    reuseOrbitFurniturePushOut: false,
  },
}

export const STUDIO_V2_FLOOR_SAFETY = {
  floorY: 0.020542593133827006,
  cameraFloorClearance: 0.7,
  targetFloorClearance: 0.53,
  floorEpsilon: 0.004,
}

export const STUDIO_V2_COLLISION_POLICY = {
  automaticMeshColliders: false,
  solverOrder: [
    'ARCHITECTURE_HARD_BOUNDS',
    'MAJOR_FURNITURE_ALLOWLIST',
    'NON_COLLIDING_PROPS_IGNORED',
    'TANGENT_SLIDE',
    'ACCEPTED_STATE_SYNC_RENDER',
  ],
  exclusionRules: [
    'EXPLICIT_ALLOWLIST_ONLY',
    'UNLISTED_MESHES_ARE_NON_COLLIDING',
    'SMALL_GROUP_MAX_EXTENT_0.80_IS_NON_COLLIDING_BY_DEFAULT',
  ],
  smallPropMaxExtent: 0.8,
  nonCollidingProps: [
    {
      name: 'TEA SET / COMPLETE GROUP',
      classification: 'NON_COLLIDING_PROP',
      groupNames: ['node_0006'],
      meshNames: ['node_0006_Material011_0'],
      includes: ['POT', 'LID', 'HANDLE', 'CUPS', 'TRAY', 'SMALL CONTAINERS'],
      auditedBounds: {
        min: [-4.269, 0.359, -1.677],
        max: [-3.569, 0.753, -1.014],
        size: [0.7, 0.394, 0.663],
      },
    },
  ],
  majorFurnitureColliders: [
    {
      name: 'SOFA SOUTH / MAIN BODY',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['node_0002_Material007_0'],
      min: [-6.55, 0.66, -4.05],
      max: [-2.88, 1.4, -2.06],
    },
    {
      name: 'SOFA SOUTH / CHAISE',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['node_0002_Material007_0'],
      min: [-6.55, 0.66, -2.02],
      max: [-5.68, 0.96, -1.25],
    },
    {
      name: 'SOFA NORTH / BODY',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['node_0_Material005_0'],
      min: [-6.55, 0.66, 2.23],
      max: [-3.42, 1.28, 3.38],
    },
    {
      name: 'COFFEE TABLE SOUTH / LOW BODY',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['Cube007_Material004_0'],
      min: [-4.64, 0.02, -1.99],
      max: [-3.29, 0.39, -0.73],
    },
    {
      name: 'COFFEE TABLE NORTH / LOW BODY',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['Cube002_Material004_0'],
      min: [-6.13, 0.02, 0.92],
      max: [-4.2, 0.65, 2.19],
    },
    {
      name: 'KITCHEN ISLAND / BODY',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['Cube003_Material008_0', 'Cube004_Material003_0'],
      min: [0.61, 0.52, -4.65],
      max: [1.9, 1.46, 0.6],
    },
    {
      name: 'KITCHEN STOOLS / ROW',
      category: 'MAJOR_FURNITURE_COLLIDER',
      sourceMeshes: ['Cylinder_Material003_0', 'Cylinder_����������_������_0'],
      min: [-0.34, 0.5, -4.15],
      max: [0.34, 1.15, 0.34],
    },
  ],
  cageExcludedMajorFurniture: [
    {
      name: 'KITCHEN CABINET LINE',
      sourceMeshes: ['node_0001_Material006_0', 'node_0003_Material009_0'],
      reason: 'MODEL STARTS BEYOND CAMERA CAGE MAX_X_5.05',
    },
  ],
}

export const STUDIO_V2_CAMERA_SAFETY = {
  cameraBounds: {
    min: [-6.55, STUDIO_V2_FLOOR_SAFETY.floorY + STUDIO_V2_FLOOR_SAFETY.cameraFloorClearance, -4.65],
    max: [5.05, 3.72, 3.38],
  },
  targetBounds: {
    min: [-5.65, STUDIO_V2_FLOOR_SAFETY.floorY + STUDIO_V2_FLOOR_SAFETY.targetFloorClearance, -4.45],
    max: [4.85, 2.9, 3.15],
  },
  majorFurnitureColliders: STUDIO_V2_COLLISION_POLICY.majorFurnitureColliders,
  projectionEpsilon: 0.035,
}

export const STUDIO_V2_MATERIAL_TUNING = {
  'Material.005': { category: 'SOFA NORTH / BODY + CUSHIONS', color: '#878988', metalness: 0, roughness: 0.74, envMapIntensity: 0.52 },
  'Material.007': { category: 'SOFA SOUTH / BODY + CUSHIONS', color: '#878988', metalness: 0, roughness: 0.74, envMapIntensity: 0.52 },
  'Material.002': { category: 'FLOOR', color: '#a3a3a0', metalness: 0, roughness: 0.3, envMapIntensity: 1, normalScale: 0.45 },
  'Material.012': { category: 'RUG', metalness: 0, roughness: 0.96, envMapIntensity: 0.24, normalScale: 0.56 },
  StudioV2LightTimber: { category: 'LIGHT WALL / KITCHEN TIMBER', metalness: 0, roughness: 0.52, envMapIntensity: 0.78 },
  StudioV2KitchenTimber: { category: 'KITCHEN TIMBER BACKING', metalness: 0, roughness: 0.55, envMapIntensity: 0.72 },
  StudioV2DarkCeilingTimber: { category: 'DARK TIMBER CEILING', metalness: 0, roughness: 0.6, envMapIntensity: 0.58 },
  StudioV2IslandTimber: { category: 'ISLAND / COUNTER TIMBER', color: '#b89561', metalness: 0, roughness: 0.58, envMapIntensity: 0.58 },
  StudioV2StoolTimber: { category: 'STOOL SEATS', color: '#c6a875', metalness: 0, roughness: 0.56, envMapIntensity: 0.62 },
  StudioV2StoolLegMetal: { category: 'STOOL DARK METAL LEGS', metalness: 0.78, roughness: 0.46, envMapIntensity: 0.86 },
  StudioV2CoffeeTableTop: { category: 'COFFEE-TABLE TOP', metalness: 0.04, roughness: 0.52, envMapIntensity: 0.68 },
  StudioV2CoffeeTableFrame: { category: 'COFFEE-TABLE DARK METAL FRAME', metalness: 0.78, roughness: 0.42, envMapIntensity: 0.9 },
  StudioV2IslandPainted: { category: 'PAINTED KITCHEN ISLAND FRONT', color: '#3b3b3b', metalness: 0.02, roughness: 0.64, envMapIntensity: 0.82 },
  'Plane.001__0': { category: 'SECONDARY CEILING', metalness: 0, roughness: 0.58, envMapIntensity: 0.6 },
  material: { category: 'PAINTED DARK SURFACES', metalness: 0.04, roughness: 0.58, envMapIntensity: 0.7 },
  StudioV2KitchenPainted: { category: 'PAINTED KITCHEN CABINETS / RANGE HOOD', color: '#ffffff', metalness: 0.03, roughness: 0.68, envMapIntensity: 0.72, normalScale: 0.26 },
  StudioV2KitchenMetal: { category: 'KITCHEN WORKTOP / SINK / FAUCET', metalness: 0.78, roughness: 0.4, envMapIntensity: 0.96, normalScale: 0.28 },
  StudioV2KitchenHandle: { category: 'CABINET HANDLES', color: '#d4d4d0', metalness: 0.56, roughness: 0.5, envMapIntensity: 0.76, normalScale: 0.18 },
  StudioV2KitchenKnob: { category: 'OVEN KNOBS / SMALL HARDWARE', color: '#b9b9b4', metalness: 0.2, roughness: 0.72, envMapIntensity: 0.46, normalScale: 0 },
  StudioV2KitchenOvenControl: { category: 'OVEN CONTROL STRIP / HANDLE EDGE', color: '#c1c1bc', metalness: 0.3, roughness: 0.66, envMapIntensity: 0.54, normalScale: 0 },
  StudioV2KitchenOvenHandle: { category: 'OVEN HANDLE / UPPER DOOR TRIM', color: '#9f9f9a', metalness: 0.26, roughness: 0.74, envMapIntensity: 0.42, normalScale: 0 },
  StudioV2KitchenAppliance: { category: 'OVEN / STOVE METAL', metalness: 0.56, roughness: 0.46, envMapIntensity: 0.82, normalScale: 0.24 },
  StudioV2KitchenGlass: { category: 'OVEN GLASS', metalness: 0, roughness: 0.34, envMapIntensity: 0.82, normalScale: 0.18 },
  'Material.009': { category: 'REAR WHITE CABINETS / COATED APPLIANCE', metalness: 0.04, roughness: 0.58, envMapIntensity: 0.7, normalScale: 0.18 },
  'Material.011': { category: 'FURNITURE METAL DETAIL', metalness: 0.9, roughness: 0.26, envMapIntensity: 1.3 },
}

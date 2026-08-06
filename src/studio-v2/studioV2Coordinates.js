import {
  OFFICIAL_CAMERA_SAFE_VOLUME,
  STUDIO_V2_CAMERA_PRESETS,
  STUDIO_V2_CAMERA_SAFETY,
  STUDIO_V2_FLOOR_SAFETY,
  STUDIO_V2_MODEL_TRANSFORM,
} from './studioV2Config';

export const STUDIO_V2_COORDINATE_SYSTEM = Object.freeze({
  handedness: 'right-handed',
  unit: 'world unit',
  metricInterpretation: 'Approximately metres from model proportions; not a certified metric source.',
  axes: Object.freeze({
    x: '+X runs from the living-area opening toward the kitchen/cabinet end.',
    y: '+Y runs upward from the floor toward the ceiling.',
    z: '+Z runs from the window/south side toward the opposite/north interior wall.',
  }),
  origin: Object.freeze([0, 0, 0]),
});

export const STUDIO_V2_FLOOR_Y = STUDIO_V2_FLOOR_SAFETY.floorY;

// Runtime audit of the furnished-loft GLB with the environment sphere excluded.
// Values are intentionally stable, world-space placement references rounded to 3 decimals.
export const STUDIO_V2_INTERIOR_CENTER = Object.freeze([0.105, 2.217, 0.797]);

export const STUDIO_V2_INTERIOR_BOUNDS = Object.freeze({
  min: Object.freeze([-7.039, -0.539, -5.785]),
  max: Object.freeze([7.249, 4.973, 7.379]),
});

export const STUDIO_V2_MODEL_ROOT_TRANSFORM = Object.freeze({
  position: Object.freeze([...STUDIO_V2_MODEL_TRANSFORM.position]),
  rotation: Object.freeze([...STUDIO_V2_MODEL_TRANSFORM.rotation]),
  scale: STUDIO_V2_MODEL_TRANSFORM.scale,
});

export const STUDIO_V2_APPROVED_OPENING_CAMERA = Object.freeze({
  requestedPosition: Object.freeze([...STUDIO_V2_CAMERA_PRESETS.REFERENCE.position]),
  requestedTarget: Object.freeze([...STUDIO_V2_CAMERA_PRESETS.REFERENCE.target]),
  constrainedPosition: Object.freeze([...STUDIO_V2_CAMERA_PRESETS.REFERENCE.position]),
  constrainedTarget: Object.freeze([...OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget]),
});

export const STUDIO_V2_CAMERA_SAFE_BOUNDS = Object.freeze({
  min: Object.freeze([...STUDIO_V2_CAMERA_SAFETY.cameraBounds.min]),
  max: Object.freeze([...STUDIO_V2_CAMERA_SAFETY.cameraBounds.max]),
});

export const STUDIO_V2_TARGET_SAFE_BOUNDS = Object.freeze({
  min: Object.freeze([...STUDIO_V2_CAMERA_SAFETY.targetBounds.min]),
  max: Object.freeze([...STUDIO_V2_CAMERA_SAFETY.targetBounds.max]),
});

export const STUDIO_V2_PLACEMENT_GRID = Object.freeze({
  minX: STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[0],
  maxX: STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[0],
  minZ: STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[2],
  maxZ: STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[2],
  minorStep: 0.25,
  majorStep: 1,
  yOffset: 0.006,
});

export const roundStudioV2Coordinate = (value) => Number(Number(value).toFixed(3));

export const formatStudioV2Vector = (values) =>
  `[${values.map((value) => Number(value).toFixed(3)).join(', ')}]`;

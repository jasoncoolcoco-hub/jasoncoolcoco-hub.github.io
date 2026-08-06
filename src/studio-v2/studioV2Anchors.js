export const STUDIO_V2_ANCHORS = Object.freeze({
  MARSHALL_GUITAR_FLOOR_01: Object.freeze({
    position: Object.freeze([-2.05, 0.021, 1.36]),
    rotation: Object.freeze([0, -0.959931, 0]),
    scale: 1,
    surfaceNormal: Object.freeze([0, 1, 0]),
    note: 'Marshall and guitar setup mirrored to the opening-view right side across the rug boundary; upright with a mirrored -55° intentional diagonal.',
  }),
  MACBOOK_ISLAND_01: Object.freeze({
    position: Object.freeze([0.961, 1.415, -0.05]),
    rotation: Object.freeze([0, 0, 0]),
    scale: 1,
    surfaceNormal: Object.freeze([0, 1, 0]),
    note: 'Verified 16-inch MacBook Pro centered above the opening-view rightmost stool; screen faces the opening camera with approximately 0.20 m living-edge setback.',
  }),
  MACBOOK_DESK: null,
  PHOTO_WALL_01: null,
  PHOTO_WALL_02: null,
  PHOTO_WALL_03: null,
  PROJECT_OBJECT_01: null,
  PROJECT_OBJECT_02: null,
  MAP_WALL: null,
  INTERACTION_POINT_01: null,
});

export const STUDIO_V2_ANCHOR_NAMES = Object.freeze(Object.keys(STUDIO_V2_ANCHORS));

export const STUDIO_V2_PLACEMENT_RULES = Object.freeze({
  desktop: 'Use an upward-facing horizontal surface; offset local base along the picked normal.',
  wallPhoto: 'Use a vertical wall; orient local +Z to the picked outward normal and add a shallow normal offset.',
  floorObject: 'Use FLOOR only; keep the object base at floor Y plus a small z-fighting clearance.',
  interactionPoint: 'Keep inside the target-safe bounds and preserve camera-safe clearance.',
});

const formatVector = (values) => `[${values.map((value) => Number(value).toFixed(3)).join(', ')}]`;

export const formatStudioV2Anchor = (name, anchor) => {
  if (!anchor) return `${name}: null`;

  return [
    `${name}: {`,
    `  position: ${formatVector(anchor.position)},`,
    `  rotation: ${formatVector(anchor.rotation)},`,
    `  scale: ${Array.isArray(anchor.scale) ? formatVector(anchor.scale) : Number(anchor.scale).toFixed(3)},`,
    `  surfaceNormal: ${formatVector(anchor.surfaceNormal)},`,
    `  note: ${JSON.stringify(anchor.note)},`,
    '}',
  ].join('\n');
};

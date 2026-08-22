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
  PHOTO_BOARD_01: Object.freeze({
    position: Object.freeze([4.975, 2.5575, -5.075]),
    rotation: Object.freeze([0, 0, 0]),
    scale: 2,
    surfaceNormal: Object.freeze([0, 0, 1]),
    note: 'Clean cork-board base moved an additional 0.30 m view-left from the prior placement while preserving its fixed view-facing top-left anchor, uniform 2× scale, height, depth, and rotation.',
  }),
  POLAROID_CAMERA_01: Object.freeze({
    position: Object.freeze([1.46, 1.417, -3.72]),
    rotation: Object.freeze([0, -1.34, 0]),
    scale: 1,
    surfaceNormal: Object.freeze([0, 1, 0]),
    note: 'Static Polaroid camera in the rear wall-side desk zone, visually connected to the photo wall and clear of the MacBook and folder.',
  }),
  STANMORE_SPEAKER_01: Object.freeze({
    position: Object.freeze([1.34, 1.417, -1.05]),
    rotation: Object.freeze([0, -1.570796, 0]),
    scale: 1,
    surfaceNormal: Object.freeze([0, 1, 0]),
    note: 'Static Stanmore III desk prop on the opening-view left of the MacBook, moved inward from the stool edge toward the Polaroid desk band with its front grille facing the main room camera.',
  }),
  DOCUMENT_FOLDER_01: Object.freeze({
    position: Object.freeze([0.94, 1.417, -0.42]),
    rotation: Object.freeze([0, -1.710796, 0]),
    scale: 1,
    surfaceNormal: Object.freeze([0, 1, 0]),
    note: 'A4 folder at the seated-left of the MacBook, rotated 90° clockwise from the accepted Pass 1 follow-up pose while preserving seated reach and future opening clearance.',
  }),
  POLAROID_WALL_DISPLAY_GROUP: null,
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

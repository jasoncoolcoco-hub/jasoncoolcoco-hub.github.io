import {
  OFFICIAL_CAMERA_SAFE_VOLUME,
  OFFICIAL_VIEW_MAX_AZIMUTH,
  OFFICIAL_VIEW_MIN_AZIMUTH,
  STUDIO_V2_CAMERA_PRESETS,
  STUDIO_V2_CONTROLS,
  STUDIO_V2_DEFAULT_CAMERA,
  STUDIO_V2_OFFICIAL_CONTROLS,
} from './studioV2Config'

export const STUDIO_V2_CAMERA_STATES = Object.freeze({
  ROOM_ORBIT: 'ROOM_ORBIT',
  ROOM_WIDE_START: 'ROOM_WIDE_START',
  AMBIENT_DRIFT: 'AMBIENT_DRIFT',
  AMBIENT_USER_OVERRIDE: 'AMBIENT_USER_OVERRIDE',
  TABLE_OVERVIEW: 'TABLE_OVERVIEW',
  TABLE_SKIP_TRANSITION: 'TABLE_SKIP_TRANSITION',
  TABLE_FREE_ORBIT: 'TABLE_FREE_ORBIT',
  PHOTO_WALL_FOCUS_TRANSITION: 'PHOTO_WALL_FOCUS_TRANSITION',
  PHOTO_WALL_FOCUS: 'PHOTO_WALL_FOCUS',
  PHOTO_WALL_EXIT_TRANSITION: 'PHOTO_WALL_EXIT_TRANSITION',
  MACBOOK_FOCUS_TRANSITION: 'MACBOOK_FOCUS_TRANSITION',
  MACBOOK_FOCUS: 'MACBOOK_FOCUS',
  MACBOOK_EXIT_TRANSITION: 'MACBOOK_EXIT_TRANSITION',
  FOLDER_FOCUS: 'FOLDER_FOCUS',
  POLAROID_FOCUS: 'POLAROID_FOCUS',
  OTHER_OBJECT_FOCUS: 'OTHER_OBJECT_FOCUS',
})

const acceptedOpening = STUDIO_V2_CAMERA_PRESETS[STUDIO_V2_DEFAULT_CAMERA]

export const STUDIO_V2_ACCEPTED_OPENING_POSE = Object.freeze({
  id: 'CURRENT_OPENING',
  state: STUDIO_V2_CAMERA_STATES.ROOM_ORBIT,
  position: Object.freeze([...acceptedOpening.position]),
  target: Object.freeze([...OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget]),
  fov: acceptedOpening.fov,
  near: acceptedOpening.near,
  far: acceptedOpening.far,
})

export const STUDIO_V2_ROOM_WIDE_START_POSE = Object.freeze({
  id: 'ROOM_WIDE_START',
  state: STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
  position: Object.freeze([-6.38, 2.18, 0.36]),
  target: Object.freeze([-1.8, 1.62, 0.12]),
  fov: 56,
  near: acceptedOpening.near,
  far: acceptedOpening.far,
})

export const STUDIO_V2_TABLE_OVERVIEW_POSE = Object.freeze({
  id: 'TABLE_OVERVIEW',
  state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
  position: Object.freeze([0.48, 2.16, 1.12]),
  target: Object.freeze([1.3, 1.43, -0.12]),
  fov: 50,
  near: acceptedOpening.near,
  far: acceptedOpening.far,
})

const acceptedPhotoWallReview = STUDIO_V2_CAMERA_PRESETS.PHOTO_WALL_REVIEW

export const STUDIO_V2_PHOTO_WALL_FOCUS_POSE = Object.freeze({
  id: 'PHOTO_WALL_FOCUS',
  state: STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS,
  position: Object.freeze([...acceptedPhotoWallReview.position]),
  target: Object.freeze([...acceptedPhotoWallReview.target]),
  fov: acceptedPhotoWallReview.fov,
  near: acceptedPhotoWallReview.near,
  far: acceptedPhotoWallReview.far,
})

export const STUDIO_V2_TABLE_OVERVIEW_CANDIDATES = Object.freeze({
  CURRENT_CLOSE: Object.freeze({
    id: 'CURRENT_CLOSE', state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([0.42, 2.12, 0.2]),
    target: Object.freeze([0.96, 1.5, -0.05]),
    fov: 49, near: acceptedOpening.near, far: acceptedOpening.far,
  }),
  OVERVIEW_A: Object.freeze({
    id: 'OVERVIEW_A', state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([0.42, 2.14, 0.95]),
    target: Object.freeze([0.96, 1.4, -0.08]),
    fov: 49, near: acceptedOpening.near, far: acceptedOpening.far,
  }),
  OVERVIEW_B: Object.freeze({
    ...STUDIO_V2_TABLE_OVERVIEW_POSE,
    id: 'OVERVIEW_B',
  }),
  OVERVIEW_C: Object.freeze({
    id: 'OVERVIEW_C', state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([0.42, 2.22, 1.65]),
    target: Object.freeze([0.96, 1.42, -0.2]),
    fov: 52, near: acceptedOpening.near, far: acceptedOpening.far,
  }),
})

export const STUDIO_V2_CAMERA_POSES = Object.freeze({
  CURRENT_OPENING: STUDIO_V2_ACCEPTED_OPENING_POSE,
  ROOM_WIDE_START: STUDIO_V2_ROOM_WIDE_START_POSE,
  TABLE_OVERVIEW: STUDIO_V2_TABLE_OVERVIEW_POSE,
  PHOTO_WALL_FOCUS: STUDIO_V2_PHOTO_WALL_FOCUS_POSE,
  ...STUDIO_V2_TABLE_OVERVIEW_CANDIDATES,
  ROOM_WIDE_START_CANDIDATE: Object.freeze({
    id: 'ROOM_WIDE_START_CANDIDATE',
    state: STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START,
    position: Object.freeze([-6.36, 1.95, 0.48]),
    target: Object.freeze([...OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget]),
    fov: acceptedOpening.fov,
    near: acceptedOpening.near,
    far: acceptedOpening.far,
  }),
  TABLE_OVERVIEW_CANDIDATE: Object.freeze({
    id: 'TABLE_OVERVIEW_CANDIDATE',
    state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([-6.24, 1.84, 0.03]),
    target: Object.freeze([...OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget]),
    fov: acceptedOpening.fov,
    near: acceptedOpening.near,
    far: acceptedOpening.far,
  }),
  PAST_STOOLS_A: Object.freeze({
    id: 'PAST_STOOLS_A',
    state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([0.32, 2.06, 0.22]),
    target: Object.freeze([0.96, 1.49, -0.05]),
    fov: 50,
    near: acceptedOpening.near,
    far: acceptedOpening.far,
  }),
  PAST_STOOLS_B: STUDIO_V2_TABLE_OVERVIEW_POSE,
  PAST_STOOLS_C: Object.freeze({
    id: 'PAST_STOOLS_C',
    state: STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW,
    position: Object.freeze([0.5, 2.2, 0.16]),
    target: Object.freeze([0.96, 1.52, -0.05]),
    fov: 48,
    near: acceptedOpening.near,
    far: acceptedOpening.far,
  }),
})

export const STUDIO_V2_CANONICAL_CAMERA_POSES = Object.freeze({
  [STUDIO_V2_CAMERA_STATES.ROOM_ORBIT]: STUDIO_V2_ACCEPTED_OPENING_POSE,
  [STUDIO_V2_CAMERA_STATES.ROOM_WIDE_START]: STUDIO_V2_ROOM_WIDE_START_POSE,
  [STUDIO_V2_CAMERA_STATES.TABLE_OVERVIEW]: STUDIO_V2_TABLE_OVERVIEW_POSE,
  [STUDIO_V2_CAMERA_STATES.TABLE_FREE_ORBIT]: STUDIO_V2_TABLE_OVERVIEW_POSE,
  [STUDIO_V2_CAMERA_STATES.PHOTO_WALL_FOCUS]: STUDIO_V2_PHOTO_WALL_FOCUS_POSE,
})

export const STUDIO_V2_CAMERA_BASELINE = Object.freeze({
  activeState: STUDIO_V2_CAMERA_STATES.ROOM_ORBIT,
  defaultPose: STUDIO_V2_DEFAULT_CAMERA,
  openingPose: STUDIO_V2_ACCEPTED_OPENING_POSE,
  orbit: Object.freeze({
    damping: true,
    dampingFactor: STUDIO_V2_OFFICIAL_CONTROLS.dampingFactor,
    enablePan: false,
    enableRotate: true,
    enableZoom: OFFICIAL_CAMERA_SAFE_VOLUME.zoom,
    minDistance: STUDIO_V2_OFFICIAL_CONTROLS.minDistance,
    maxDistance: STUDIO_V2_OFFICIAL_CONTROLS.maxDistance,
    minPolarAngle: STUDIO_V2_OFFICIAL_CONTROLS.minPolarAngle,
    maxPolarAngle: STUDIO_V2_OFFICIAL_CONTROLS.maxPolarAngle,
    minAzimuthAngle: OFFICIAL_VIEW_MIN_AZIMUTH,
    maxAzimuthAngle: OFFICIAL_VIEW_MAX_AZIMUTH,
    rotateSpeed: STUDIO_V2_CONTROLS.rotateSpeed,
    zoomSpeed: STUDIO_V2_CONTROLS.zoomSpeed,
    panSpeed: STUDIO_V2_CONTROLS.panSpeed,
  }),
})

export function studioV2CameraPose(poseOrState) {
  if (!poseOrState) return STUDIO_V2_ACCEPTED_OPENING_POSE
  if (typeof poseOrState === 'object') return poseOrState
  if (poseOrState in STUDIO_V2_CAMERA_POSES) return STUDIO_V2_CAMERA_POSES[poseOrState]
  return Object.values(STUDIO_V2_CAMERA_POSES)
    .find(({ state }) => state === poseOrState) ?? STUDIO_V2_ACCEPTED_OPENING_POSE
}

export function getStudioV2CanonicalCameraPose(state) {
  return STUDIO_V2_CANONICAL_CAMERA_POSES[state] ?? null
}

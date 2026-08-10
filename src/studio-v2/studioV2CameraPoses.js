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
  TABLE_FREE_ORBIT: 'TABLE_FREE_ORBIT',
  MACBOOK_FOCUS: 'MACBOOK_FOCUS',
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

export const STUDIO_V2_CAMERA_POSES = Object.freeze({
  CURRENT_OPENING: STUDIO_V2_ACCEPTED_OPENING_POSE,
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

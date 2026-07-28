export const footprintsSceneStates = Object.freeze({
  GLOBE_IDLE: 'GLOBE_IDLE',
  GLOBE_HOVER: 'GLOBE_HOVER',
  GLOBE_SELECTED: 'GLOBE_SELECTED',
  ENTERING_MEMORY: 'ENTERING_MEMORY',
  PHOTO_SPACE: 'PHOTO_SPACE',
  EXITING_MEMORY: 'EXITING_MEMORY',
})

export const globeBrowsingStates = new Set([
  footprintsSceneStates.GLOBE_IDLE,
  footprintsSceneStates.GLOBE_HOVER,
  footprintsSceneStates.GLOBE_SELECTED,
])

export const transitionStates = new Set([
  footprintsSceneStates.ENTERING_MEMORY,
  footprintsSceneStates.EXITING_MEMORY,
])

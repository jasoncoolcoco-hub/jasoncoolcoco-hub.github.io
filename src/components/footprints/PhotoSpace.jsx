import { footprintsSceneStates } from './footprintsSceneState'

export default function PhotoSpace({ sceneState }) {
  const isActive = sceneState === footprintsSceneStates.PHOTO_SPACE

  return (
    <div
      className="footprints-photo-space-layer"
      data-active={isActive ? 'true' : 'false'}
      aria-hidden={!isActive}
    />
  )
}

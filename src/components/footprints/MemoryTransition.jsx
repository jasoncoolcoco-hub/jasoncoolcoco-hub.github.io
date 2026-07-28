import { transitionStates } from './footprintsSceneState'

export default function MemoryTransition({ sceneState }) {
  const isActive = transitionStates.has(sceneState)

  return (
    <div
      className="footprints-memory-transition-layer"
      data-active={isActive ? 'true' : 'false'}
      aria-hidden="true"
    />
  )
}

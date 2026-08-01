export default function FootprintsBackground({ sceneState }) {
  return (
    <div
      className="footprints-background-layer"
      data-scene-state={sceneState}
      aria-hidden="true"
    >
      <div className="footprints-section__grain" />
    </div>
  )
}

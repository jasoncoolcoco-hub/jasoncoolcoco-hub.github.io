import { motion } from 'motion/react'
import EarthCanvas from './EarthCanvas'
import { footprintsSceneStates } from './footprintsSceneState'

export default function GlobeScene({
  annotationsActive = true,
  projectsTransitionProgress,
  controlsEnabled,
  entranceOpacity,
  entranceScale,
  entranceY,
  exitScale,
  exitY,
  entryProgress,
  instructions,
  label,
  onSelectionChange,
  reducedMotion,
  sceneState,
  scrollRotation,
  toggleLabel,
}) {
  const isElevated =
    sceneState === footprintsSceneStates.ENTERING_MEMORY

  return (
    <div
      className="footprints-globe-layer"
      data-elevated={isElevated ? 'true' : 'false'}
      data-scene-state={sceneState}
    >
      <motion.div
        className="footprints-globe-entrance"
        style={{
          y: entranceY,
          scale: reducedMotion ? 1 : entranceScale,
          opacity: reducedMotion ? 1 : entranceOpacity,
        }}
      >
        <motion.div
          className="footprints-globe-exit"
          style={{ y: exitY, scale: exitScale }}
        >
          <EarthCanvas
            annotationsActive={annotationsActive}
            projectsTransitionProgress={projectsTransitionProgress}
            controlsEnabled={controlsEnabled}
            entryProgress={entryProgress}
            instructions={instructions}
            label={label}
            onSelectionChange={onSelectionChange}
            reducedMotion={reducedMotion}
            sceneState={sceneState}
            scrollRotation={scrollRotation}
            toggleLabel={toggleLabel}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

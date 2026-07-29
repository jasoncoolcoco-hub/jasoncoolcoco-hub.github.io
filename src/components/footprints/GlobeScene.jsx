import { motion } from 'motion/react'
import EarthCanvas from './EarthCanvas'
import { footprintsSceneStates } from './footprintsSceneState'

export default function GlobeScene({
  controlsEnabled,
  entranceOpacity,
  entranceScale,
  entranceY,
  exitOpacity,
  exitScale,
  exitY,
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
        style={
          reducedMotion
            ? { opacity: 1 }
            : {
                y: entranceY,
                scale: entranceScale,
                opacity: entranceOpacity,
              }
        }
      >
        <motion.div
          className="footprints-globe-exit"
          style={
            reducedMotion
              ? { opacity: 1 }
              : {
                  y: exitY,
                  scale: exitScale,
                  opacity: exitOpacity,
                }
          }
        >
          <EarthCanvas
            controlsEnabled={controlsEnabled}
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

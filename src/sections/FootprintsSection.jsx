import { motion, useReducedMotion, useTransform } from 'motion/react'
import { useCallback, useState } from 'react'
import FootprintsBackground from '../components/footprints/FootprintsBackground'
import GlobeScene from '../components/footprints/GlobeScene'
import MemoryTransition from '../components/footprints/MemoryTransition'
import PhotoSpace from '../components/footprints/PhotoSpace'
import {
  footprintsSceneStates,
  globeBrowsingStates,
} from '../components/footprints/footprintsSceneState'
import { siteContent } from '../data/siteContent'
import ProjectsSection from './ProjectsSection'

export default function FootprintsSection({
  projectsTransitionProgress,
  backgroundY,
  chapterProgress,
  globeEntranceY,
  transitionProgress,
}) {
  const [sceneState, setSceneState] = useState(
    footprintsSceneStates.GLOBE_IDLE,
  )
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const prefersReducedMotion = Boolean(useReducedMotion())
  const reducedMotion =
    prefersReducedMotion ||
    (import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('reduce-motion') === '1')
  const { footprints } = siteContent

  const exitY = useTransform(
    projectsTransitionProgress,
    [0, 0.38],
    ['0vh', reducedMotion ? '-92vh' : '-112vh'],
  )
  const exitScale = useTransform(
    projectsTransitionProgress,
    [0, 0.38],
    [1, reducedMotion ? 0.97 : 0.94],
  )
  const footprintsExitY = useTransform(
    projectsTransitionProgress,
    [0.18, 0.66],
    ['0vh', '-100vh'],
  )
  const scrollRotation = useTransform(
    chapterProgress,
    [0, 0.7, 1],
    [0, 0, 150],
  )

  const handleSelectionChange = useCallback((selection) => {
    setSelectedTargetId(selection?.id ?? null)
    setSceneState(
      selection
        ? footprintsSceneStates.GLOBE_SELECTED
        : footprintsSceneStates.GLOBE_IDLE,
    )
  }, [])

  const controlsEnabled = globeBrowsingStates.has(sceneState)

  return (
    <section
      className="footprints-section"
      aria-labelledby="footprints-title"
      data-scene-state={sceneState}
      data-selected-target={selectedTargetId ?? undefined}
    >
      <div className="footprints-section__sticky">
        <motion.div
          className="footprints-page-surface"
          style={{ y: backgroundY }}
        >
          <motion.div
            className="footprints-page-surface__handoff"
            style={{ y: footprintsExitY }}
          >
            <FootprintsBackground sceneState={sceneState} />
            <h2 id="footprints-title" className="footprints-page-title">
              {footprints.title}
            </h2>
          </motion.div>
        </motion.div>

        <ProjectsSection
          progress={projectsTransitionProgress}
          reducedMotion={reducedMotion}
        />

        <GlobeScene
          projectsTransitionProgress={projectsTransitionProgress}
          controlsEnabled={controlsEnabled}
          entranceOpacity={1}
          entranceScale={1}
          entranceY={globeEntranceY}
          exitScale={exitScale}
          exitY={exitY}
          entryProgress={transitionProgress}
          instructions={footprints.globeInstructions}
          label={footprints.globeLabel}
          onSelectionChange={handleSelectionChange}
          reducedMotion={reducedMotion}
          sceneState={sceneState}
          scrollRotation={scrollRotation}
          toggleLabel={footprints.globeToggleLabel}
        />

        <PhotoSpace sceneState={sceneState} />
        <MemoryTransition sceneState={sceneState} />
      </div>
    </section>
  )
}

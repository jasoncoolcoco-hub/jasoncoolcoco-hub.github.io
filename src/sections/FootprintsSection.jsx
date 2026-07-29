import { useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useCallback, useRef, useState } from 'react'
import ChapterNavigation from '../components/footprints/ChapterNavigation'
import FootprintsBackground from '../components/footprints/FootprintsBackground'
import GlobeScene from '../components/footprints/GlobeScene'
import MemoryTransition from '../components/footprints/MemoryTransition'
import PhotoSpace from '../components/footprints/PhotoSpace'
import {
  footprintsSceneStates,
  globeBrowsingStates,
} from '../components/footprints/footprintsSceneState'
import { siteContent } from '../data/siteContent'

export default function FootprintsSection() {
  const sectionRef = useRef(null)
  const [sceneState, setSceneState] = useState(
    footprintsSceneStates.GLOBE_IDLE,
  )
  const [selectedTargetId, setSelectedTargetId] = useState(null)
  const prefersReducedMotion = Boolean(useReducedMotion())
  const reducedMotion =
    prefersReducedMotion ||
    (import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('reduce-motion') === '1')
  const { chapters, navigation, footprints } = siteContent
  const { scrollYProgress: arrivalProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'start start'],
  })
  const { scrollYProgress: chapterProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })

  const entranceY = useTransform(arrivalProgress, [0, 1], ['28vh', '0vh'])
  const entranceScale = useTransform(arrivalProgress, [0, 1], [0.56, 1])
  const entranceOpacity = useTransform(arrivalProgress, [0, 0.18, 1], [0, 0.3, 1])
  const exitY = useTransform(
    chapterProgress,
    [0, 0.7, 1],
    ['0vh', '0vh', '-24vh'],
  )
  const exitScale = useTransform(chapterProgress, [0, 0.7, 1], [1, 1, 0.55])
  const exitOpacity = useTransform(chapterProgress, [0, 0.78, 1], [1, 1, 0.08])
  const scrollRotation = useTransform(
    [arrivalProgress, chapterProgress],
    ([arrival, chapter]) => {
      const entranceRotation = -150 + arrival * 150
      const exitRotation = chapter <= 0.7 ? 0 : ((chapter - 0.7) / 0.3) * 150
      return entranceRotation + exitRotation
    },
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
      ref={sectionRef}
      id="footprints"
      className="footprints-section"
      aria-labelledby="footprints-title"
      data-scene-state={sceneState}
      data-selected-target={selectedTargetId ?? undefined}
    >
      <div className="footprints-section__sticky">
        <FootprintsBackground sceneState={sceneState} />

        <ChapterNavigation
          chapters={chapters}
          navigation={navigation}
          reducedMotion={reducedMotion}
          sceneState={sceneState}
        />

        <h2 id="footprints-title" className="sr-only">
          {footprints.title}
        </h2>

        <GlobeScene
          controlsEnabled={controlsEnabled}
          entranceOpacity={entranceOpacity}
          entranceScale={entranceScale}
          entranceY={entranceY}
          exitOpacity={exitOpacity}
          exitScale={exitScale}
          exitY={exitY}
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

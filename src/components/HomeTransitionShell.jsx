import { useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import FootprintsSection from '../sections/FootprintsSection'
import HomeSection from '../sections/HomeSection'
import TransitionChapterNavigation from './TransitionChapterNavigation'

const transitionScrollDistance = 170
const footprintsScrollDistance = 220
const projectsTransitionScrollDistance = 180
const projectsChapterScrollDistance = 120
const totalScrollDistance =
  transitionScrollDistance +
  footprintsScrollDistance +
  projectsTransitionScrollDistance +
  projectsChapterScrollDistance
const transitionEnd = transitionScrollDistance / totalScrollDistance
const footprintsEnd =
  (transitionScrollDistance + footprintsScrollDistance) /
  totalScrollDistance
const projectsTransitionEnd =
  (transitionScrollDistance +
    footprintsScrollDistance +
    projectsTransitionScrollDistance) /
  totalScrollDistance
const compactTransitionQuery = '(max-width: 700px)'

export default function HomeTransitionShell() {
  const shellRef = useRef(null)
  const [homeReady, setHomeReady] = useState(false)
  const [compactTransition, setCompactTransition] = useState(() =>
    window.matchMedia(compactTransitionQuery).matches,
  )
  const reducedMotion = Boolean(useReducedMotion())

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactTransitionQuery)
    const handleChange = (event) => setCompactTransition(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ['start start', 'end end'],
  })
  const transitionProgress = useTransform(
    scrollYProgress,
    [0, transitionEnd],
    [0, 1],
  )
  const chapterProgress = useTransform(
    scrollYProgress,
    [transitionEnd, footprintsEnd],
    [0, 1],
  )
  const projectsTransitionProgress = useTransform(
    scrollYProgress,
    [footprintsEnd, projectsTransitionEnd],
    [0, 1],
  )
  const homeWhiteShellY = useTransform(
    transitionProgress,
    [0, 0.35],
    ['0vh', '-100vh'],
  )
  const footprintsBackgroundY = useTransform(
    transitionProgress,
    [0, 0.35],
    ['100vh', '0vh'],
  )
  const homeHeroY = useTransform(
    transitionProgress,
    [0.42, 0.7],
    ['0vh', reducedMotion ? '-100vh' : '-102vh'],
  )
  const globeEntranceY = useTransform(
    transitionProgress,
    [0.68, 1],
    [compactTransition ? '72vh' : reducedMotion ? '82vh' : '86vh', '0vh'],
  )
  const handleHomeReady = useCallback(() => setHomeReady(true), [])

  return (
    <div ref={shellRef} className="home-transition-shell">
      <span
        id="footprints"
        className="footprints-scroll-anchor"
        aria-hidden="true"
      />
      <span
        id="projects-anchor"
        className="projects-scroll-anchor"
        aria-hidden="true"
      />

      <div className="home-transition-shell__sticky">
        <FootprintsSection
          projectsTransitionProgress={projectsTransitionProgress}
          backgroundY={footprintsBackgroundY}
          chapterProgress={chapterProgress}
          globeEntranceY={globeEntranceY}
          transitionProgress={transitionProgress}
        />

        <HomeSection
          heroY={homeHeroY}
          onReady={handleHomeReady}
          showNavigation={false}
          whiteShellY={homeWhiteShellY}
        />

        {homeReady && (
          <TransitionChapterNavigation
            projectsProgress={projectsTransitionProgress}
            progress={transitionProgress}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  )
}

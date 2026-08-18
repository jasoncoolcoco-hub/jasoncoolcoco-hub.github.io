import { useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import FootprintsSection from '../sections/FootprintsSection'
import HomeSection from '../sections/HomeSection'
import TransitionChapterNavigation from './TransitionChapterNavigation'

const transitionScrollDistance = 170
const footprintsScrollDistance = 220
const projectsTransitionScrollDistance = 180
const projectsChapterScrollDistance = 120
const fullScrollDistance =
  transitionScrollDistance +
  footprintsScrollDistance +
  projectsTransitionScrollDistance +
  projectsChapterScrollDistance
const compactTransitionQuery = '(max-width: 700px)'
const v09ChapterIds = Object.freeze(['home', 'footprints'])

export default function HomeTransitionShell({
  annotationsActive = true,
  releaseScope = 'full',
  scrollContainerRef,
}) {
  const shellRef = useRef(null)
  const [homeReady, setHomeReady] = useState(false)
  const [compactTransition, setCompactTransition] = useState(() =>
    window.matchMedia(compactTransitionQuery).matches,
  )
  const reducedMotion = Boolean(useReducedMotion())
  const includeProjects = releaseScope !== 'v0.9'
  const totalScrollDistance = includeProjects
    ? fullScrollDistance
    : transitionScrollDistance + footprintsScrollDistance
  const transitionEnd = transitionScrollDistance / totalScrollDistance
  const footprintsEnd =
    (transitionScrollDistance + footprintsScrollDistance) /
    totalScrollDistance
  const projectsTransitionEnd =
    (transitionScrollDistance +
      footprintsScrollDistance +
      projectsTransitionScrollDistance) /
    totalScrollDistance

  useEffect(() => {
    const mediaQuery = window.matchMedia(compactTransitionQuery)
    const handleChange = (event) => setCompactTransition(event.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
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
    <div
      ref={shellRef}
      className={`home-transition-shell${includeProjects ? '' : ' home-transition-shell--v0-9'}`}
      data-release-scope={releaseScope}
    >
      <span
        id="footprints"
        className="footprints-scroll-anchor"
        aria-hidden="true"
      />
      {includeProjects && (
        <span
          id="projects-anchor"
          className="projects-scroll-anchor"
          aria-hidden="true"
        />
      )}

      <div className="home-transition-shell__sticky">
        <FootprintsSection
          annotationsActive={annotationsActive}
          projectsTransitionProgress={projectsTransitionProgress}
          backgroundY={footprintsBackgroundY}
          chapterProgress={chapterProgress}
          globeEntranceY={globeEntranceY}
          showProjects={includeProjects}
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
            visibleChapterIds={includeProjects ? undefined : v09ChapterIds}
            projectsProgress={projectsTransitionProgress}
            progress={transitionProgress}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  )
}

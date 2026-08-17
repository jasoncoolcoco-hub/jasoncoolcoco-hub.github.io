import { motion, useTransform } from 'motion/react'
import { siteContent } from '../data/siteContent'

export default function TransitionChapterNavigation({
  projectsProgress,
  progress,
  reducedMotion,
  visibleChapterIds,
}) {
  const { chapters, navigation } = siteContent
  const visibleChapters = visibleChapterIds
    ? chapters.filter((chapter) => visibleChapterIds.includes(chapter.id))
    : chapters
  const transitionRange = reducedMotion ? [0.08, 0.2] : [0.12, 0.24]
  const homeColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 1)', 'rgba(244, 241, 234, 0.42)'],
  )
  const footprintsEntryColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 0.28)', 'rgba(244, 241, 234, 1)'],
  )
  const futureEntryColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 0.28)', 'rgba(244, 241, 234, 0.42)'],
  )
  const homeWeight = useTransform(progress, transitionRange, [700, 500])
  const footprintsEntryWeight = useTransform(
    progress,
    transitionRange,
    [500, 700],
  )
  const homeMarkerOpacity = useTransform(progress, transitionRange, [1, 0])
  const footprintsEntryMarkerOpacity = useTransform(
    progress,
    transitionRange,
    [0, 1],
  )
  const projectsTransitionRange = reducedMotion ? [0.3, 0.48] : [0.34, 0.56]
  const footprintsExitColor = useTransform(
    projectsProgress,
    projectsTransitionRange,
    ['rgba(244, 241, 234, 1)', 'rgba(244, 241, 234, 0.42)'],
  )
  const projectsExitColor = useTransform(
    projectsProgress,
    projectsTransitionRange,
    ['rgba(244, 241, 234, 0.42)', 'rgba(244, 241, 234, 1)'],
  )
  const footprintsExitWeight = useTransform(
    projectsProgress,
    projectsTransitionRange,
    [700, 500],
  )
  const projectsWeight = useTransform(
    projectsProgress,
    projectsTransitionRange,
    [500, 700],
  )
  const footprintsColor = useTransform(() =>
    projectsProgress.get() < projectsTransitionRange[0]
      ? footprintsEntryColor.get()
      : footprintsExitColor.get(),
  )
  const footprintsWeight = useTransform(() =>
    projectsProgress.get() < projectsTransitionRange[0]
      ? footprintsEntryWeight.get()
      : footprintsExitWeight.get(),
  )
  const projectsColor = useTransform(() =>
    projectsProgress.get() < projectsTransitionRange[0]
      ? futureEntryColor.get()
      : projectsExitColor.get(),
  )
  const footprintsMarkerOpacity = useTransform(() => {
    const entryOpacity = footprintsEntryMarkerOpacity.get()
    const handoffProgress = projectsProgress.get()
    const handoffStart = projectsTransitionRange[0]
    const handoffEnd = projectsTransitionRange[1]
    const handoffOpacity = Math.max(
      0,
      Math.min(1, (handoffEnd - handoffProgress) / (handoffEnd - handoffStart)),
    )
    return entryOpacity * handoffOpacity
  })
  const projectsMarkerOpacity = useTransform(
    projectsProgress,
    projectsTransitionRange,
    [0, 1],
  )

  return (
    <nav
      className="transition-chapter-navigation"
      aria-label={navigation.label}
      data-home-directory="true"
    >
      <ol className="transition-chapter-list">
        {visibleChapters.map((chapter) => {
          const isHome = chapter.id === 'home'
          const isFootprints = chapter.id === 'footprints'
          const isProjects = chapter.id === 'projects'
          const canNavigate = chapter.id && chapter.status !== 'soon'
          const color = isHome
            ? homeColor
            : isFootprints
              ? footprintsColor
              : isProjects
                ? projectsColor
                : futureEntryColor
          const fontWeight = isHome
            ? homeWeight
            : isFootprints
              ? footprintsWeight
              : isProjects
                ? projectsWeight
                : 500
          const markerOpacity = isHome
            ? homeMarkerOpacity
            : isFootprints
              ? footprintsMarkerOpacity
              : isProjects
                ? projectsMarkerOpacity
                : null

          return (
            <motion.li
              key={chapter.number}
              className="transition-chapter-list__item"
              style={{ color, fontWeight }}
            >
              {markerOpacity && (
                <motion.span
                  className="transition-chapter-list__marker"
                  style={{ opacity: markerOpacity }}
                  aria-hidden="true"
                />
              )}
              {canNavigate ? (
                <a
                  href={`#${chapter.anchorId ?? chapter.id}`}
                  aria-label={chapter.name}
                >
                  {chapter.number}
                </a>
              ) : (
                <span>{chapter.number}</span>
              )}
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}

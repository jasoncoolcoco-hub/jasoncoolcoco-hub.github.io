import { motion, useTransform } from 'motion/react'
import { siteContent } from '../data/siteContent'

export default function TransitionChapterNavigation({ progress, reducedMotion }) {
  const { chapters, navigation } = siteContent
  const transitionRange = reducedMotion ? [0.08, 0.2] : [0.12, 0.24]
  const homeColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 1)', 'rgba(244, 241, 234, 0.42)'],
  )
  const footprintsColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 0.28)', 'rgba(244, 241, 234, 1)'],
  )
  const futureColor = useTransform(
    progress,
    transitionRange,
    ['rgba(23, 23, 23, 0.28)', 'rgba(244, 241, 234, 0.42)'],
  )
  const homeWeight = useTransform(progress, transitionRange, [700, 500])
  const footprintsWeight = useTransform(progress, transitionRange, [500, 700])
  const homeMarkerOpacity = useTransform(progress, transitionRange, [1, 0])
  const footprintsMarkerOpacity = useTransform(progress, transitionRange, [0, 1])

  return (
    <nav
      className="transition-chapter-navigation"
      aria-label={navigation.label}
      data-home-directory="true"
    >
      <ol className="transition-chapter-list">
        {chapters.map((chapter) => {
          const isHome = chapter.id === 'home'
          const isFootprints = chapter.id === 'footprints'
          const canNavigate = chapter.id && chapter.status !== 'soon'
          const color = isHome
            ? homeColor
            : isFootprints
              ? footprintsColor
              : futureColor
          const fontWeight = isHome
            ? homeWeight
            : isFootprints
              ? footprintsWeight
              : 500
          const markerOpacity = isHome
            ? homeMarkerOpacity
            : isFootprints
              ? footprintsMarkerOpacity
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
                <a href={`#${chapter.id}`} aria-label={chapter.name}>
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

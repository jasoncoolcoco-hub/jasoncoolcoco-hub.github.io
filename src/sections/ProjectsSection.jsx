import { motion, useTransform } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { siteContent } from '../data/siteContent'

const folderPalette = [
  {
    fill: 'var(--folder-personal)',
    interior: 'var(--folder-personal-interior)',
    tabOffset: 'clamp(18px, 2.4vw, 36px)',
    tabOffsetMobile: '8px',
  },
  {
    fill: 'var(--folder-literature)',
    interior: 'var(--folder-literature-interior)',
    tabOffset: 'clamp(128px, 14vw, 214px)',
    tabOffsetMobile: '28px',
  },
  {
    fill: 'var(--folder-tender)',
    interior: 'var(--folder-tender-interior)',
    tabOffset: 'clamp(54px, 6.5vw, 102px)',
    tabOffsetMobile: '15px',
  },
  {
    fill: 'var(--folder-job)',
    interior: 'var(--folder-job-interior)',
    tabOffset: 'clamp(196px, 23vw, 350px)',
    tabOffsetMobile: '42px',
  },
  {
    fill: 'var(--folder-pet)',
    interior: 'var(--folder-pet-interior)',
    tabOffset: 'clamp(88px, 10.5vw, 162px)',
    tabOffsetMobile: '21px',
  },
]

const coarsePointerQuery = '(hover: none), (pointer: coarse)'
const revealOffset = 96
const foregroundStackTransition = {
  type: 'spring',
  stiffness: 165,
  damping: 25,
  mass: 0.9,
}

function SleeveBase() {
  return (
    <span className="projects-folder-back" aria-hidden="true">
      <span className="projects-folder-texture" />
    </span>
  )
}

function SleeveTab() {
  return (
    <span className="projects-folder-tab" aria-hidden="true">
      <span className="projects-folder-texture" />
    </span>
  )
}

function SleeveInterior() {
  return (
    <span className="projects-folder-interior" aria-hidden="true">
      <span className="projects-folder-texture" />
    </span>
  )
}

function SleeveDescription({ id, project }) {
  return (
    <span id={id} className="projects-folder-description">
      {project.descriptor}
    </span>
  )
}

function SleeveFace({ isActive }) {
  return (
    <span className="projects-folder-front" aria-hidden="true">
      <span className="projects-folder-texture" />
      {isActive && (
        <span className="projects-folder-front__placeholder">
          <span />
          <span />
          <span />
        </span>
      )}
    </span>
  )
}

function SleeveEdge() {
  return <span className="projects-folder-edge" aria-hidden="true" />
}

function SleeveRear() {
  return (
    <span className="projects-folder-rear" aria-hidden="true">
      <SleeveBase />
      <SleeveTab />
      <SleeveInterior />
    </span>
  )
}

function ArchiveSleeve({
  activeFolderId,
  depthIndex,
  entryProgress,
  hoveredFolderDepthIndex,
  index,
  interactive,
  isCoarsePointer,
  openingFolderDepthIndex,
  onActivate,
  onHoverChange,
  project,
  reducedMotion,
}) {
  const isActive = activeFolderId === project.id
  const isHovered = hoveredFolderDepthIndex === depthIndex
  const isOpening = openingFolderDepthIndex === depthIndex
  const shouldMoveDown =
    hoveredFolderDepthIndex !== null &&
    depthIndex < hoveredFolderDepthIndex
  const descriptionId = `project-sleeve-description-${project.id}`
  const palette = folderPalette[index]
  const collapsedHeight = 'clamp(64px, 8svh, 72px)'
  const activeHeight = 'clamp(310px, 45svh, 440px)'
  const targetHeight = isActive ? activeHeight : collapsedHeight
  const entryStart = 0.14 + index * 0.05
  const entryEnd = 0.5 + index * 0.05
  const entryY = useTransform(
    entryProgress,
    [entryStart, entryEnd],
    [reducedMotion ? '10vh' : `${42 + index * 4}vh`, '0vh'],
  )
  const entryOpacity = useTransform(
    entryProgress,
    [entryStart, Math.min(entryStart + 0.16, entryEnd)],
    [0, 1],
  )

  const handleMouseEnter = () => {
    if (!isCoarsePointer && interactive) onHoverChange(depthIndex)
  }

  return (
    <motion.li
      className="projects-archive-folder"
      data-active={isActive ? 'true' : 'false'}
      data-folder-depth-index={depthIndex}
      data-folder-index={index}
      data-hovered={isHovered ? 'true' : 'false'}
      data-opening={isOpening ? 'true' : 'false'}
      data-yielding={shouldMoveDown ? 'true' : 'false'}
      data-testid={`project-folder-${project.id}`}
      animate={{ height: targetHeight }}
      initial={false}
      transition={{ duration: 0 }}
      style={{
        '--folder-fill': palette.fill,
        '--folder-interior': palette.interior,
        '--folder-full-height': activeHeight,
        '--folder-tab-offset': palette.tabOffset,
        '--folder-tab-offset-mobile': palette.tabOffsetMobile,
        zIndex: index + 10,
      }}
    >
      <motion.div
        className="projects-folder-entry-layer"
        style={{ opacity: entryOpacity, y: entryY }}
      >
        <motion.div
          className="projects-folder-yield-layer"
          animate={{ y: shouldMoveDown ? revealOffset : 0 }}
          initial={false}
          transition={
            reducedMotion
              ? { duration: 0.08 }
              : foregroundStackTransition
          }
        >
          <SleeveRear />
          <SleeveDescription id={descriptionId} project={project} />
          <SleeveFace isActive={isActive} />
          <SleeveEdge />
          <span className="projects-archive-folder__title" aria-hidden="true">
            {project.title}
          </span>
        </motion.div>

        <button
          type="button"
          className="projects-archive-folder__trigger"
          data-testid={`project-folder-trigger-${project.id}`}
          aria-label={project.title}
          aria-describedby={descriptionId}
          aria-expanded={isOpening}
          aria-current={isActive ? 'true' : undefined}
          disabled={!interactive}
          onMouseEnter={handleMouseEnter}
          onClick={() => onActivate(project.id, depthIndex)}
          onFocus={() => interactive && onHoverChange(depthIndex)}
          onBlur={() => !isCoarsePointer && onHoverChange(null)}
        />
      </motion.div>
    </motion.li>
  )
}

export default function ProjectsSection({ progress, reducedMotion }) {
  const { projects } = siteContent
  const foldersFrontToBack = [...projects.projects].reverse()
  const defaultFolderId = projects.projects.at(-1).id
  const openingFrameRef = useRef(null)
  const hoveredFolderDepthIndexRef = useRef(null)
  const isProjectsEnteringRef = useRef(progress.get() < 0.72)
  const isSectionTransitioningRef = useRef(progress.get() < 0.72)
  const isProjectsSettledRef = useRef(progress.get() >= 0.8)

  const [hoveredFolderDepthIndex, setHoveredFolderDepthIndex] = useState(null)
  const [openingFolderDepthIndex, setOpeningFolderDepthIndex] = useState(null)
  const activeFolderId = defaultFolderId
  const [isProjectsEntering, setIsProjectsEntering] = useState(
    isProjectsEnteringRef.current,
  )
  const [isSectionTransitioning, setIsSectionTransitioning] = useState(
    isSectionTransitioningRef.current,
  )
  const [isProjectsSettled, setIsProjectsSettled] = useState(
    isProjectsSettledRef.current,
  )
  const [isCoarsePointer, setIsCoarsePointer] = useState(() =>
    window.matchMedia(coarsePointerQuery).matches,
  )

  const surfaceY = useTransform(progress, [0.06, 0.38], ['100vh', '0vh'])
  const headingOpacity = useTransform(
    progress,
    reducedMotion ? [0.18, 0.34] : [0.18, 0.52],
    [0, 1],
  )
  const headingY = useTransform(
    progress,
    reducedMotion ? [0.18, 0.34] : [0.18, 0.52],
    [reducedMotion ? 4 : 18, 0],
  )
  const stackOpacity = useTransform(progress, [0.12, 0.24], [0, 1])

  const sectionInteractive = isProjectsSettled && !isSectionTransitioning

  const handleHoverChange = useCallback((folderDepthIndex) => {
    window.cancelAnimationFrame(openingFrameRef.current)
    hoveredFolderDepthIndexRef.current = folderDepthIndex
    setHoveredFolderDepthIndex(folderDepthIndex)
    if (folderDepthIndex === null) {
      setOpeningFolderDepthIndex(null)
      return
    }

    openingFrameRef.current = window.requestAnimationFrame(() => {
      setOpeningFolderDepthIndex(folderDepthIndex)
    })
  }, [])

  const handleProjectPlaceholder = useCallback((_folderId) => {
    // TODO: Extract, rotate and open this dossier sleeve in the next project phase.
  }, [])

  const handleActivateFolder = useCallback(
    (folderId, folderDepthIndex) => {
      if (!sectionInteractive) return

      if (
        isCoarsePointer &&
        hoveredFolderDepthIndex !== folderDepthIndex
      ) {
        handleHoverChange(folderDepthIndex)
        return
      }

      handleProjectPlaceholder(folderId)
    },
    [
      handleHoverChange,
      handleProjectPlaceholder,
      hoveredFolderDepthIndex,
      isCoarsePointer,
      sectionInteractive,
    ],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(coarsePointerQuery)
    const handleChange = (event) => {
      setIsCoarsePointer(event.matches)
      if (!event.matches) handleHoverChange(null)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [handleHoverChange])

  useEffect(() => {
    const handleProgress = (value) => {
      const projectsEntering = value < 0.72
      const sectionTransitioning = value < 0.72
      const projectsSettled = isProjectsSettledRef.current
        ? value > 0.72
        : value >= 0.8

      if (projectsEntering !== isProjectsEnteringRef.current) {
        isProjectsEnteringRef.current = projectsEntering
        setIsProjectsEntering(projectsEntering)
      }

      if (sectionTransitioning !== isSectionTransitioningRef.current) {
        isSectionTransitioningRef.current = sectionTransitioning
        setIsSectionTransitioning(sectionTransitioning)
      }

      if (projectsSettled !== isProjectsSettledRef.current) {
        isProjectsSettledRef.current = projectsSettled
        setIsProjectsSettled(projectsSettled)
      }

      if (!projectsSettled && hoveredFolderDepthIndexRef.current !== null) {
        handleHoverChange(null)
      }
    }

    handleProgress(progress.get())
    return progress.on('change', handleProgress)
  }, [handleHoverChange, progress])

  useEffect(
    () => () => {
      window.cancelAnimationFrame(openingFrameRef.current)
    },
    [],
  )

  return (
    <section
      id="projects"
      className="projects-section"
      aria-labelledby="projects-title"
      data-projects-entering={isProjectsEntering ? 'true' : 'false'}
      data-projects-settled={isProjectsSettled ? 'true' : 'false'}
      data-section-transitioning={isSectionTransitioning ? 'true' : 'false'}
      data-hovered-folder={
        hoveredFolderDepthIndex === null
          ? undefined
          : foldersFrontToBack[hoveredFolderDepthIndex]?.id
      }
      data-hovered-folder-depth-index={hoveredFolderDepthIndex ?? undefined}
      data-active-folder={activeFolderId}
    >
      <motion.div className="projects-surface" style={{ y: surfaceY }}>
        <div className="projects-surface__grain" aria-hidden="true" />
        <motion.header
          className="projects-heading"
          style={{ opacity: headingOpacity, y: headingY }}
        >
          <h2 id="projects-title">{projects.title}</h2>
          <p>{projects.introduction}</p>
        </motion.header>
      </motion.div>

      <motion.div
        className="projects-stack-entry"
        data-interactive={sectionInteractive ? 'true' : 'false'}
        style={{ opacity: stackOpacity }}
      >
        <ol
          className="projects-archive-stack"
          aria-label={projects.archiveLabel}
          onMouseLeave={() => {
            if (!isCoarsePointer) handleHoverChange(null)
          }}
        >
          {projects.projects.map((project, index) => (
            <ArchiveSleeve
              key={project.id}
              activeFolderId={activeFolderId}
              depthIndex={projects.projects.length - index - 1}
              entryProgress={progress}
              hoveredFolderDepthIndex={hoveredFolderDepthIndex}
              index={index}
              interactive={sectionInteractive}
              isCoarsePointer={isCoarsePointer}
              openingFolderDepthIndex={openingFolderDepthIndex}
              onActivate={handleActivateFolder}
              onHoverChange={handleHoverChange}
              project={project}
              reducedMotion={reducedMotion}
            />
          ))}
        </ol>
      </motion.div>

      <p className="sr-only" aria-live="polite">
        {projects.projects.find((project) => project.id === activeFolderId)?.title}{' '}
        is the foreground project dossier sleeve.
      </p>
    </section>
  )
}

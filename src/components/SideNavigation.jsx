import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export default function SideNavigation({
  chapters,
  navigation,
  reducedMotion,
  activeChapterId,
  entranceDelay = 1.3,
  entranceDuration = 0.45,
  entranceEase = [0.22, 1, 0.36, 1],
  entranceStagger = 0.15,
  entranceY = 7,
  markAsHomeDirectory = false,
  numericOnly = false,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const currentChapter =
    chapters.find((chapter) => chapter.id === activeChapterId) ??
    chapters.find((chapter) => chapter.status === 'current') ??
    chapters[0]
  const mobileMenuId = `mobile-chapter-menu-${currentChapter.id}`

  useEffect(() => {
    if (!isMenuOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMenuOpen])

  const renderChapterList = (animateEntrance = false) => (
    <ol className="chapter-list">
      {chapters.map((chapter, index) => {
        const isCurrent = chapter.id === currentChapter.id
        const isSoon = chapter.status === 'soon'
        const rowDelay = entranceDelay + index * entranceStagger
        const canNavigate = chapter.id && !isSoon

        return (
          <motion.li
            key={chapter.id}
            className={`chapter-list__item${isCurrent ? ' is-current' : ''}`}
            aria-current={isCurrent ? 'page' : undefined}
            initial={
              animateEntrance
                ? { opacity: 0, y: reducedMotion ? 0 : entranceY }
                : false
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: animateEntrance && !reducedMotion ? rowDelay : 0,
              duration: reducedMotion ? 0.01 : entranceDuration,
              ease: entranceEase,
            }}
          >
            {numericOnly && canNavigate ? (
              <a
                className="chapter-list__number chapter-list__link"
                href={`#${chapter.id}`}
                aria-label={chapter.name}
              >
                {chapter.number}
              </a>
            ) : (
              <span className="chapter-list__number">{chapter.number}</span>
            )}
            {!numericOnly && (
              <span className="chapter-list__name">{chapter.name}</span>
            )}
            {!numericOnly && !isCurrent && isSoon && (
              <motion.span
                className="chapter-list__status"
                initial={animateEntrance ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{
                  delay:
                    animateEntrance && !reducedMotion
                      ? rowDelay + entranceStagger
                      : 0,
                  duration: reducedMotion ? 0.01 : 0.3,
                  ease: entranceEase,
                }}
              >
                {navigation.soonLabel}
              </motion.span>
            )}
          </motion.li>
        )
      })}
    </ol>
  )

  return (
    <>
      <nav
        className="side-navigation"
        aria-label={navigation.label}
        data-home-directory={markAsHomeDirectory ? 'true' : undefined}
      >
        {renderChapterList(true)}
      </nav>

      {!numericOnly && (
        <>
          <motion.nav
            className="mobile-navigation"
            aria-label={navigation.label}
            data-home-directory={markAsHomeDirectory ? 'true' : undefined}
            initial={{ opacity: 0, y: reducedMotion ? 0 : -entranceY }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: reducedMotion ? 0 : entranceDelay,
              duration: reducedMotion ? 0.01 : entranceDuration,
              ease: entranceEase,
            }}
          >
            <span className="mobile-navigation__current">
              {currentChapter.number} {currentChapter.name}
            </span>
            <button
              type="button"
              className="mobile-navigation__toggle"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-expanded={isMenuOpen}
              aria-controls={mobileMenuId}
            >
              {isMenuOpen ? navigation.menuClose : navigation.menuOpen}
            </button>
          </motion.nav>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                id={mobileMenuId}
                className="mobile-chapter-menu"
                data-home-directory={markAsHomeDirectory ? 'true' : undefined}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: reducedMotion ? 0.01 : 0.24 }}
              >
                {renderChapterList()}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall through for browsers that expose the API but deny access.
    }
  }

  const previouslyFocused = document.activeElement
  const temporaryInput = document.createElement('textarea')
  temporaryInput.value = value
  temporaryInput.setAttribute('readonly', '')
  temporaryInput.style.position = 'fixed'
  temporaryInput.style.opacity = '0'
  document.body.appendChild(temporaryInput)
  temporaryInput.select()
  const copied = document.execCommand('copy')
  temporaryInput.remove()
  if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()

  if (!copied) throw new Error('Clipboard copy failed')
}

export default function ProfileDrawer({
  isOpen,
  onClose,
  profile,
  reducedMotion,
  triggerRef,
}) {
  const [isWechatRevealed, setIsWechatRevealed] = useState(false)
  const [isWechatCopied, setIsWechatCopied] = useState(false)
  const drawerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const copyTimerRef = useRef(null)

  useEffect(
    () => () => {
      window.clearTimeout(copyTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = [...drawerRef.current.querySelectorAll(focusableSelector)]
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [isOpen, onClose, triggerRef])

  const handleWechatAction = async () => {
    if (!isWechatRevealed) {
      setIsWechatRevealed(true)
      return
    }

    try {
      await copyText(profile.wechat.value)
      setIsWechatCopied(true)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(
        () => setIsWechatCopied(false),
        1400,
      )
    } catch {
      setIsWechatCopied(false)
    }
  }

  const wechatDisplay = isWechatCopied
    ? profile.wechat.copiedLabel
    : isWechatRevealed
      ? profile.wechat.value
      : profile.wechat.revealLabel

  return (
    <motion.div
      className="profile-overlay"
      data-open={isOpen}
      initial={false}
      animate={
        isOpen
          ? {
              opacity: 1,
              visibility: 'visible',
              transition: {
                duration: reducedMotion ? 0.01 : 0.88,
                ease: [0.22, 1, 0.36, 1],
              },
            }
          : {
              opacity: 0,
              transition: {
                duration: reducedMotion ? 0.01 : 0.49,
                ease: [0.4, 0, 1, 1],
              },
              transitionEnd: { visibility: 'hidden' },
            }
      }
      aria-hidden={!isOpen}
      inert={!isOpen ? true : undefined}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        className="profile-drawer-motion"
        initial={false}
        animate={
          isOpen
            ? {
                opacity: 1,
                x: 0,
                scale: 1,
                transition: {
                  duration: reducedMotion ? 0.01 : 0.88,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : {
                opacity: 0,
                x: reducedMotion ? 0 : 14,
                scale: reducedMotion ? 1 : 0.996,
                transition: {
                  duration: reducedMotion ? 0.01 : 0.49,
                  ease: [0.4, 0, 1, 1],
                },
                transitionEnd: {
                  x: reducedMotion ? 0 : 20,
                  scale: reducedMotion ? 1 : 0.994,
                },
              }
        }
        transformTemplate={(_, generatedTransform) =>
          generatedTransform === 'none'
            ? 'translateZ(0)'
            : `${generatedTransform} translateZ(0)`
        }
      >
        <aside
          ref={drawerRef}
          className="profile-drawer"
          role="dialog"
          aria-modal={isOpen ? 'true' : undefined}
          aria-labelledby="profile-title"
          aria-label={profile.dialogLabel}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="profile-drawer__close"
            onClick={onClose}
            aria-label={profile.closeLabel}
          >
            <span aria-hidden="true">×</span>
            <span>{profile.closeLabel}</span>
          </button>

          <div className="profile-drawer__content">
            <h2 id="profile-title">{profile.title}</h2>

            <ul className="profile-contacts">
              <li>
                <button
                  type="button"
                  className="profile-contact profile-contact--action"
                  onClick={handleWechatAction}
                  aria-label={
                    isWechatRevealed
                      ? profile.wechat.copyLabel
                      : profile.wechat.revealLabel
                  }
                >
                  <span className="profile-contact__label">
                    {profile.wechat.label}
                  </span>
                  <span
                    className={`profile-contact__value${
                      isWechatRevealed
                        ? ''
                        : ' profile-contact__value--hint'
                    }`}
                    aria-live="polite"
                  >
                    {wechatDisplay}
                  </span>
                </button>
              </li>

              {profile.contacts.map((contact) => (
                <li key={contact.label}>
                  {contact.href ? (
                    <a
                      className="profile-contact profile-contact--action"
                      href={contact.href}
                      target={contact.external ? '_blank' : undefined}
                      rel={
                        contact.external ? 'noopener noreferrer' : undefined
                      }
                    >
                      <span className="profile-contact__label">
                        {contact.label}
                      </span>
                      <span className="profile-contact__value">
                        {contact.display}
                      </span>
                    </a>
                  ) : (
                    <span className="profile-contact">
                      <span className="profile-contact__label">
                        {contact.label}
                      </span>
                      <span className="profile-contact__value profile-contact__value--muted">
                        {contact.display}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </motion.div>
    </motion.div>
  )
}

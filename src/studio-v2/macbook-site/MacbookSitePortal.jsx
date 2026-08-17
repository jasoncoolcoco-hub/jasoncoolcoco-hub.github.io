import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  STUDIO_V2_MACBOOK_SITE_CONFIG,
  STUDIO_V2_MACBOOK_SITE_PHASES,
  STUDIO_V2_MACBOOK_SITE_STATES,
  studioV2MacbookSiteCanOpen,
  studioV2MacbookSiteCanTransition,
} from './studioV2MacbookPortal'

let homeModulePromise = null
const loadHomeModule = () => {
  homeModulePromise ??= import('../../components/HomeTransitionShell')
  return homeModulePromise
}
const HomeTransitionShell = lazy(loadHomeModule)

function preloadImage(source) {
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
    image.src = source
    if (image.complete) resolve()
  })
}

export default function MacbookSitePortal({ onPhaseChange, onStateChange, runtime, sceneReady }) {
  const [phase, setPhase] = useState(STUDIO_V2_MACBOOK_SITE_PHASES.CLOSED)
  const [siteState, setSiteState] = useState(STUDIO_V2_MACBOOK_SITE_STATES.CLOSED)
  const [sitePrepared, setSitePrepared] = useState(false)
  const backButtonRef = useRef(null)
  const phaseRef = useRef(phase)
  const siteStateRef = useRef(siteState)
  const preloadPromiseRef = useRef(null)
  const savedScrollTopRef = useRef(0)
  const scrollContainerRef = useRef(null)
  const timersRef = useRef(new Set())
  const framesRef = useRef(new Set())
  const reducedMotion = Boolean(useReducedMotion())

  const updatePhase = useCallback((next) => {
    phaseRef.current = next
    setPhase(next)
    onPhaseChange?.(next)
  }, [onPhaseChange])

  const updateSiteState = useCallback((next) => {
    if (!studioV2MacbookSiteCanTransition(siteStateRef.current, next)) return false
    siteStateRef.current = next
    runtime?.setMacbookSiteState?.(next)
    setSiteState(next)
    onStateChange?.(next)
    return true
  }, [onStateChange, runtime])

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    framesRef.current.forEach((frame) => window.cancelAnimationFrame(frame))
    timersRef.current.clear()
    framesRef.current.clear()
  }, [])

  const scheduleFrame = useCallback((callback) => {
    const frame = window.requestAnimationFrame(() => {
      framesRef.current.delete(frame)
      callback()
    })
    framesRef.current.add(frame)
  }, [])

  const scheduleTimer = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer)
      callback()
    }, delay)
    timersRef.current.add(timer)
  }, [])

  const prepareHome = useCallback(() => {
    preloadPromiseRef.current ??= Promise.all([
      loadHomeModule(),
      preloadImage('/images/hero/jason-li-hero-1440.jpg'),
    ]).then(() => {
      setSitePrepared(true)
      return true
    })
    return preloadPromiseRef.current
  }, [])

  const openSite = useCallback(({ launchDurationMs, source = 'CHROME' } = {}) => {
    const cameraState = runtime?.getMacbookFocusState?.()?.state
    if (!runtime || !studioV2MacbookSiteCanOpen(cameraState, siteStateRef.current)) return false
    clearScheduled()
    if (!updateSiteState(STUDIO_V2_MACBOOK_SITE_STATES.OPENING)) return false
    updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.LAUNCHING)
    const homeReady = prepareHome()
    const launchDuration = reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : launchDurationMs ?? STUDIO_V2_MACBOOK_SITE_CONFIG.defaultLaunchDurationMs
    scheduleTimer(() => {
      homeReady.then(() => scheduleFrame(() => {
        if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.LAUNCHING) return
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = savedScrollTopRef.current
        }
        updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.ENTERING)
        const transitionDuration = reducedMotion
          ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
          : STUDIO_V2_MACBOOK_SITE_CONFIG.transitionDurationMs
        scheduleTimer(() => {
          if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.ENTERING) return
          updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.SITE)
          updateSiteState(STUDIO_V2_MACBOOK_SITE_STATES.OPEN)
          backButtonRef.current?.focus({ preventScroll: true })
        }, transitionDuration)
      }))
    }, launchDuration)
    return source
  }, [clearScheduled, prepareHome, reducedMotion, runtime, scheduleFrame, scheduleTimer, updatePhase, updateSiteState])

  const closeSite = useCallback((source = 'CONTROL') => {
    if (siteStateRef.current !== STUDIO_V2_MACBOOK_SITE_STATES.OPEN) return false
    clearScheduled()
    if (scrollContainerRef.current) savedScrollTopRef.current = scrollContainerRef.current.scrollTop
    const phaseDuration = (duration) => reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : duration

    if (!updateSiteState(STUDIO_V2_MACBOOK_SITE_STATES.CLOSING)) return false
    updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_DARKEN)
    scheduleTimer(() => {
      if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_DARKEN) return
      updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_COVER)
      scheduleTimer(() => {
        if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_COVER) return

        updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_HOLD)
        scheduleTimer(() => {
          if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_HOLD) return
          updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_REVEAL)
          scheduleTimer(() => {
            if (phaseRef.current !== STUDIO_V2_MACBOOK_SITE_PHASES.EXIT_REVEAL) return
            updatePhase(STUDIO_V2_MACBOOK_SITE_PHASES.CLOSED)
            updateSiteState(STUDIO_V2_MACBOOK_SITE_STATES.CLOSED)
          }, phaseDuration(STUDIO_V2_MACBOOK_SITE_CONFIG.exitRevealDurationMs))
        }, phaseDuration(STUDIO_V2_MACBOOK_SITE_CONFIG.exitOcclusionHoldMs))
      }, phaseDuration(STUDIO_V2_MACBOOK_SITE_CONFIG.exitCoverDurationMs))
    }, phaseDuration(STUDIO_V2_MACBOOK_SITE_CONFIG.exitDarkenDurationMs))
    return source
  }, [clearScheduled, reducedMotion, scheduleTimer, updatePhase, updateSiteState])

  useEffect(() => {
    if (!sceneReady) return undefined
    let active = true
    const warm = () => {
      if (active) prepareHome()
    }
    const idleId = window.requestIdleCallback?.(warm, { timeout: 1200 })
    const timer = idleId === undefined ? window.setTimeout(warm, 180) : null
    return () => {
      active = false
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [prepareHome, sceneReady])

  useEffect(() => {
    if (!runtime || !sceneReady) return undefined
    return runtime.subscribeMacbookPortalOpenRequest?.(openSite)
  }, [openSite, runtime, sceneReady])

  useEffect(() => {
    if (siteState === STUDIO_V2_MACBOOK_SITE_STATES.CLOSED) return undefined
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      closeSite('ESCAPE')
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [closeSite, siteState])

  useEffect(() => () => {
    clearScheduled()
    runtime?.setMacbookSiteState?.(STUDIO_V2_MACBOOK_SITE_STATES.CLOSED)
  }, [clearScheduled, runtime])

  if (!sitePrepared && siteState === STUDIO_V2_MACBOOK_SITE_STATES.CLOSED) return null

  const siteActive = siteState === STUDIO_V2_MACBOOK_SITE_STATES.OPEN
  const style = {
    '--macbook-site-transition-duration': `${reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : STUDIO_V2_MACBOOK_SITE_CONFIG.transitionDurationMs}ms`,
    '--macbook-site-exit-darken-duration': `${reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : STUDIO_V2_MACBOOK_SITE_CONFIG.exitDarkenDurationMs}ms`,
    '--macbook-site-exit-cover-duration': `${reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : STUDIO_V2_MACBOOK_SITE_CONFIG.exitCoverDurationMs}ms`,
    '--macbook-site-exit-reveal-duration': `${reducedMotion
      ? STUDIO_V2_MACBOOK_SITE_CONFIG.reducedMotionDurationMs
      : STUDIO_V2_MACBOOK_SITE_CONFIG.exitRevealDurationMs}ms`,
  }

  return (
    <section
      className="macbook-site-portal"
      data-phase={phase}
      data-site-prepared={sitePrepared}
      aria-hidden={siteState === STUDIO_V2_MACBOOK_SITE_STATES.CLOSED || undefined}
      aria-label="Jason Li home page inside Fred Studio"
      style={style}
    >
      <button
        ref={backButtonRef}
        className="macbook-site-portal__back"
        type="button"
        tabIndex={siteActive ? 0 : -1}
        onClick={() => closeSite('BACK_CONTROL')}
      >
        ← STUDIO
      </button>
      <div
        ref={scrollContainerRef}
        className="macbook-site-portal__scroll"
        data-scroll-owner="MACBOOK_SITE_MODE"
        onScroll={(event) => {
          savedScrollTopRef.current = event.currentTarget.scrollTop
        }}
      >
        <Suspense fallback={<div className="macbook-site-portal__loading">LOADING HOME</div>}>
          <HomeTransitionShell releaseScope="v0.9" scrollContainerRef={scrollContainerRef} />
        </Suspense>
      </div>
      <div className="macbook-site-portal__exit-veil" aria-hidden="true" />
    </section>
  )
}

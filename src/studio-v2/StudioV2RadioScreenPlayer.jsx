import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const OUTSIDE_CLICK_MOVEMENT_LIMIT = 6
const OUTSIDE_CLICK_DURATION_LIMIT_MS = 600
const HYBRID_TIMING = Object.freeze({
  compactWithdrawalMs: 90,
  partialLaunchMs: 100,
  hiddenOpenMs: 35,
  screenArrivalMs: 190,
  screenContentDelayMs: 65,
  formalWithdrawalMs: 105,
  partialCollapseMs: 120,
  hiddenCloseMs: 35,
  compactArrivalMs: 130,
})

function enabledTracks(audioState, fixtureCount) {
  const source = (audioState?.tracks ?? []).filter(({ enabled }) => enabled)
  if (audioState?.debugFixtureCount === fixtureCount) return source
  if (!fixtureCount || fixtureCount <= source.length || source.length === 0) return source
  return Array.from({ length: fixtureCount }, (_, index) => {
    const original = source[index % source.length]
    return {
      ...original,
      id: index === 0 ? original.id : `debug-fixture-${index + 1}`,
      sourceTrackId: original.id,
      title: index === 0 ? original.title : `Studio Test Track ${String(index + 1).padStart(2, '0')}`,
      artist: index === 0 ? original.artist : 'Debug catalogue fixture',
      debugFixture: index > 0,
    }
  })
}

function currentTrack(audioState, tracks) {
  const selectedId = audioState?.trackId ?? audioState?.defaultTrackId
  return tracks.find(({ id }) => id === selectedId) ?? tracks[0] ?? null
}

function finalBounds(trackCount) {
  const width = Math.min(400, window.innerWidth - 32)
  const height = Math.min(trackCount <= 1 ? 304 : 360, window.innerHeight - 32)
  const margin = Math.max(36, window.innerWidth * 0.05)
  return {
    left: Math.max(16, window.innerWidth - width - margin),
    top: Math.max(16, Math.min(window.innerHeight - height - 16, window.innerHeight * 0.5 - height * 0.42)),
    width,
    height,
  }
}

function safeProjectedBounds(bounds, fallback) {
  if (!bounds || !Number.isFinite(bounds.left) || !Number.isFinite(bounds.top)) {
    return {
      left: fallback.left + fallback.width * 0.68,
      top: fallback.top + fallback.height * 0.58,
      width: fallback.width * 0.22,
      height: fallback.height * 0.16,
      rotationDegrees: 0,
    }
  }
  return bounds
}

function transformTo(target, source, rotationDegrees = 0) {
  return `translate3d(${target.left - source.left}px, ${target.top - source.top}px, 0) rotate(${rotationDegrees}deg) scale(${Math.max(0.04, target.width / source.width)}, ${Math.max(0.04, target.height / source.height)})`
}

function partialLaunchBounds(start, destination) {
  return {
    left: start.left + (destination.left - start.left) * 0.16,
    top: start.top + (destination.top - start.top) * 0.16,
    width: start.width + (destination.width - start.width) * 0.12,
    height: start.height + (destination.height - start.height) * 0.12,
  }
}

function partialCollapseBounds(source, destination) {
  return {
    left: source.left + (destination.left - source.left) * 0.16,
    top: source.top + (destination.top - source.top) * 0.16,
    width: source.width * 0.92,
    height: source.height * 0.92,
  }
}

function arrivalTransform(start, destination) {
  const startCenterX = start.left + start.width / 2
  const startCenterY = start.top + start.height / 2
  const destinationCenterX = destination.left + destination.width / 2
  const destinationCenterY = destination.top + destination.height / 2
  const offsetX = Math.max(-18, Math.min(18, (startCenterX - destinationCenterX) * 0.045))
  const offsetY = Math.max(-12, Math.min(12, (startCenterY - destinationCenterY) * 0.045))
  return `translate3d(${offsetX}px, ${offsetY}px, 0) rotate(0deg) scale(0.975, 0.975)`
}

export default function StudioV2RadioScreenPlayer({
  audioController,
  audioState,
  fixtureCount = null,
  onClosed,
  onStateChange,
  registerClose,
  request,
  runtime,
  transitionSpeed = 1,
}) {
  const panelRef = useRef(null)
  const timersRef = useRef([])
  const framesRef = useRef([])
  const outsidePointerRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [phase, setPhase] = useState('WORLD_COMPACT_EXIT')
  const [bounds, setBounds] = useState(() => finalBounds(
    enabledTracks(audioState, fixtureCount).length,
  ))
  const [returnBounds, setReturnBounds] = useState(null)
  const tracks = useMemo(
    () => enabledTracks(audioState, fixtureCount),
    [audioState, fixtureCount],
  )
  const selected = currentTrack(audioState, tracks)
  const speed = [1, 0.5, 0.25].includes(transitionSpeed) ? transitionSpeed : 1
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = safeProjectedBounds(request?.startBounds, bounds)
  const frozenReturn = safeProjectedBounds(returnBounds, bounds)
  const openingPartial = partialLaunchBounds(start, bounds)
  const closingPartial = partialCollapseBounds(bounds, frozenReturn)
  const openingPhases = [
    'WORLD_COMPACT_EXIT',
    'PARTIAL_LAUNCH_START',
    'PARTIAL_LAUNCH',
    'OPEN_HANDOFF_HIDDEN',
    'SCREEN_PLAYER_ENTER_START',
    'SCREEN_PLAYER_ENTER',
    'SCREEN_PLAYER_CONTENT_ENTER',
  ]
  const closingPhases = [
    'SCREEN_PLAYER_EXIT',
    'PARTIAL_COLLAPSE_START',
    'PARTIAL_COLLAPSE',
    'CLOSE_HANDOFF_HIDDEN',
    'WORLD_COMPACT_ENTER',
  ]
  const isOpening = openingPhases.includes(phase)
  const isClosing = closingPhases.includes(phase)
  const formalContentVisible = ['SCREEN_PLAYER_CONTENT_ENTER', 'OPEN'].includes(phase)
  const screenShellVisible = [
    'PARTIAL_LAUNCH_START',
    'SCREEN_PLAYER_ENTER',
    'SCREEN_PLAYER_CONTENT_ENTER',
    'OPEN',
    'SCREEN_PLAYER_EXIT',
    'PARTIAL_COLLAPSE_START',
  ].includes(phase)

  let transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1, 1)'
  if (['WORLD_COMPACT_EXIT', 'PARTIAL_LAUNCH_START'].includes(phase)) {
    transform = transformTo(start, bounds, start.rotationDegrees ?? 0)
  } else if (['PARTIAL_LAUNCH', 'OPEN_HANDOFF_HIDDEN'].includes(phase)) {
    transform = transformTo(openingPartial, bounds, (start.rotationDegrees ?? 0) * 0.82)
  } else if (phase === 'SCREEN_PLAYER_ENTER_START') {
    transform = arrivalTransform(start, bounds)
  } else if (['PARTIAL_COLLAPSE', 'CLOSE_HANDOFF_HIDDEN', 'WORLD_COMPACT_ENTER'].includes(phase)) {
    transform = transformTo(closingPartial, bounds, 0)
  }

  let transitionDuration = 0
  if (phase === 'PARTIAL_LAUNCH') transitionDuration = HYBRID_TIMING.partialLaunchMs / speed
  if (phase === 'SCREEN_PLAYER_ENTER') transitionDuration = HYBRID_TIMING.screenArrivalMs / speed
  if (phase === 'PARTIAL_COLLAPSE') transitionDuration = HYBRID_TIMING.partialCollapseMs / speed

  let opacity = screenShellVisible ? 1 : 0
  if (['PARTIAL_LAUNCH', 'PARTIAL_COLLAPSE'].includes(phase)) opacity = 0.16

  function scheduleTimer(callback, delay) {
    const id = window.setTimeout(callback, delay)
    timersRef.current.push(id)
    return id
  }

  function scheduleFrame(callback) {
    const id = requestAnimationFrame(callback)
    framesRef.current.push(id)
    return id
  }

  function clearScheduled() {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    framesRef.current.forEach((id) => cancelAnimationFrame(id))
    timersRef.current = []
    framesRef.current = []
  }

  function publishState(transitionState, handoffMode, extra = {}) {
    onStateChange?.({
      open: true,
      transitionState,
      handoffMode,
      projectedStartBounds: request?.startBounds ?? null,
      projectedReturnBounds: returnBounds,
      finalDomBounds: bounds,
      catalogueFixtureCount: fixtureCount,
      transitionSpeed: speed,
      ...extra,
    })
  }

  useLayoutEffect(() => {
    const nextBounds = finalBounds(tracks.length)
    setBounds(nextBounds)
    const startedAtMs = performance.now()
    publishState('WORLD_COMPACT_EXIT', 'WORLD_COMPACT_EXIT', {
      finalDomBounds: nextBounds,
      handoffFrameTiming: { openStartedAtMs: startedAtMs },
    })
    runtime?.animateRadioPanelWorldLayers?.({
      faceOpacity: 0,
      glassOpacity: 1,
      durationMs: HYBRID_TIMING.compactWithdrawalMs / speed,
    })

    if (reducedMotion) {
      runtime?.animateRadioPanelWorldLayers?.({ faceOpacity: 0, glassOpacity: 0, durationMs: 0 })
      setPhase('OPEN')
      return clearScheduled
    }

    scheduleTimer(() => {
      setPhase('PARTIAL_LAUNCH_START')
      publishState('PARTIAL_LAUNCH', 'PARTIAL_LAUNCH', {
        handoffFrameTiming: { compactContentWithdrawnAtMs: performance.now() },
      })
      runtime?.animateRadioPanelWorldLayers?.({ faceOpacity: 0, glassOpacity: 0, durationMs: 0 })
      scheduleFrame(() => setPhase('PARTIAL_LAUNCH'))
      scheduleTimer(() => {
        setPhase('OPEN_HANDOFF_HIDDEN')
        publishState('HANDOFF_HIDDEN_OPEN', 'HANDOFF_HIDDEN', {
          handoffFrameTiming: { openHiddenAtMs: performance.now() },
        })
        scheduleTimer(() => {
          setPhase('SCREEN_PLAYER_ENTER_START')
          publishState('SCREEN_PLAYER_ENTER', 'SCREEN_PLAYER_ENTER')
          scheduleFrame(() => {
            setPhase('SCREEN_PLAYER_ENTER')
            scheduleTimer(() => setPhase('SCREEN_PLAYER_CONTENT_ENTER'), HYBRID_TIMING.screenContentDelayMs / speed)
            scheduleTimer(() => setPhase('OPEN'), HYBRID_TIMING.screenArrivalMs / speed)
          })
        }, HYBRID_TIMING.hiddenOpenMs / speed)
      }, HYBRID_TIMING.partialLaunchMs / speed)
    }, HYBRID_TIMING.compactWithdrawalMs / speed)

    return clearScheduled
  }, [request?.key])

  useEffect(() => {
    if (fixtureCount) audioController?.setDebugCatalogueFixture?.(fixtureCount)
  }, [audioController, fixtureCount])

  useEffect(() => {
    if (phase !== 'OPEN') return
    publishState('SCREEN_PLAYER_OPEN', 'SCREEN_PLAYER', {
      handoffFrameTiming: { openCompletedAtMs: performance.now() },
    })
  }, [phase])

  useEffect(() => {
    const handleResize = () => {
      if (phase === 'OPEN') setBounds(finalBounds(tracks.length))
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close({ source: 'escape-key' })
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  })

  useEffect(() => clearScheduled, [])

  useEffect(() => {
    const insidePanel = (target) => panelRef.current?.contains(target)
    const handlePointerDown = (event) => {
      if (event.button !== 0 || insidePanel(event.target)) {
        outsidePointerRef.current = null
        return
      }
      outsidePointerRef.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: performance.now(),
        movement: 0,
      }
      publishState(phase === 'OPEN' ? 'SCREEN_PLAYER_OPEN' : phase, phase, {
        outsideClickState: 'POINTER_DOWN_OUTSIDE',
      })
    }
    const handlePointerMove = (event) => {
      const pointer = outsidePointerRef.current
      if (!pointer || pointer.id !== event.pointerId) return
      pointer.movement = Math.max(
        pointer.movement,
        Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y),
      )
    }
    const handlePointerUp = (event) => {
      const pointer = outsidePointerRef.current
      outsidePointerRef.current = null
      if (!pointer || pointer.id !== event.pointerId || insidePanel(event.target)) return
      const movement = Math.max(
        pointer.movement,
        Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y),
      )
      const duration = performance.now() - pointer.startedAt
      if (movement > OUTSIDE_CLICK_MOVEMENT_LIMIT || duration > OUTSIDE_CLICK_DURATION_LIMIT_MS) {
        publishState(phase === 'OPEN' ? 'SCREEN_PLAYER_OPEN' : phase, phase, {
          outsideClickState: 'IGNORED_DRAG',
        })
        return
      }
      event.preventDefault()
      suppressClickRef.current = true
      close({ source: 'outside-click' })
    }
    const handlePointerCancel = () => {
      outsidePointerRef.current = null
    }
    const handleClick = (event) => {
      if (!suppressClickRef.current || insidePanel(event.target)) return
      suppressClickRef.current = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', handlePointerCancel, true)
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', handlePointerCancel, true)
      document.removeEventListener('click', handleClick, true)
    }
  })

  useEffect(() => {
    registerClose?.(close)
    return () => registerClose?.(null)
  })

  function close({ immediate = false, source = 'close-control' } = {}) {
    if (phase !== 'OPEN') return
    clearScheduled()
    const closeStartedAtMs = performance.now()
    const target = runtime?.getRadioPanelScreenBounds?.() ?? request?.startBounds ?? null
    const frozenTarget = target ? Object.freeze({ ...target }) : null
    setReturnBounds(frozenTarget)
    runtime?.prepareRadioPanelCompactSurface?.()
    runtime?.animateRadioPanelWorldLayers?.({ faceOpacity: 0, glassOpacity: 0, durationMs: 0 })
    publishState('SCREEN_PLAYER_EXIT', 'SCREEN_PLAYER_EXIT', {
      projectedReturnBounds: frozenTarget,
      handoffFrameTiming: { closeStartedAtMs },
      outsideClickState: source === 'outside-click'
        ? 'CLOSING_FROM_OUTSIDE'
        : `CLOSING_FROM_${source.toUpperCase().replaceAll('-', '_')}`,
    })

    if (immediate || reducedMotion) {
      runtime?.animateRadioPanelWorldLayers?.({ faceOpacity: 1, glassOpacity: 1, durationMs: 0 })
      onClosed?.()
      return
    }

    setPhase('SCREEN_PLAYER_EXIT')
    scheduleTimer(() => {
      setPhase('PARTIAL_COLLAPSE_START')
      publishState('PARTIAL_COLLAPSE', 'PARTIAL_COLLAPSE', {
        projectedReturnBounds: frozenTarget,
        handoffFrameTiming: { formalContentWithdrawnAtMs: performance.now() },
      })
      scheduleFrame(() => setPhase('PARTIAL_COLLAPSE'))
      scheduleTimer(() => {
        setPhase('CLOSE_HANDOFF_HIDDEN')
        publishState('HANDOFF_HIDDEN_CLOSE', 'HANDOFF_HIDDEN', {
          projectedReturnBounds: frozenTarget,
          handoffFrameTiming: { closeHiddenAtMs: performance.now() },
        })
        scheduleTimer(() => {
          setPhase('WORLD_COMPACT_ENTER')
          publishState('WORLD_COMPACT_ENTER', 'WORLD_COMPACT_ENTER', {
            projectedReturnBounds: frozenTarget,
            handoffFrameTiming: { compactEnterAtMs: performance.now() },
          })
          runtime?.animateRadioPanelWorldLayers?.({
            faceOpacity: 1,
            glassOpacity: 1,
            durationMs: HYBRID_TIMING.compactArrivalMs / speed,
          })
          scheduleTimer(() => {
            publishState('WORLD_COMPACT', 'WORLD_COMPACT', {
              open: false,
              projectedReturnBounds: frozenTarget,
              handoffFrameTiming: { closeCompletedAtMs: performance.now() },
            })
            onClosed?.()
          }, HYBRID_TIMING.compactArrivalMs / speed)
        }, HYBRID_TIMING.hiddenCloseMs / speed)
      }, HYBRID_TIMING.partialCollapseMs / speed)
    }, HYBRID_TIMING.formalWithdrawalMs / speed)
  }

  async function selectTrack(track) {
    if (!track || track.id === selected?.id) return
    const trackId = track.sourceTrackId ?? track.id
    await audioController?.setTrack?.(trackId)
    await audioController?.play?.()
  }

  const unavailable = tracks.length === 0
  const backdropActive = [
    'SCREEN_PLAYER_ENTER',
    'SCREEN_PLAYER_CONTENT_ENTER',
    'OPEN',
    'SCREEN_PLAYER_EXIT',
  ].includes(phase)
  const backdropReleasing = [
    'PARTIAL_COLLAPSE_START',
    'PARTIAL_COLLAPSE',
    'CLOSE_HANDOFF_HIDDEN',
    'WORLD_COMPACT_ENTER',
  ].includes(phase)

  return (
    <div
      className={`studio-v2__radio-screen-layer${backdropActive ? ' studio-v2__radio-screen-layer--open' : ''}${backdropReleasing ? ' studio-v2__radio-screen-layer--releasing' : ''}`}
      data-radio-screen-phase={phase}
      data-radio-backdrop-state={backdropActive ? 'DIMMED' : backdropReleasing ? 'RELEASING' : 'CLEAR'}
      style={{ '--radio-backdrop-duration': `${220 / speed}ms` }}
    >
      <section
        ref={panelRef}
        className={`studio-v2__radio-screen${tracks.length <= 1 ? ' studio-v2__radio-screen--single' : ''}${formalContentVisible ? ' studio-v2__radio-screen--formal-visible' : ''}${isOpening ? ' studio-v2__radio-screen--opening' : ''}${isClosing ? ' studio-v2__radio-screen--closing' : ''}`}
        aria-label="Fred Studio Radio music player"
        role="region"
        data-radio-handoff-mode={phase}
        style={{
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          opacity,
          transform,
          transitionDuration: `${transitionDuration}ms`,
          pointerEvents: phase === 'OPEN' ? 'auto' : 'none',
          '--radio-formal-fade-duration': `${(isClosing ? HYBRID_TIMING.formalWithdrawalMs : 90) / speed}ms`,
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="studio-v2__radio-formal-content" aria-hidden={!formalContentVisible || undefined}>
          <header className="studio-v2__radio-screen-header">
            <p>FRED STUDIO RADIO</p>
            <button type="button" aria-label="Close Fred Studio Radio" onClick={() => close({ source: 'close-button' })}>×</button>
          </header>

          <div className="studio-v2__radio-now">
            <div>
              <strong>{unavailable ? 'Audio unavailable' : selected?.title ?? 'Radio ready'}</strong>
              <span>{unavailable ? 'Catalogue unavailable' : selected?.artist ?? ''}</span>
              {selected?.version && <small>{selected.version}</small>}
            </div>
            <button
              type="button"
              className="studio-v2__radio-play"
              disabled={unavailable}
              aria-label={audioState?.status === 'playing' ? 'Pause music' : 'Play music'}
              onClick={() => audioController?.toggle?.()}
            >
              {audioState?.status === 'playing' ? 'Ⅱ' : '▶'}
            </button>
          </div>

          {!unavailable && (
            <div className="studio-v2__radio-playlist" role="list" aria-label="Fred Studio Radio playlist">
              {tracks.map((track, index) => {
                const isCurrent = track.id === selected?.id
                return (
                  <button
                    type="button"
                    role="listitem"
                    key={track.id}
                    className={isCurrent ? 'studio-v2__radio-track studio-v2__radio-track--current' : 'studio-v2__radio-track'}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => selectTrack(track)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <span><strong>{track.title}</strong><small>{track.artist}</small></span>
                    <span>{isCurrent ? 'CURRENT' : ''}</span>
                  </button>
                )
              })}
            </div>
          )}

          {unavailable && (
            <p className="studio-v2__radio-unavailable">The room remains available. Music can be retried on the next visit.</p>
          )}
        </div>
      </section>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import FallbackEarthPoster from './FallbackEarthPoster'
import { footprintsSceneStates } from './footprintsSceneState'

const mouseDragThreshold = 4
const touchDragThreshold = 9
const mouseSensitivity = 0.92
const touchSensitivity = 0.74
const keyboardRotationStep = Math.PI / 18
const desktopZoomQuery =
  '(min-width: 701px) and (hover: hover) and (pointer: fine)'

export default function EarthCanvas({
  controlsEnabled,
  scrollRotation,
  reducedMotion,
  instructions,
  label,
  onHoverChange,
  onSelectionChange,
  sceneState,
  toggleLabel,
}) {
  const hostRef = useRef(null)
  const runtimeRef = useRef(null)
  const scrollRotationRef = useRef(
    reducedMotion ? 0 : scrollRotation.get(),
  )
  const isVisibleRef = useRef(false)
  const pointerRecordsRef = useRef(new Map())
  const suppressDoubleClickUntilRef = useRef(0)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [renderState, setRenderState] = useState('idle')
  const [zoomMode, setZoomMode] = useState('default')
  const [desktopZoomAvailable, setDesktopZoomAvailable] = useState(() =>
    window.matchMedia(desktopZoomQuery).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopZoomQuery)
    const handleChange = (event) => {
      setDesktopZoomAvailable(event.matches)
      if (!event.matches) {
        runtimeRef.current?.setZoomPreset('default')
        setZoomMode('default')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(
    () =>
      scrollRotation.on('change', (value) => {
        scrollRotationRef.current = reducedMotion ? 0 : value
        runtimeRef.current?.setScrollRotation(scrollRotationRef.current)
      }),
    [reducedMotion, scrollRotation],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined

    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsNearViewport(true)
      },
      { rootMargin: '60%' },
    )
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
        runtimeRef.current?.setVisible(entry.isIntersecting)
      },
      { threshold: 0.01 },
    )

    preloadObserver.observe(host)
    visibilityObserver.observe(host)

    return () => {
      preloadObserver.disconnect()
      visibilityObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isNearViewport) return undefined

    const host = hostRef.current
    if (!host) return undefined

    const rendererTestMode = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get('earth-renderer')
      : null
    if (rendererTestMode === 'fallback') {
      host.dataset.renderer = 'static-fallback'
      setRenderState('fallback')
      return undefined
    }

    let cancelled = false
    let resizeObserver
    setRenderState('loading')

    const initialise = async () => {
      try {
        const { createEarthRenderer } = await import('./createEarthRenderer')
        const runtime = await createEarthRenderer({
          forceWebGL: rendererTestMode === 'webgl2',
          mount: host,
          reducedMotion,
        })

        if (cancelled) {
          runtime.dispose()
          return
        }

        runtimeRef.current = runtime
        host.dataset.renderer = runtime.backend
        host.dataset.textureQuality = runtime.textureQuality
        host.dataset.zoomDefault = String(runtime.zoomLimits.default)
        host.dataset.zoomMinimum = String(runtime.zoomLimits.minimum)
        host.dataset.zoomOffsetDefault = `${runtime.framing.desktopDefaultOffsetVw}vw`
        host.dataset.zoomOffsetMaximum = `${runtime.framing.desktopMaximumOffsetVw}vw`
        host.dataset.dragReleaseRotationBlend = String(
          runtime.interactionTiming.dragReleaseRotationBlend,
        )
        host.dataset.rotationSpeedBlendDuration = String(
          runtime.interactionTiming.rotationSpeedBlend,
        )
        host.dataset.rotationSpeedDefault = String(
          runtime.rotationSpeeds.default,
        )
        host.dataset.rotationSpeedEnlarged = String(
          runtime.rotationSpeeds.enlarged,
        )
        host.dataset.exploreHorizontalSensitivity = String(
          runtime.exploreControls.horizontalSensitivity,
        )
        host.dataset.exploreVerticalSensitivity = String(
          runtime.exploreControls.verticalSensitivity,
        )
        host.dataset.explorePitchLimit = String(
          runtime.exploreControls.pitchLimitDegrees,
        )
        host.dataset.exploreDragDamping = String(
          runtime.exploreControls.dampingRate,
        )
        runtime.setScrollRotation(scrollRotationRef.current)
        runtime.setVisible(isVisibleRef.current)

        const resize = () => {
          const bounds = host.getBoundingClientRect()
          host.dataset.zoomMaximum = String(
            runtime.setSize(bounds.width, bounds.height),
          )
          if (!window.matchMedia(desktopZoomQuery).matches) {
            runtime.setZoomPreset('default')
            setZoomMode('default')
          }
        }
        resize()
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(host)

        setRenderState('ready')
      } catch (error) {
        if (cancelled) return
        console.error('Earth renderer initialization failed.', error)
        host.dataset.renderer = 'static-fallback'
        setRenderState('fallback')
      }
    }

    initialise()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      runtimeRef.current?.dispose()
      runtimeRef.current = null
    }
  }, [isNearViewport, reducedMotion])

  const localPointerPosition = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
  }

  const handlePointerDown = (event) => {
    if (!controlsEnabled || renderState !== 'ready') return

    const position = localPointerPosition(event)
    pointerRecordsRef.current.set(event.pointerId, {
      cancelled: false,
      captured: false,
      pointerType: event.pointerType,
      rotationStarted: false,
      startTime: event.timeStamp,
      startX: position.x,
      startY: position.y,
      x: position.x,
      y: position.y,
    })

    const touchPointers = Array.from(
      pointerRecordsRef.current.entries(),
    ).filter(([, pointer]) => pointer.pointerType === 'touch')

    if (touchPointers.length > 1) {
      let rotationWasActive = false
      touchPointers.forEach(([pointerId, pointer]) => {
        pointer.cancelled = true
        rotationWasActive ||= pointer.rotationStarted
        if (
          pointer.captured &&
          event.currentTarget.hasPointerCapture(pointerId)
        ) {
          event.currentTarget.releasePointerCapture(pointerId)
          pointer.captured = false
        }
      })
      if (rotationWasActive) {
        runtimeRef.current.endDrag()
      }
      return
    }
  }

  const handlePointerMove = (event) => {
    const pointer = pointerRecordsRef.current.get(event.pointerId)
    if (!pointer || pointer.cancelled) return

    const position = localPointerPosition(event)
    pointer.x = position.x
    pointer.y = position.y

    if (zoomMode !== 'maximum') {
      if (
        Math.hypot(
          position.x - pointer.startX,
          position.y - pointer.startY,
        ) >= mouseDragThreshold
      ) {
        suppressDoubleClickUntilRef.current =
          performance.now() + 350
      }
      return
    }

    if (!runtimeRef.current) return

    if (!pointer.rotationStarted) {
      const deltaX = position.x - pointer.startX
      const deltaY = position.y - pointer.startY
      const distance = Math.hypot(deltaX, deltaY)
      const isTouch = pointer.pointerType === 'touch'
      const threshold = isTouch
        ? touchDragThreshold
        : mouseDragThreshold

      if (distance < threshold) return

      if (isTouch && Math.abs(deltaY) > Math.abs(deltaX) * 1.35) {
        pointer.cancelled = true
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      pointer.captured = true
      pointer.rotationStarted = true
      runtimeRef.current.beginDrag(
        pointer.startX,
        pointer.startY,
      )
    }

    runtimeRef.current.dragTo(
      position.x,
      position.y,
      pointer.pointerType === 'touch'
        ? touchSensitivity
        : mouseSensitivity,
    )
    if (event.cancelable) event.preventDefault()
  }

  const finishPointer = (event) => {
    const pointer = pointerRecordsRef.current.get(event.pointerId)
    if (!pointer) return

    pointerRecordsRef.current.delete(event.pointerId)

    if (pointer.rotationStarted) {
      runtimeRef.current?.endDrag()
    }

    if (
      pointer.captured &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const toggleGlobeSize = () => {
    if (
      !desktopZoomAvailable ||
      !controlsEnabled ||
      renderState !== 'ready' ||
      !runtimeRef.current
    ) {
      return
    }

    const nextMode = runtimeRef.current.toggleZoomPreset()
    setZoomMode(nextMode)
  }

  const handleDoubleClick = (event) => {
    const interactiveTarget =
      event.target instanceof Element
        ? event.target.closest('[data-globe-interactive="true"]')
        : null
    if (interactiveTarget) return
    if (performance.now() < suppressDoubleClickUntilRef.current) return

    toggleGlobeSize()
  }

  const handleKeyDown = (event) => {
    if (
      event.target !== event.currentTarget ||
      !controlsEnabled ||
      !runtimeRef.current ||
      renderState !== 'ready'
    ) {
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onSelectionChange(false)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      if (!desktopZoomAvailable) return
      event.preventDefault()
      toggleGlobeSize()
      return
    }

    const keyActions = {
      ArrowLeft: () =>
        runtimeRef.current.rotateByKeyboard(
          'horizontal',
          -keyboardRotationStep,
        ),
      ArrowRight: () =>
        runtimeRef.current.rotateByKeyboard(
          'horizontal',
          keyboardRotationStep,
        ),
      ArrowUp: () =>
        runtimeRef.current.rotateByKeyboard(
          'vertical',
          -keyboardRotationStep,
        ),
      ArrowDown: () =>
        runtimeRef.current.rotateByKeyboard(
          'vertical',
          keyboardRotationStep,
        ),
    }
    const action = keyActions[event.key]
    if (!action) return
    if (zoomMode !== 'maximum') return

    event.preventDefault()
    action()
  }

  return (
    <div
      ref={hostRef}
      className="earth-canvas"
      role={desktopZoomAvailable ? 'button' : 'group'}
      aria-label={
        desktopZoomAvailable ? `${label}. ${toggleLabel}` : label
      }
      aria-pressed={
        desktopZoomAvailable ? zoomMode === 'maximum' : undefined
      }
      aria-describedby="footprints-globe-instructions"
      aria-busy={renderState === 'idle' || renderState === 'loading'}
      data-controls-enabled={controlsEnabled ? 'true' : 'false'}
      data-interaction-mode={
        zoomMode === 'maximum' ? 'explore' : 'normal'
      }
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-scene-state={sceneState}
      data-zoom-mode={zoomMode}
      tabIndex={renderState === 'ready' && controlsEnabled ? 0 : -1}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={(event) => {
        if (controlsEnabled && event.pointerType !== 'touch') {
          onHoverChange(true)
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'touch') onHoverChange(false)
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
    >
      <span id="footprints-globe-instructions" className="sr-only">
        {instructions}
      </span>

      {renderState === 'fallback' && <FallbackEarthPoster />}
    </div>
  )
}

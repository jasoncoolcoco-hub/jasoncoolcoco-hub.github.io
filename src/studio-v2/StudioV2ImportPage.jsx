import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createStudioV2Scene } from './createStudioV2Scene'
import StudioV2Loading from './StudioV2Loading'
import StudioV2RadioScreenPlayer from './StudioV2RadioScreenPlayer'
import {
  createStudioV2DeliveryConfig,
  deliveryRequestFromSearch,
} from './studioV2DerivativeConfig'
import { studioV2EntryTestConfig } from './studioV2EntryGate'
import { createStudioV2AudioController } from './studioV2AudioController'
import { resolveStudioV2AudioCatalogue } from './studioV2AudioCatalogue'

const StudioV2DebugPanel = lazy(() => import('./StudioV2DebugPanel'))

function readableLoadError(error) {
  if (error?.message?.includes('404')) return 'THE MODEL FILE WAS NOT FOUND.'
  return 'CHECK THE CONNECTION AND TRY AGAIN.'
}

export default function StudioV2ImportPage() {
  const mountRef = useRef(null)
  const fadeTimerRef = useRef(null)
  const radioCloseRef = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [audit, setAudit] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [error, setError] = useState('')
  const [entryState, setEntryState] = useState(null)
  const [exploring, setExploring] = useState(false)
  const [loadingVisible, setLoadingVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [runtime, setRuntime] = useState(null)
  const [audioController, setAudioController] = useState(null)
  const [audioState, setAudioState] = useState(null)
  const [radioPanelState, setRadioPanelState] = useState(null)
  const [radioScreenRequest, setRadioScreenRequest] = useState(null)
  const [radioTransitionSpeed, setRadioTransitionSpeed] = useState(() => {
    const requestedSpeed = Number(new URLSearchParams(window.location.search).get('radioSpeed'))
    return [1, 0.5, 0.25].includes(requestedSpeed) ? requestedSpeed : 1
  })
  const searchParams = new URLSearchParams(window.location.search)
  const debugEnabled = searchParams.get('debug') === '1'
  const captureEnabled = searchParams.get('capture') === '1'
  const initialCameraPreset = debugEnabled || captureEnabled
    ? searchParams.get('view') || undefined
    : undefined
  const initialAssetMaterialMode = debugEnabled || captureEnabled
    ? searchParams.get('materials') || undefined
    : undefined
  const initialLightingCandidate = debugEnabled ? searchParams.get('lighting') || undefined : undefined
  const initialToneMapping = debugEnabled || captureEnabled
    ? searchParams.get('tone') || undefined
    : undefined
  const requestedExposure = Number(searchParams.get('exposure'))
  const initialExposure = (debugEnabled || captureEnabled)
    && searchParams.has('exposure')
    && Number.isFinite(requestedExposure)
    ? requestedExposure
    : undefined
  const pixelRatioCap = debugEnabled && searchParams.get('dpr') === '1' ? 1 : undefined
  const auditViewportMatch = (debugEnabled || captureEnabled)
    ? searchParams.get('auditViewport')?.match(/^(\d{3,4})x(\d{3,4})$/)
    : null
  const forcedViewport = auditViewportMatch
    ? [Number(auditViewportMatch[1]), Number(auditViewportMatch[2])]
    : undefined
  const deliveryConfig = createStudioV2DeliveryConfig(
    deliveryRequestFromSearch(searchParams),
    debugEnabled || captureEnabled,
  )
  const entryTestConfig = studioV2EntryTestConfig(
    searchParams,
    debugEnabled || captureEnabled,
    attempt,
  )
  const deliverySignature = JSON.stringify(deliveryConfig)
  const entryTestSignature = JSON.stringify(entryTestConfig)
  const requestedFixtureCount = (debugEnabled || captureEnabled)
    ? Number(searchParams.get('radioFixture'))
    : null
  const radioFixtureCount = [1, 6, 20].includes(requestedFixtureCount)
    ? requestedFixtureCount
    : null

  useEffect(() => {
    if (!mountRef.current) return undefined
    setAudit(null)
    setDiagnostics(null)
    setEntryState(null)
    setError('')
    setExploring(false)
    setLoadingVisible(true)
    setProgress(0)
    setReady(false)
    setRadioPanelState(null)
    setRadioScreenRequest(null)
    const catalogueOverride = debugEnabled ? searchParams.get('audioCatalog') : null
    const catalogueSource = resolveStudioV2AudioCatalogue({
      debug: debugEnabled,
      override: catalogueOverride,
    })
    const controller = createStudioV2AudioController({
      catalogueUrl: catalogueSource.url,
    })
    const unsubscribeAudio = controller.subscribe(setAudioState)
    setAudioController(controller)
    const scene = createStudioV2Scene({
      mount: mountRef.current,
      capture: captureEnabled,
      debug: debugEnabled,
      onDiagnostics: setDiagnostics,
      onEntryState: (nextEntryState) => {
        setEntryState(nextEntryState)
        setProgress(nextEntryState.progress)
      },
      onError: (loadError) => {
        setLoadingVisible(true)
        setError(readableLoadError(loadError))
      },
      onRadioPanelOpenRequest: (startBounds) => {
        setRadioScreenRequest({ key: performance.now(), startBounds })
      },
      onRadioPanelCloseRequest: (options) => radioCloseRef.current?.(options),
      initialCameraPreset,
      initialAssetMaterialMode,
      initialLightingCandidate,
      initialToneMapping,
      initialExposure,
      pixelRatioCap,
      forcedViewport,
      deliveryConfig,
      entryTestConfig,
      audioController: controller,
      onRoomReady: (roomAudit) => {
        setAudit(roomAudit)
      },
      onStudioV2Ready: (modelAudit) => {
        window.dispatchEvent(new CustomEvent('studio-v2-ready', {
          detail: {
            completeReadyMs: modelAudit.completeReadyMs,
            entry: modelAudit.entry,
            firstVisibleFrameMs: modelAudit.firstVisibleFrameMs,
          },
        }))
      },
      onReady: (modelAudit) => {
        setAudit(modelAudit)
        setEntryState(modelAudit.entry)
        setProgress(100)
        setReady(true)
        fadeTimerRef.current = window.setTimeout(() => setLoadingVisible(false), 700)
      },
    })
    const unsubscribeRadioPanel = scene.subscribeRadioPanel(setRadioPanelState)
    setRuntime(scene)
    document.documentElement.classList.add('studio-v2-active')
    document.body.classList.add('studio-v2-active')

    return () => {
      window.clearTimeout(fadeTimerRef.current)
      scene.dispose()
      unsubscribeRadioPanel()
      unsubscribeAudio()
      controller.destroy()
      setRuntime(null)
      setAudioController(null)
      document.documentElement.classList.remove('studio-v2-active')
      document.body.classList.remove('studio-v2-active')
    }
  }, [attempt, captureEnabled, debugEnabled, initialAssetMaterialMode, initialCameraPreset, initialExposure, initialLightingCandidate, initialToneMapping, pixelRatioCap, deliverySignature, entryTestSignature, forcedViewport?.join('x')])

  const enableExplore = () => {
    setExploring(true)
    runtime?.setExplore(true)
  }

  const resetView = () => {
    setExploring(false)
    runtime?.setExplore(false)
    runtime?.resetCamera({ smooth: true })
  }

  return (
    <main
      className={`studio-v2${ready ? ' studio-v2--ready' : ''}`}
      data-scene-ready={ready}
      data-entry-phase={entryState?.phase ?? 'initialising'}
      data-complete-ready-ms={entryState?.completeReadyMs ?? ''}
      data-interactions-enabled={entryState?.interactionsEnabled ?? false}
      data-critical-requests={entryState?.requests?.length ?? 0}
    >
      <div
        ref={mountRef}
        className="studio-v2__canvas"
        role="img"
        aria-label="Interactive three-dimensional presentation of a furnished loft interior"
      />

      <button
        className="studio-v2__audio-accessible-control"
        type="button"
        disabled={!ready || Boolean(error)}
        aria-label={audioState?.status === 'playing' ? 'Pause Marshall music' : 'Play Marshall music'}
        onClick={() => runtime?.toggleMarshallAudio('accessible-button')}
      >
        {audioState?.status === 'playing' ? 'Pause Marshall music' : 'Play Marshall music'}
      </button>

      <section className="studio-v2__radio-accessible" aria-label="Fred Studio Radio">
        <p aria-live="polite">
          {radioPanelState?.selectedTrackTitle ?? 'Audio unavailable'}
          {radioPanelState?.selectedTrackArtist ? ` by ${radioPanelState.selectedTrackArtist}` : ''}
          {audioState?.status ? `, ${audioState.status}` : ''}
        </p>
        <button
          type="button"
          disabled={!ready || Boolean(error)}
          aria-expanded={Boolean(radioScreenRequest)}
          onClick={() => runtime?.toggleRadioPanel()}
        >
          Open Fred Studio Radio
        </button>
      </section>

      {radioScreenRequest && (
        <StudioV2RadioScreenPlayer
          audioController={audioController}
          audioState={audioState}
          fixtureCount={radioFixtureCount}
          request={radioScreenRequest}
          runtime={runtime}
          transitionSpeed={debugEnabled ? radioTransitionSpeed : 1}
          registerClose={(close) => { radioCloseRef.current = close }}
          onStateChange={(state) => runtime?.setRadioScreenState(state)}
          onClosed={() => {
            runtime?.setRadioScreenState({
              open: false,
              transitionState: 'WORLD_COMPACT',
              handoffMode: 'WORLD_COMPACT',
              projectedReturnBounds: runtime?.getRadioPanelScreenBounds(),
              catalogueFixtureCount: radioFixtureCount,
            })
            radioCloseRef.current = null
            setRadioScreenRequest(null)
          }}
        />
      )}

      {debugEnabled && !captureEnabled && (
        <header className="studio-v2__header">
          <a href="/" className="studio-v2__back">BACK</a>
          <p><span>FRED STUDIO</span><small>IMPORTED LOFT / V2</small></p>
          <nav aria-label="Studio controls">
            <button type="button" onClick={resetView} disabled={!ready}>RESET VIEW</button>
            <button type="button" onClick={enableExplore} disabled={!ready} aria-pressed={exploring}>EXPLORE</button>
          </nav>
        </header>
      )}

      {debugEnabled && !captureEnabled && ready && !exploring && (
        <p className="studio-v2__hint">SELECT EXPLORE TO ORBIT THE LOFT</p>
      )}

      <StudioV2Loading
        error={error}
        progress={progress}
        visible={loadingVisible || Boolean(error)}
        onRetry={() => setAttempt((value) => value + 1)}
      />
      {debugEnabled && !captureEnabled && (
        <Suspense fallback={null}>
          <StudioV2DebugPanel
            audit={audit}
            diagnostics={diagnostics}
            entryState={entryState}
            runtime={runtime}
            audioController={audioController}
            radioTransitionSpeed={radioTransitionSpeed}
            onRadioTransitionSpeedChange={setRadioTransitionSpeed}
          />
        </Suspense>
      )}
    </main>
  )
}

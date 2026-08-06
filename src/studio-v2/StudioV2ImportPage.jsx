import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createStudioV2Scene } from './createStudioV2Scene'
import StudioV2Loading from './StudioV2Loading'
import {
  createStudioV2DeliveryConfig,
  deliveryRequestFromSearch,
} from './studioV2DerivativeConfig'
import { studioV2EntryTestConfig } from './studioV2EntryGate'

const StudioV2DebugPanel = lazy(() => import('./StudioV2DebugPanel'))

function readableLoadError(error) {
  if (error?.message?.includes('404')) return 'THE MODEL FILE WAS NOT FOUND.'
  return 'CHECK THE CONNECTION AND TRY AGAIN.'
}

export default function StudioV2ImportPage() {
  const mountRef = useRef(null)
  const fadeTimerRef = useRef(null)
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
      initialCameraPreset,
      initialAssetMaterialMode,
      initialLightingCandidate,
      pixelRatioCap,
      forcedViewport,
      deliveryConfig,
      entryTestConfig,
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
    setRuntime(scene)
    document.documentElement.classList.add('studio-v2-active')
    document.body.classList.add('studio-v2-active')

    return () => {
      window.clearTimeout(fadeTimerRef.current)
      scene.dispose()
      setRuntime(null)
      document.documentElement.classList.remove('studio-v2-active')
      document.body.classList.remove('studio-v2-active')
    }
  }, [attempt, captureEnabled, debugEnabled, initialAssetMaterialMode, initialCameraPreset, initialLightingCandidate, pixelRatioCap, deliverySignature, entryTestSignature, forcedViewport?.join('x')])

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
          />
        </Suspense>
      )}
    </main>
  )
}

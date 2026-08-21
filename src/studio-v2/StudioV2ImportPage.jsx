import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createStudioV2Scene } from './createStudioV2Scene'
import { preloadStudioV2Tier1Assets } from './studioV2Tier1Preload'
import StudioV2Loading from './StudioV2Loading'
import MacbookSitePortal from './macbook-site/MacbookSitePortal'
import {
  createStudioV2DeliveryConfig,
  deliveryRequestFromSearch,
} from './studioV2DerivativeConfig'
import { studioV2EntryTestConfig } from './studioV2EntryGate'
import { createStudioV2AudioController } from './studioV2AudioController'
import { resolveStudioV2AudioCatalogue } from './studioV2AudioCatalogue'
import StudioV2MusicControl from './StudioV2MusicControl'
import {
  studioV2PhotoBoardGridEnabled,
  studioV2PhotoSlotOverlayEnabled,
  studioV2PhotoWallAdjustmentEnabled,
  studioV2PhotoWallDebugPanelEnabled,
  studioV2PhotoWallReviewEnabled,
} from './studioV2PhotoBoardLayout'

preloadStudioV2Tier1Assets()

const StudioV2DebugPanel = lazy(() => import('./StudioV2DebugPanel'))

function readableLoadError(error) {
  if (error?.message?.includes('404')) return 'THE MODEL FILE WAS NOT FOUND.'
  return 'CHECK THE CONNECTION AND TRY AGAIN.'
}

export default function StudioV2ImportPage() {
  const mountRef = useRef(null)
  const fadeTimerRef = useRef(null)
  const revealFrameRef = useRef(null)
  const [attempt, setAttempt] = useState(0)
  const [audit, setAudit] = useState(null)
  const [diagnostics, setDiagnostics] = useState(null)
  const [error, setError] = useState('')
  const [entryState, setEntryState] = useState(null)
  const [exploring, setExploring] = useState(false)
  const [loadingVisible, setLoadingVisible] = useState(true)
  const [loadingExiting, setLoadingExiting] = useState(false)
  const [macbookSitePhase, setMacbookSitePhase] = useState('CLOSED')
  const [macbookSiteState, setMacbookSiteState] = useState('CLOSED')
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [runtime, setRuntime] = useState(null)
  const [audioController, setAudioController] = useState(null)
  const searchParams = new URLSearchParams(window.location.search)
  const debugEnabled = searchParams.get('debug') === '1'
  const captureEnabled = searchParams.get('capture') === '1'
  const performanceEnabled = (debugEnabled || captureEnabled) && searchParams.get('perf') === '1'
  const photoBoardGridEnabled = studioV2PhotoBoardGridEnabled(searchParams, debugEnabled)
  const photoSlotOverlayEnabled = studioV2PhotoSlotOverlayEnabled(searchParams, debugEnabled)
  const photoWallReviewEnabled = studioV2PhotoWallReviewEnabled(searchParams, debugEnabled)
  const photoWallAdjustmentEnabled = studioV2PhotoWallAdjustmentEnabled(searchParams, debugEnabled)
  const photoWallDebugPanelEnabled = studioV2PhotoWallDebugPanelEnabled(searchParams, debugEnabled)
  const initialCameraPreset = photoWallReviewEnabled
    ? 'PHOTO_WALL_REVIEW'
    : debugEnabled || captureEnabled
      ? searchParams.get('view') || undefined
      : undefined
  const requestedCameraProgress = Number(searchParams.get('cameraProgress'))
  const initialAmbientProgress = captureEnabled
    && searchParams.has('cameraProgress')
    && Number.isFinite(requestedCameraProgress)
    ? Math.min(1, Math.max(0, requestedCameraProgress))
    : undefined
  const initialAmbientCandidate = debugEnabled || captureEnabled
    ? ['A', 'B', 'C'].includes(searchParams.get('railCandidate'))
      ? searchParams.get('railCandidate')
      : 'B'
    : 'B'
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
  const requestedDpr = Number(searchParams.get('dpr'))
  const pixelRatioCap = (debugEnabled || captureEnabled) && [1, 2].includes(requestedDpr)
    ? requestedDpr
    : undefined
  const initialFloorReflectionEnabled = debugEnabled || captureEnabled
    ? searchParams.get('reflection') !== 'off'
    : true
  const initialFloorArchitecture = debugEnabled || captureEnabled
    ? searchParams.get('floorArchitecture')?.toUpperCase() || undefined
    : undefined
  const initialReflectionDiagnosticMode = debugEnabled || captureEnabled
    ? searchParams.get('diagnosticMode')?.toUpperCase() || undefined
    : undefined
  const initialShadowProfile = debugEnabled || captureEnabled
    ? searchParams.get('shadowProfile')?.toUpperCase() || undefined
    : undefined
  const initialCompositeMode = debugEnabled || captureEnabled
    ? searchParams.get('compositeMode')?.toUpperCase() || undefined
    : undefined
  const auditViewportMatch = (debugEnabled || captureEnabled)
    ? searchParams.get('auditViewport')?.match(/^(\d{3,4})x(\d{3,4})$/)
    : null
  const forcedViewport = auditViewportMatch
    ? [Number(auditViewportMatch[1]), Number(auditViewportMatch[2])]
    : undefined
  const performanceTest = performanceEnabled
    ? {
      suite: true,
      caseId: searchParams.get('perfCase') || null,
      staticDurationMs: 10000,
      movementDurationMs: 10000,
      slowDriftDurationMs: 30000,
    }
    : null
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
    setLoadingExiting(false)
    setMacbookSitePhase('CLOSED')
    setMacbookSiteState('CLOSED')
    setProgress(0)
    setReady(false)
    const catalogueOverride = debugEnabled ? searchParams.get('audioCatalog') : null
    const catalogueSource = resolveStudioV2AudioCatalogue({
      debug: debugEnabled,
      override: catalogueOverride,
    })
    const controller = createStudioV2AudioController({
      catalogueUrl: catalogueSource.url,
    })
    setAudioController(controller)
    controller.startEntryExperience()
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
      initialAmbientProgress,
      initialAmbientCandidate,
      initialAssetMaterialMode,
      initialLightingCandidate,
      initialToneMapping,
      initialExposure,
      initialFloorReflectionEnabled,
      initialFloorArchitecture,
      initialReflectionDiagnosticMode,
      initialShadowProfile,
      initialCompositeMode,
      pixelRatioCap,
      forcedViewport,
      performanceTest,
      photoBoardGrid: photoBoardGridEnabled,
      photoSlotOverlay: photoSlotOverlayEnabled,
      photoWallAdjustment: photoWallAdjustmentEnabled,
      photoWallReview: photoWallReviewEnabled,
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
            visualReady: modelAudit.visualReady,
          },
        }))
      },
      onReady: (modelAudit) => {
        setAudit(modelAudit)
        setEntryState(modelAudit.visualReady ?? modelAudit.entry)
        setProgress(100)
        setReady(true)
        revealFrameRef.current = window.requestAnimationFrame(() => {
          setLoadingExiting(true)
          fadeTimerRef.current = window.setTimeout(() => setLoadingVisible(false), 520)
        })
      },
    })
    setRuntime(scene)
    document.documentElement.classList.add('studio-v2-active')
    document.body.classList.add('studio-v2-active')

    return () => {
      window.clearTimeout(fadeTimerRef.current)
      window.cancelAnimationFrame(revealFrameRef.current)
      scene.dispose()
      controller.destroy()
      setRuntime(null)
      setAudioController(null)
      document.documentElement.classList.remove('studio-v2-active')
      document.body.classList.remove('studio-v2-active')
    }
  }, [attempt, captureEnabled, debugEnabled, initialAmbientCandidate, initialAmbientProgress, initialAssetMaterialMode, initialCameraPreset, initialCompositeMode, initialExposure, initialFloorArchitecture, initialFloorReflectionEnabled, initialLightingCandidate, initialReflectionDiagnosticMode, initialShadowProfile, initialToneMapping, pixelRatioCap, deliverySignature, entryTestSignature, forcedViewport?.join('x'), performanceEnabled, photoBoardGridEnabled, photoSlotOverlayEnabled, photoWallAdjustmentEnabled, photoWallReviewEnabled])

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
      data-scene-ready={entryState?.sceneReady ?? false}
      data-visual-ready={entryState?.visualReady ?? false}
      data-ui-ready={ready}
      data-entry-phase={entryState?.phase ?? 'initialising'}
      data-complete-ready-ms={entryState?.completeReadyMs ?? ''}
      data-scene-ready-ms={entryState?.sceneReadyAtMs ?? ''}
      data-visual-ready-ms={entryState?.visualReadyAtMs ?? ''}
      data-polaroid-camera-ready={entryState?.polaroidCameraReady ?? false}
      data-photo-wall-ready={entryState?.photoWallReady ?? false}
      data-interactions-enabled={entryState?.interactionsEnabled ?? false}
      data-critical-requests={entryState?.requests?.length ?? 0}
      data-photo-wall-review={photoWallReviewEnabled || undefined}
      data-photo-wall-adjustment={photoWallAdjustmentEnabled || undefined}
      data-photo-slot-overlay={photoSlotOverlayEnabled || undefined}
      data-macbook-site-phase={macbookSitePhase}
      data-macbook-site-state={macbookSiteState}
    >
      <div
        ref={mountRef}
        className="studio-v2__canvas"
        role="img"
        aria-label="Interactive three-dimensional presentation of a furnished loft interior"
      />

      {debugEnabled && !captureEnabled && !performanceEnabled && photoWallDebugPanelEnabled && (
        <header className="studio-v2__header">
          <a href="/" className="studio-v2__back">BACK</a>
          <p><span>FRED STUDIO</span><small>IMPORTED LOFT / V2</small></p>
          <nav aria-label="Studio controls">
            <button type="button" onClick={resetView} disabled={!ready}>RESET VIEW</button>
            <button type="button" onClick={enableExplore} disabled={!ready} aria-pressed={exploring}>EXPLORE</button>
          </nav>
        </header>
      )}

      {debugEnabled && !captureEnabled && !performanceEnabled && photoWallDebugPanelEnabled && ready && !exploring && (
        <p className="studio-v2__hint">SELECT EXPLORE TO ORBIT THE LOFT</p>
      )}

      <StudioV2Loading
        error={error}
        exiting={loadingExiting}
        progress={progress}
        ready={ready}
        visible={loadingVisible || Boolean(error)}
        onRetry={() => setAttempt((value) => value + 1)}
      />
      <MacbookSitePortal
        runtime={runtime}
        sceneReady={ready}
        onPhaseChange={setMacbookSitePhase}
        onStateChange={setMacbookSiteState}
      />
      {ready && audioController && !captureEnabled && !performanceEnabled && (
        <StudioV2MusicControl audioController={audioController} />
      )}
      {debugEnabled && !captureEnabled && !performanceEnabled && photoWallDebugPanelEnabled && (
        <Suspense fallback={null}>
          <StudioV2DebugPanel
            audit={audit}
            diagnostics={diagnostics}
            entryState={entryState}
            runtime={runtime}
            audioController={audioController}
          />
        </Suspense>
      )}
    </main>
  )
}

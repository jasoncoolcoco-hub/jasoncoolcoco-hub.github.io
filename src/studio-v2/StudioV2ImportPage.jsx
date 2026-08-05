import { useEffect, useRef, useState } from 'react'
import { createStudioV2Scene } from './createStudioV2Scene'
import StudioV2DebugPanel from './StudioV2DebugPanel'
import StudioV2Loading from './StudioV2Loading'

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
  const initialLightingCandidate = debugEnabled ? searchParams.get('lighting') || undefined : undefined
  const pixelRatioCap = debugEnabled && searchParams.get('dpr') === '1' ? 1 : undefined

  useEffect(() => {
    if (!mountRef.current) return undefined
    setAudit(null)
    setDiagnostics(null)
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
      onError: (loadError) => setError(readableLoadError(loadError)),
      onProgress: setProgress,
      initialCameraPreset,
      initialLightingCandidate,
      pixelRatioCap,
      onReady: (modelAudit) => {
        setAudit(modelAudit)
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
  }, [attempt, captureEnabled, debugEnabled, initialCameraPreset, initialLightingCandidate, pixelRatioCap])

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
    <main className={`studio-v2${ready ? ' studio-v2--ready' : ''}`}>
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

      {debugEnabled && !captureEnabled && (
        <StudioV2Loading
          error={error}
          progress={progress}
          visible={loadingVisible || Boolean(error)}
          onRetry={() => setAttempt((value) => value + 1)}
        />
      )}
      {debugEnabled && !captureEnabled && (
        <StudioV2DebugPanel
          audit={audit}
          diagnostics={diagnostics}
          runtime={runtime}
        />
      )}
    </main>
  )
}

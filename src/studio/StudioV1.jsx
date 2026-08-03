import { useEffect, useRef, useState } from 'react'
import { studioDimensions } from './config/studioConfig'
import { createFredStudioScene } from './scene/createFredStudioScene'

const referenceImage = '/docs/references/fred-studio-v1/fred-again-mexico-city-reference.png'

function formatVector(vector = []) {
  return vector.join(', ')
}

export default function StudioV1() {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const params = new URLSearchParams(window.location.search)
  const debug = params.get('debug') === '1'
  const compare = params.get('compare') === '1'
  const capture = params.get('capture') === '1'
  const reviewView = params.get('review')
  const [cameraState, setCameraState] = useState(null)
  const [overlayOpacity, setOverlayOpacity] = useState(0.48)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [gridVisible, setGridVisible] = useState(false)
  const [wireframe, setWireframe] = useState(reviewView === 'wireframe')
  const [axesVisible, setAxesVisible] = useState(false)
  const [labelsVisible, setLabelsVisible] = useState(false)
  const [materialsVisible, setMaterialsVisible] = useState(true)
  const [lightingVisible, setLightingVisible] = useState(true)
  const [shadowsVisible, setShadowsVisible] = useState(true)
  const [glassVisible, setGlassVisible] = useState(true)
  const [renderMode, setRenderMode] = useState(reviewView === 'clay' ? 'clay' : 'realistic')

  useEffect(() => {
    if (!mountRef.current) return undefined
    const scene = createFredStudioScene({
      mount: mountRef.current,
      debug,
      reviewView,
      onCameraChange: setCameraState,
    })
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [debug, reviewView])

  return (
    <main className="studio-v1">
      <div
        ref={mountRef}
        className="studio-v1__canvas"
        role="img"
        aria-label="High-angle three-dimensional study of a large studio hard-shell architecture"
      />

      {compare && overlayVisible && (
        <div
          className="studio-v1__reference"
          style={{ '--reference-opacity': overlayOpacity, backgroundImage: `url(${referenceImage})` }}
          aria-hidden="true"
        >
          <span className="studio-v1__guide studio-v1__guide--vertical" />
          <span className="studio-v1__guide studio-v1__guide--horizontal" />
          <span className="studio-v1__guide studio-v1__guide--third-left" />
          <span className="studio-v1__guide studio-v1__guide--third-right" />
        </div>
      )}

      {compare && !capture && (
        <aside className="studio-v1__compare-panel" aria-label="Reference comparison controls">
          <button type="button" onClick={() => setOverlayVisible((visible) => !visible)}>
            {overlayVisible ? 'HIDE REFERENCE' : 'SHOW REFERENCE'}
          </button>
          <label>
            OPACITY
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={overlayOpacity}
              onChange={(event) => setOverlayOpacity(Number(event.target.value))}
            />
          </label>
        </aside>
      )}

      {debug && !capture && (
        <aside className="studio-v1__debug-panel" aria-label="Studio development controls">
          <header>
            <strong>FRED STUDIO / DEBUG</strong>
            <span>{studioDimensions.width} × {studioDimensions.depth} × {studioDimensions.maximumHeight} M</span>
          </header>
          <dl>
            <div><dt>CAMERA</dt><dd>{formatVector(cameraState?.position)}</dd></div>
            <div><dt>TARGET</dt><dd>{formatVector(cameraState?.target)}</dd></div>
            <div><dt>FOV</dt><dd>{cameraState?.fov}</dd></div>
          </dl>
          <div className="studio-v1__debug-actions">
            {['hero', 'top', 'left', 'right', 'section'].map((view) => (
              <button key={view} type="button" onClick={() => sceneRef.current?.setView(view)}>{view}</button>
            ))}
          </div>
          <div className="studio-v1__debug-actions">
            <button type="button" aria-pressed={gridVisible} onClick={() => {
              setGridVisible((visible) => {
                sceneRef.current?.setGrid(!visible)
                return !visible
              })
            }}>GRID</button>
            <button type="button" aria-pressed={wireframe} onClick={() => {
              setWireframe((visible) => {
                sceneRef.current?.setWireframe(!visible)
                return !visible
              })
            }}>WIREFRAME</button>
            <button type="button" aria-pressed={axesVisible} onClick={() => {
              setAxesVisible((visible) => {
                sceneRef.current?.setAxes(!visible)
                return !visible
              })
            }}>AXES</button>
            <button type="button" aria-pressed={labelsVisible} onClick={() => {
              setLabelsVisible((visible) => {
                sceneRef.current?.setLabels(!visible)
                return !visible
              })
            }}>LABELS</button>
          </div>
          <div className="studio-v1__debug-actions">
            <button type="button" aria-pressed={materialsVisible} onClick={() => {
              setMaterialsVisible((visible) => {
                sceneRef.current?.setMaterials(!visible)
                return !visible
              })
            }}>MATERIALS</button>
            <button type="button" aria-pressed={lightingVisible} onClick={() => {
              setLightingVisible((visible) => {
                sceneRef.current?.setLighting(!visible)
                return !visible
              })
            }}>LIGHTING</button>
            <button type="button" aria-pressed={shadowsVisible} onClick={() => {
              setShadowsVisible((visible) => {
                sceneRef.current?.setShadows(!visible)
                return !visible
              })
            }}>SHADOWS</button>
            <button type="button" aria-pressed={glassVisible} onClick={() => {
              setGlassVisible((visible) => {
                sceneRef.current?.setGlass(!visible)
                return !visible
              })
            }}>GLASS</button>
          </div>
          <div className="studio-v1__debug-actions studio-v1__debug-actions--modes">
            {['realistic', 'clay'].map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={renderMode === mode}
                onClick={() => {
                  setRenderMode(mode)
                  sceneRef.current?.setRenderMode(mode)
                }}
              >{mode}</button>
            ))}
          </div>
          <label className="studio-v1__fov-control">
            FOV
            <input
              type="range"
              min="35"
              max="75"
              step="1"
              value={cameraState?.fov || 61}
              onChange={(event) => sceneRef.current?.setFov(event.target.value)}
            />
          </label>
        </aside>
      )}
    </main>
  )
}

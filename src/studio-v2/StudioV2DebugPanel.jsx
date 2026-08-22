import { useEffect, useState } from 'react'
import {
  STUDIO_V2_CAMERA_PRESETS,
  STUDIO_V2_LIGHTING,
  STUDIO_V2_LIGHTING_CANDIDATES,
  STUDIO_V2_MODEL_TRANSFORM,
  STUDIO_V2_RENDERING,
  STUDIO_V2_SHADOW_PROFILES,
} from './studioV2Config'
import {
  STUDIO_V2_FLOOR_ARCHITECTURES,
  STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES,
} from './studioV2FloorReflection'
import {
  STUDIO_V2_ANCHORS,
  STUDIO_V2_ANCHOR_NAMES,
  formatStudioV2Anchor,
} from './studioV2Anchors'
import {
  STUDIO_V2_APPROVED_OPENING_CAMERA,
  STUDIO_V2_COORDINATE_SYSTEM,
  STUDIO_V2_FLOOR_Y,
  STUDIO_V2_INTERIOR_BOUNDS,
  STUDIO_V2_INTERIOR_CENTER,
} from './studioV2Coordinates'
import {
  STUDIO_V2_DERIVATIVE_OPTIONS,
  STUDIO_V2_OFFICIAL_DELIVERY,
} from './studioV2DerivativeConfig'

function vectorText(vector) {
  return vector?.join(', ') ?? '—'
}

function boundsText(record) {
  return record ? `${vectorText(record.size)} · C ${vectorText(record.center)}` : '—'
}

function materialValueText(record) {
  if (!record) return '—'
  const { original, refined } = record
  const clearcoat = refined.clearcoat === null ? '' : ` · CC ${refined.clearcoat}`
  return `M ${original.metalness}→${refined.metalness} · R ${original.roughness}→${refined.roughness} · ENV ${original.envMapIntensity}→${refined.envMapIntensity}${clearcoat}`
}

function readinessText(value) {
  return value ? 'READY' : 'PENDING'
}

async function copyJson(value) {
  await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
}

async function copyText(value) {
  await navigator.clipboard.writeText(value)
}

function InspectorRow({ label, value }) {
  return <div><dt>{label}</dt><dd>{value ?? '—'}</dd></div>
}

const PLACED_OBJECT_ANCHOR_NAMES = Object.freeze([
  'MACBOOK_ISLAND_01',
  'PHOTO_BOARD_01',
  'POLAROID_CAMERA_01',
])

const placedObjectAnchorText = PLACED_OBJECT_ANCHOR_NAMES
  .map((name) => formatStudioV2Anchor(name, STUDIO_V2_ANCHORS[name]))
  .join('\n\n')

function ToggleButton({ children, active, onClick, disabled = false }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function setDeliverySearchParam(name, value, defaultValue) {
  const params = new URLSearchParams(window.location.search)
  params.set('debug', '1')
  if (value === defaultValue) params.delete(name)
  else params.set(name, value)
  window.location.search = params.toString()
}

function SpatialNumber({ label, value, step = 0.01, onChange }) {
  return (
    <label className="studio-v2__debug-number">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => {
          const next = Number(event.currentTarget.value)
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </label>
  )
}

export default function StudioV2DebugPanel({
  audit,
  diagnostics,
  entryState,
  runtime,
  audioController,
}) {
  const [helpers, setHelpers] = useState({ lights: false })
  const [assetMaterialMode, setAssetMaterialMode] = useState('refined')
  const [, setSpatialRevision] = useState(0)
  const [, setVisualRevision] = useState(0)
  const [anchorName, setAnchorName] = useState(STUDIO_V2_ANCHOR_NAMES[0])
  const [audioState, setAudioState] = useState(() => audioController?.getState?.() ?? {})
  const visual = diagnostics?.visual ?? runtime?.getVisualConfig?.() ?? {}
  const safety = diagnostics?.safety ?? runtime?.getCameraSafety?.() ?? {}
  const cameraDirector = diagnostics?.cameraDirector ?? runtime?.getCameraDirectorState?.() ?? {}
  const ambient = cameraDirector.ambient ?? {}
  const ambientReport = runtime?.getAmbientCameraReport?.() ?? {}
  const macbookFocus = runtime?.getMacbookFocusState?.() ?? {}
  const macbookDisplay = runtime?.getMacbookDisplayContract?.() ?? {}
  const delivery = runtime?.getAssetDeliveryConfig?.() ?? audit?.delivery ?? {}
  const entry = entryState
    ?? diagnostics?.entry
    ?? runtime?.getSceneReadyState?.()
    ?? {}

  useEffect(() => (
    audioController?.subscribe?.(setAudioState) ?? undefined
  ), [audioController])

  if (!runtime) return null

  const toggleHelper = (name, setter) => {
    const next = !helpers[name]
    setHelpers((current) => ({ ...current, [name]: next }))
    setter(next)
  }

  const runSpatial = (action) => {
    action()
    setSpatialRevision((current) => current + 1)
  }
  const spatial = runtime.getSpatialState?.() ?? diagnostics?.spatial ?? null
  const placeholder = spatial?.placeholder
  const picked = spatial?.pick
  const placedObjects = runtime.getPlacedObjects?.() ?? []
  const photoPackaging = placedObjects.find((record) => record.anchorName === 'PHOTO_BOARD_01')?.photoPackaging
  const materialOverrides = placedObjects.flatMap((record) => record.resources.materialOverrides ?? [])
  const materialOverrideById = Object.fromEntries(materialOverrides.map((record) => [record.id, record]))

  const switchAssetMaterialMode = (mode) => {
    setAssetMaterialMode(runtime.setAssetMaterialMode?.(mode) ?? mode)
  }

  return (
    <aside className="studio-v2__debug" aria-label="Studio V2 development controls">
      <header>
        <strong>FRED STUDIO / V2 DEBUG</strong>
        <span>IMPORTED GLB</span>
      </header>

      <section className="studio-v2__debug-section">
        <h2>RUNTIME</h2>
        <dl>
          <InspectorRow label="FPS" value={diagnostics?.fps} />
          <InspectorRow label="CALLS" value={diagnostics?.calls} />
          <InspectorRow label="TRIANGLES" value={diagnostics?.triangles?.toLocaleString?.()} />
          <InspectorRow label="GEOMETRIES" value={diagnostics?.geometries ?? audit?.geometries} />
          <InspectorRow label="TEXTURES" value={diagnostics?.textures ?? audit?.textures} />
          <InspectorRow label="VIEWPORT" value={vectorText(diagnostics?.viewport)} />
          <InspectorRow label="LOAD" value={audit ? `${audit.loadTimeMs} MS` : null} />
          <InspectorRow label="ANISOTROPY" value={audit?.maximumAnisotropy} />
          <InspectorRow label="ROOM FIRST FRAME" value={audit?.firstRoomFrameMs ? `${audit.firstRoomFrameMs} MS` : null} />
        </dl>
      </section>

      <section className="studio-v2__debug-section studio-v2__debug-section--entry">
        <h2>SCENE READY GATE</h2>
        <dl>
          <InspectorRow label="PHASE" value={entry.phase?.toUpperCase?.()} />
          <InspectorRow label="TOTAL PROGRESS" value={Number.isFinite(entry.progress) ? `${Math.round(entry.progress)}%` : null} />
          <InspectorRow label="ROOM READY" value={readinessText(entry.roomReady)} />
          <InspectorRow label="MACBOOK READY" value={readinessText(entry.macBookReady)} />
          <InspectorRow label="PHOTO BOARD READY" value={readinessText(entry.photoBoardReady)} />
          <InspectorRow label="PHOTO WALL READY" value={readinessText(entry.photoWallReady)} />
          <InspectorRow label="POLAROID CAMERA READY" value={readinessText(entry.polaroidCameraReady)} />
          <InspectorRow label="TEXTURES READY" value={readinessText(entry.texturesReady)} />
          <InspectorRow label="MATERIALS READY" value={readinessText(entry.materialsReady)} />
          <InspectorRow label="ANCHORS READY" value={readinessText(entry.anchorsReady)} />
          <InspectorRow label="WORLD MATRICES READY" value={readinessText(entry.worldMatricesReady)} />
          <InspectorRow label="SHADER READY" value={readinessText(entry.shaderReady)} />
          <InspectorRow label="WARM-UP READY" value={readinessText(entry.warmupReady)} />
          <InspectorRow label="SCENE READY" value={readinessText(entry.sceneReady)} />
          <InspectorRow label="INTERACTIONS" value={entry.interactionsEnabled ? 'ENABLED' : 'DISABLED'} />
          <InspectorRow label="CRITICAL REQUESTS" value={entry.requests?.length} />
          <InspectorRow label="ERROR" value={entry.error ? `${entry.error.assetId ?? 'SCENE'} · ${entry.error.message}` : 'NONE'} />
        </dl>
      </section>

      <section className="studio-v2__debug-section studio-v2__debug-section--delivery">
        <h2>GLOBAL AUDIO</h2>
        <dl>
          <InspectorRow label="CATALOGUE" value={audioState.catalogueStatus?.toUpperCase?.()} />
          <InspectorRow label="CATALOGUE URL" value={audioState.catalogueUrl} />
          <InspectorRow label="TRACK ID" value={audioState.trackId} />
          <InspectorRow label="TRACK TITLE" value={audioState.trackTitle} />
          <InspectorRow label="AUDIO STATE" value={audioState.status?.toUpperCase?.()} />
          <InspectorRow label="AUDIO ELEMENT" value={audioState.audioElementExists ? 'EXISTS' : 'MISSING'} />
          <InspectorRow label="SOURCE" value={audioState.src} />
          <InspectorRow label="READY / NETWORK" value={`${audioState.readyState ?? '—'} / ${audioState.networkState ?? '—'}`} />
          <InspectorRow label="PAUSED / ENDED / MUTED" value={`${audioState.paused ? 'YES' : 'NO'} / ${audioState.ended ? 'YES' : 'NO'} / ${audioState.muted ? 'YES' : 'NO'}`} />
          <InspectorRow label="ENTRY AUDIO" value={audioState.entryStatus?.toUpperCase?.()} />
          <InspectorRow label="AUTOPLAY POLICY" value={audioState.autoplayPolicy?.toUpperCase?.()} />
          <InspectorRow label="PLAY ATTEMPT" value={audioState.playAttemptState?.toUpperCase?.()} />
          <InspectorRow label="PLAY PROMISE" value={audioState.latestPlayPromiseResult} />
          <InspectorRow label="FALLBACK ARMED" value={audioState.fallbackArmed ? 'YES' : 'NO'} />
          <InspectorRow label="FALLBACK CONSUMED" value={audioState.fallbackConsumed ? 'YES' : 'NO'} />
          <InspectorRow label="FIRST GESTURE FALLBACK" value={audioState.firstGestureFallbackUsed ? 'USED' : 'NO'} />
          <InspectorRow label="CURRENT TIME" value={Number(audioState.currentTime ?? 0).toFixed(2)} />
          <InspectorRow label="DURATION" value={Number.isFinite(audioState.duration) ? Number(audioState.duration).toFixed(2) : '—'} />
          <InspectorRow label="VOLUME" value={Number(audioState.volume ?? 0).toFixed(2)} />
          <InspectorRow label="VOLUME RAMP" value={audioState.activeVolumeRamp ? 'ACTIVE' : 'IDLE'} />
          <InspectorRow label="MANUAL INTENT" value={audioState.manualIntentState?.toUpperCase?.()} />
          <InspectorRow label="LOOP" value={audioState.loop ? 'ON' : 'OFF'} />
          <InspectorRow label="LAST ERROR" value={audioState.errorCode ?? audioState.error ?? 'NONE'} />
          <InspectorRow label="MEDIA ERROR" value={audioState.latestMediaError ?? 'NONE'} />
        </dl>
      </section>

      <section className="studio-v2__debug-section studio-v2__debug-section--delivery">
        <h2>ASSET DELIVERY</h2>
        <h3>TEXTURES</h3>
        <div className="studio-v2__debug-actions">
          {STUDIO_V2_DERIVATIVE_OPTIONS.textures.map((value) => (
            <ToggleButton
              key={value}
              active={(delivery.textures ?? 'source') === value}
              onClick={() => setDeliverySearchParam('textures', value, STUDIO_V2_OFFICIAL_DELIVERY.textures)}
            >
              {value.toUpperCase()}
            </ToggleButton>
          ))}
        </div>
        <h3>MESH COMPRESSION</h3>
        <div className="studio-v2__debug-actions">
          {STUDIO_V2_DERIVATIVE_OPTIONS.meshCompression.map((value) => (
            <ToggleButton
              key={value}
              active={(delivery.meshCompression ?? 'off') === value}
              onClick={() => setDeliverySearchParam('mesh', value, STUDIO_V2_OFFICIAL_DELIVERY.meshCompression)}
            >
              {value.toUpperCase()}
            </ToggleButton>
          ))}
        </div>
        <h3>LOADING</h3>
        <div className="studio-v2__debug-actions">
          {STUDIO_V2_DERIVATIVE_OPTIONS.loading.map((value) => (
            <ToggleButton
              key={value}
              active={(delivery.loading ?? 'eager') === value}
              onClick={() => setDeliverySearchParam('loading', value, STUDIO_V2_OFFICIAL_DELIVERY.loading)}
            >
              {value.toUpperCase()}
            </ToggleButton>
          ))}
          <ToggleButton
            active={Boolean(delivery.selectiveShadows)}
            onClick={() => setDeliverySearchParam(
              'microShadows',
              delivery.selectiveShadows ? 'on' : 'off',
              'on',
            )}
          >
            MICRO SHADOWS {delivery.selectiveShadows ? 'OFF' : 'ON'}
          </ToggleButton>
        </div>
        <dl>
          <InspectorRow label="OFFICIAL DEFAULT" value={delivery.officialDefault ? 'APPROVED OPTIMISED' : 'DEBUG OVERRIDE'} />
          <InspectorRow label="GPU TEXTURE FORMAT" value={delivery.selectedGpuTextureFormat} />
          <InspectorRow label="ROOM" value={delivery.roomUrl} />
          <InspectorRow label="MACBOOK" value={delivery.macbookUrl} />
        </dl>
      </section>

      <section className="studio-v2__debug-section studio-v2__debug-section--materials">
        <h2>ASSET MATERIALS</h2>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={assetMaterialMode === 'original'}
            onClick={() => switchAssetMaterialMode('original')}
          >
            ORIGINAL
          </ToggleButton>
          <ToggleButton
            active={assetMaterialMode === 'refined'}
            onClick={() => switchAssetMaterialMode('refined')}
          >
            REFINED
          </ToggleButton>
        </div>
        <dl>
          <InspectorRow label="MODE" value={assetMaterialMode.toUpperCase()} />
          <InspectorRow label="OVERRIDES" value={materialOverrides.length} />
          <InspectorRow label="ANISOTROPY" value={placedObjects[0]?.resources.anisotropy} />
          <InspectorRow
            label="COLOUR SPACE FIXES"
            value={placedObjects.reduce((total, record) => total + (record.resources.colorSpaceCorrections?.length ?? 0), 0)}
          />
          <InspectorRow label="MAC ALUMINIUM" value={materialValueText(materialOverrideById['macbook-aluminium-deck'])} />
          <InspectorRow label="MAC SCREEN" value={materialValueText(materialOverrideById['macbook-display-glass'])} />
          <InspectorRow label="NORMAL CORRECTIONS" value="NONE REQUIRED" />
        </dl>
      </section>

      <section className="studio-v2__debug-section studio-v2__debug-section--spatial">
        <h2>SPATIAL / PLACEMENT</h2>
        <dl>
          <InspectorRow label="UNITS" value={STUDIO_V2_COORDINATE_SYSTEM.unit.toUpperCase()} />
          <InspectorRow label="ORIGIN" value={vectorText(STUDIO_V2_COORDINATE_SYSTEM.origin)} />
          <InspectorRow label="+X" value={STUDIO_V2_COORDINATE_SYSTEM.axes.x} />
          <InspectorRow label="+Y" value={STUDIO_V2_COORDINATE_SYSTEM.axes.y} />
          <InspectorRow label="+Z" value={STUDIO_V2_COORDINATE_SYSTEM.axes.z} />
          <InspectorRow label="FLOOR Y" value={STUDIO_V2_FLOOR_Y.toFixed(3)} />
          <InspectorRow label="INTERIOR C" value={vectorText(STUDIO_V2_INTERIOR_CENTER)} />
          <InspectorRow label="INTERIOR MIN" value={vectorText(STUDIO_V2_INTERIOR_BOUNDS.min)} />
          <InspectorRow label="INTERIOR MAX" value={vectorText(STUDIO_V2_INTERIOR_BOUNDS.max)} />
          <InspectorRow label="OPEN CAMERA" value={vectorText(STUDIO_V2_APPROVED_OPENING_CAMERA.constrainedPosition)} />
          <InspectorRow label="OPEN TARGET" value={vectorText(STUDIO_V2_APPROVED_OPENING_CAMERA.constrainedTarget)} />
          <InspectorRow label="GRID" value={spatial ? `${spatial.grid.minorStep} MINOR / ${spatial.grid.majorStep} MAJOR` : 'LOADING'} />
        </dl>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={Boolean(spatial?.axes)}
            disabled={!spatial}
            onClick={() => runSpatial(() => runtime.setAxes(!spatial?.axes))}
          >
            AXES
          </ToggleButton>
          <ToggleButton
            active={Boolean(spatial?.grid?.visible)}
            disabled={!spatial}
            onClick={() => runSpatial(() => runtime.setGrid(!spatial?.grid?.visible))}
          >
            GRID
          </ToggleButton>
          <ToggleButton
            active={Boolean(spatial?.bounds)}
            disabled={!spatial}
            onClick={() => runSpatial(() => runtime.setBounds(!spatial?.bounds))}
          >
            BOUNDS
          </ToggleButton>
          <ToggleButton
            active={Boolean(spatial?.pickEnabled)}
            disabled={!spatial}
            onClick={() => runSpatial(() => runtime.setPickPosition(!spatial?.pickEnabled))}
          >
            PICK POSITION
          </ToggleButton>
          <button type="button" disabled={!picked} onClick={() => runSpatial(runtime.clearPick)}>
            CLEAR PICK
          </button>
        </div>

        <h3>PICK INSPECTOR</h3>
        <dl>
          <InspectorRow label="POSITION" value={vectorText(picked?.position)} />
          <InspectorRow label="NORMAL" value={vectorText(picked?.normal)} />
          <InspectorRow label="MESH" value={picked?.mesh} />
          <InspectorRow label="MATERIAL" value={picked?.material} />
          <InspectorRow label="SURFACE" value={picked?.surfaceType} />
          <InspectorRow label="CAM DIST" value={picked?.cameraDistance} />
        </dl>
        <div className="studio-v2__debug-actions">
          <button type="button" disabled={!picked} onClick={() => copyText(runtime.copyPickedPosition())}>
            COPY POSITION
          </button>
          <button type="button" disabled={!picked} onClick={() => copyText(runtime.copyPickedPositionAndNormal())}>
            COPY POSITION + NORMAL
          </button>
        </div>

        <h3>PLACEMENT_PLACEHOLDER</h3>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={Boolean(placeholder?.visible)}
            disabled={!placeholder}
            onClick={() => runSpatial(() => runtime.setPlaceholderVisible(!placeholder?.visible))}
          >
            {placeholder?.visible ? 'HIDE' : 'SHOW'}
          </ToggleButton>
          <button type="button" disabled={!placeholder} onClick={() => runSpatial(runtime.resetPlaceholder)}>RESET</button>
          <button type="button" disabled={!picked} onClick={() => runSpatial(runtime.movePlaceholderToPick)}>MOVE TO PICKED</button>
          <button type="button" disabled={!picked} onClick={() => runSpatial(runtime.alignPlaceholderToPick)}>ALIGN TO PICKED</button>
        </div>
        {placeholder && (
          <>
            <div className="studio-v2__debug-number-grid">
              {['X', 'Y', 'Z'].map((axis, index) => (
                <SpatialNumber
                  key={`position-${axis}`}
                  label={`POS ${axis}`}
                  value={placeholder.position[index]}
                  onChange={(value) => runSpatial(() => runtime.setPlaceholderPosition(index, value))}
                />
              ))}
              {['X', 'Y', 'Z'].map((axis, index) => (
                <SpatialNumber
                  key={`rotation-${axis}`}
                  label={`ROT ${axis}°`}
                  value={placeholder.rotationDegrees[index]}
                  step={1}
                  onChange={(value) => runSpatial(() => runtime.setPlaceholderRotationDegrees(index, value))}
                />
              ))}
              {['W', 'H', 'D'].map((axis, index) => (
                <SpatialNumber
                  key={`size-${axis}`}
                  label={axis}
                  value={placeholder.size[index]}
                  onChange={(value) => runSpatial(() => runtime.setPlaceholderSize(index, value))}
                />
              ))}
              <SpatialNumber
                label="SCALE"
                value={placeholder.uniformScale}
                onChange={(value) => runSpatial(() => runtime.setPlaceholderUniformScale(value))}
              />
            </div>
            <button className="studio-v2__debug-copy" type="button" onClick={() => copyText(runtime.copyPlaceholderTransform())}>
              COPY TRANSFORM
            </button>
          </>
        )}

        <h3>NAMED ANCHOR DRAFT</h3>
        <label className="studio-v2__debug-select">
          <span>ANCHOR NAME</span>
          <select value={anchorName} onChange={(event) => setAnchorName(event.currentTarget.value)}>
            {STUDIO_V2_ANCHOR_NAMES.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <div className="studio-v2__debug-actions">
          <button type="button" disabled={!placeholder} onClick={() => runSpatial(() => runtime.savePlaceholderAsAnchor(anchorName))}>
            SAVE PLACEHOLDER AS ANCHOR
          </button>
          <button type="button" disabled={!spatial?.anchorDraft} onClick={() => copyText(runtime.copyAnchor())}>
            COPY ANCHOR
          </button>
          <button type="button" disabled={!spatial?.anchorDraft} onClick={() => runSpatial(runtime.clearUnsavedAnchor)}>
            CLEAR UNSAVED ANCHOR
          </button>
        </div>
        <pre className="studio-v2__debug-output">{spatial?.anchorCopyText ?? `${anchorName}: null`}</pre>

        <h3>PLACED OBJECT ANCHORS</h3>
        <pre className="studio-v2__debug-output">{placedObjectAnchorText}</pre>
        <dl>
          {placedObjects.map((record) => (
            <InspectorRow
              key={record.anchorName}
              label={record.anchorName}
              value={`ASSET ${record.assetScale} · ${record.resources.meshes} MESHES · WORLD ${boundsText(record.worldBounds)}`}
            />
          ))}
        </dl>

        <h3>PHOTO PACKAGING</h3>
        <dl>
          <InspectorRow label="DEFAULT STYLE" value={photoPackaging?.defaultStyle?.toUpperCase()} />
          <InspectorRow
            label="MANIFEST / POSITIONED"
            value={photoPackaging ? `${photoPackaging.manifestCount} / ${photoPackaging.positionedCount}` : 'NOT LOADED'}
          />
          <InspectorRow label="COORDINATES" value={photoPackaging ? '(0,0) TOP-LEFT · (100,100) BOTTOM-RIGHT · CENTER ANCHOR' : null} />
          <InspectorRow label="USABLE CORK" value={photoPackaging?.boardSurface ? `${photoPackaging.boardSurface.worldWidth} × ${photoPackaging.boardSurface.worldHeight} M` : null} />
          <InspectorRow label="COORDINATE GRID" value={photoPackaging?.debugCoordinateOverlay ? 'VISIBLE · ?debug=1&photoGrid=1' : 'OFF'} />
          {photoPackaging?.records?.map((record) => (
            <InspectorRow
              key={record.id}
              label={record.id}
              value={`${record.style.toUpperCase()} · ${record.orientation} · ${record.sourceWidth}×${record.sourceHeight} · ${record.dimensions.width.toFixed(3)}×${record.dimensions.height.toFixed(3)} M`}
            />
          ))}
        </dl>
      </section>

      <section className="studio-v2__debug-section">
        <h2>CAMERA / ORBIT</h2>
        <h3>MACBOOK FOCUS</h3>
        <dl>
          <InspectorRow label="STATE" value={macbookFocus.state} />
          <InspectorRow label="SEMANTIC TARGET" value={macbookFocus.semanticTarget} />
          <InspectorRow label="DISPLAY MESH" value={macbookDisplay.meshName} />
          <InspectorRow label="DISPLAY WORLD W/H" value={macbookDisplay.worldWidth ? `${macbookDisplay.worldWidth} × ${macbookDisplay.worldHeight}` : null} />
          <InspectorRow label="DISPLAY OCCUPANCY" value={macbookDisplay.solvedPose?.projection?.widthRatio} />
          <InspectorRow label="DISPLAY SKEW" value={macbookDisplay.solvedPose?.projection?.skewRatio} />
          <InspectorRow label="FOCUS FOV / NEAR" value={macbookDisplay.solvedPose ? `${macbookDisplay.solvedPose.fov} / ${macbookDisplay.solvedPose.near}` : null} />
          <InspectorRow label="FOCUS POSITION" value={vectorText(macbookDisplay.solvedPose?.position)} />
          <InspectorRow label="FOCUS TARGET" value={vectorText(macbookDisplay.solvedPose?.target)} />
          <InspectorRow label="CORRIDOR" value={macbookFocus.corridor?.safe ? `${macbookFocus.corridor.samples} SAMPLES SAFE` : 'NOT AUDITED / BLOCKED'} />
          <InspectorRow label="CORRIDOR BOUNDARY CLEARANCE" value={macbookFocus.corridor?.minimumBoundaryClearance} />
          <InspectorRow label="CONTROLS" value={macbookFocus.controlsLocked ? 'LOCKED' : 'AVAILABLE'} />
          <InspectorRow label="SCREEN API" value={macbookFocus.screenInteractionEnabled ? 'READY FOR STAGE 5B' : 'INACTIVE'} />
          <InspectorRow label="LAST REQUEST" value={macbookFocus.lastRequest} />
        </dl>
        <div className="studio-v2__debug-actions">
          <button type="button" onClick={() => runtime.requestMacbookFocus('DEBUG_BUTTON')}>ENTER MACBOOK FOCUS</button>
          <button type="button" onClick={() => runtime.closeMacbookFocus('DEBUG_BUTTON')}>EXIT MACBOOK FOCUS</button>
          <button type="button" onClick={() => runtime.refreshMacbookFocus()}>REFRESH RESPONSIVE POSE</button>
        </div>
        <div className="studio-v2__debug-actions">
          {['AUTO', 'REDUCE', 'ALLOW'].map((mode) => (
            <button key={`macbook-${mode}`} type="button" onClick={() => runtime.setMacbookReducedMotionOverride(mode)}>
              MACBOOK MOTION {mode}
            </button>
          ))}
        </div>
        <dl>
          <InspectorRow label="DIRECTOR STATE" value={cameraDirector.state} />
          <InspectorRow label="DIRECTOR INPUT OWNER" value={cameraDirector.inputOwner} />
          <InspectorRow label="DIRECTOR INPUT TYPE" value={cameraDirector.inputType} />
          <InspectorRow label="DIRECTOR TRANSITION" value={cameraDirector.transition?.id ?? 'NONE'} />
          <InspectorRow label="VIEW PITCH" value={Number.isFinite(cameraDirector.viewPitchDegrees) ? `${cameraDirector.viewPitchDegrees}°` : '—'} />
          <InspectorRow label="TABLE PITCH RANGE" value={cameraDirector.tablePitchRangeDegrees ? `${cameraDirector.tablePitchRangeDegrees.min}° — ${cameraDirector.tablePitchRangeDegrees.max}°` : '—'} />
          <InspectorRow label="RAIL CONSUMED BY" value={ambient.railConsumedBy ?? 'NONE'} />
          <InspectorRow label="TRANSITION PROGRESS" value={cameraDirector.transition ? cameraDirector.transition.progress : 'N.A.'} />
          <InspectorRow label="AMBIENT PROGRESS" value={ambient.railProgress} />
          <InspectorRow label="AMBIENT TIME" value={`${ambient.driftElapsedMs ?? '—'} / ${ambient.driftDurationMs ?? '—'} MS`} />
          <InspectorRow label="OBSERVATION TIME" value={`${ambient.observationElapsedMs ?? '—'} MS`} />
          <InspectorRow label="OBSERVATION YAW" value={`${ambient.observationYawDegrees ?? '—'}°`} />
          <InspectorRow label="OBSERVATION PITCH" value={`${ambient.observationPitchDegrees ?? '—'}°`} />
          <InspectorRow label="OFFICIAL RAIL" value={ambient.officialLockedRail ? 'LOCKED' : 'DEBUG / MANUAL'} />
          <InspectorRow label="ENTRY START" value={ambient.entryStartedAt == null ? 'N.A.' : `${ambient.entryStartedAt} MS`} />
          <InspectorRow label="PATH CANDIDATE" value={ambientReport.rail?.selectedCandidate || 'N.A.'} />
          <InspectorRow label="PATH DISTANCE" value={`${ambient.currentPathDistance ?? '—'} / ${ambient.totalPathDistance ?? '—'} M`} />
          <InspectorRow label="FROZEN PROGRESS" value={ambient.frozenProgress ?? 'NO'} />
          <InspectorRow label="ENDPOINT PHASE" value={ambient.endpointPhase ?? 'NONE'} />
          <InspectorRow label="BASE POSITION" value={vectorText(ambient.basePosition)} />
          <InspectorRow label="BASE TARGET" value={vectorText(ambient.baseTarget)} />
          <InspectorRow label="DISPLAYED TARGET" value={vectorText(ambient.displayedTarget)} />
          <InspectorRow label="HEAD LOOK YAW" value={`${ambient.yawOffsetDegrees ?? '—'}°`} />
          <InspectorRow label="HEAD LOOK PITCH" value={`${ambient.pitchOffsetDegrees ?? '—'}°`} />
          <InspectorRow label="OVERRIDE IDLE" value={ambient.overrideIdleRemainingMs == null ? 'N.A.' : `${ambient.overrideIdleRemainingMs} MS`} />
          <InspectorRow label="RETURN PROGRESS" value={ambient.returnProgress ?? 'N.A.'} />
          <InspectorRow label="AMBIENT SPEED" value={`${ambient.speedMultiplier ?? 1}×`} />
          <InspectorRow label="AMBIENT PAUSE" value={ambient.paused ? (ambient.pauseReasons?.join(', ') || 'RESUME DELAY') : 'RUNNING'} />
          <InspectorRow label="VISIBILITY" value={ambient.visibilityPauseState} />
          <InspectorRow label="REDUCED MOTION" value={ambient.reducedMotionActive ? `ON (${ambient.reducedMotionOverride})` : `OFF (${ambient.reducedMotionOverride ?? 'AUTO'})`} />
          <InspectorRow label="RAIL PATH SAFETY" value={ambient.pathSafety?.valid ? `${ambient.pathSafety.sampleCount}/${ambient.pathSafety.sampleCount} SAFE` : `${ambient.pathSafety?.invalidSamples ?? '—'} UNSAFE`} />
          <InspectorRow label="RAIL BOUNDARY CLEARANCE" value={ambient.pathSafety?.minimumBoundaryClearance} />
          <InspectorRow label="RAIL OBSTACLE CLEARANCE" value={ambient.pathSafety?.minimumObstacleClearance} />
          <InspectorRow label="RAIL TARGET CLEARANCE" value={ambient.pathSafety?.minimumTargetClearance} />
          <InspectorRow label="TABLE 360 SAFETY" value={ambient.tableOrbitSafety?.safe ? `${ambient.tableOrbitSafety.totalSamples}/${ambient.tableOrbitSafety.totalSamples} SAFE` : `${ambient.tableOrbitSafety?.invalidSamples ?? '—'} / ${ambient.tableOrbitSafety?.totalSamples ?? '—'} UNSAFE`} />
          <InspectorRow label="TABLE BOUNDARY CLEARANCE" value={ambient.tableOrbitSafety?.minimumBoundaryClearance} />
          <InspectorRow label="TABLE OBSTACLE CLEARANCE" value={ambient.tableOrbitSafety?.minimumObstacleClearance} />
          <InspectorRow label="ORBIT RADIUS" value={cameraDirector.orbitRadius} />
          <InspectorRow label="SAFETY CLAMP" value={cameraDirector.safetyClampActive ? 'ACTIVE' : 'CLEAR'} />
          <InspectorRow label="LAST VOLUME BOUNDARY" value={cameraDirector.safety?.lastViolatedBoundary} />
          <InspectorRow label="SAFE REPRESENTATION" value={cameraDirector.safety?.representation} />
          <InspectorRow label="CAMERA RADIUS" value={cameraDirector.safety?.cameraRadius} />
          <InspectorRow label="CAMERA" value={vectorText(diagnostics?.camera?.position)} />
          <InspectorRow label="REQUESTED CAMERA" value={vectorText(safety.requestedCameraPosition)} />
          <InspectorRow label="LAST BLOCKED CAMERA" value={vectorText(safety.lastBlockedRequestedCameraPosition)} />
          <InspectorRow label="TARGET" value={vectorText(diagnostics?.camera?.target)} />
          <InspectorRow label="REQUESTED TARGET" value={vectorText(safety.requestedTarget)} />
          <InspectorRow label="LAST BLOCKED TARGET" value={vectorText(safety.lastBlockedRequestedTarget)} />
          <InspectorRow label="FOV" value={diagnostics?.camera?.fov} />
          <InspectorRow label="INTERIOR SAFE" value={diagnostics?.camera?.safe ? 'YES' : 'NO'} />
          <InspectorRow label="ORBIT" value={diagnostics?.orbit?.enabled ? 'ENABLED' : 'LOCKED UNTIL EXPLORE'} />
          <InspectorRow label="AZIMUTH" value={diagnostics?.orbit?.azimuth} />
          <InspectorRow
            label="OFFICIAL VIEW SECTOR"
            value={diagnostics?.orbit?.officialViewSector
              ? `${diagnostics.orbit.officialViewSector.minAzimuthDegrees}° — ${diagnostics.orbit.officialViewSector.maxAzimuthDegrees}°`
              : null}
          />
          <InspectorRow label="OPENING AZIMUTH" value={diagnostics?.orbit?.officialViewSector ? `${diagnostics.orbit.officialViewSector.openingAzimuthDegrees.toFixed(2)}°` : null} />
          <InspectorRow
            label="VIEW SAFETY MARGIN"
            value={diagnostics?.orbit?.officialViewSector
              ? `${diagnostics.orbit.officialViewSector.visualSafetyMarginDegrees.min}° / ${diagnostics.orbit.officialViewSector.visualSafetyMarginDegrees.max}°`
              : null}
          />
          <InspectorRow label="OFFICIAL REAR OCCLUSION" value={diagnostics?.orbit?.rearWall?.occlusionProtectionEnabled ? 'ON / CAMERA BACKSTOP' : 'OFF'} />
          <InspectorRow label="VISUAL OCCLUSION PLANE" value={diagnostics?.orbit?.rearWall?.visualOcclusionBarrierAdded ? 'ACTIVE' : 'NOT REQUIRED'} />
          <InspectorRow label="WALL FILLER FALLBACK" value={diagnostics?.orbit?.rearWall?.wallFillerFallbackActive ? 'ACTIVE' : 'OFF'} />
          <InspectorRow label="OFFICIAL VIRTUAL REAR WALL" value={diagnostics?.orbit?.rearWall?.enabled ? 'ON' : 'OFF'} />
          <InspectorRow label="REAR WALL TYPE" value={diagnostics?.orbit?.rearWall?.type} />
          <InspectorRow label="REAR WALL VISIBILITY" value={diagnostics?.orbit?.rearWall?.visible ? 'VISIBLE FALLBACK' : 'INVISIBLE CONTROL BACKSTOP'} />
          <InspectorRow label="REAR WALL APPLIED" value={diagnostics?.orbit?.rearWall?.applied ? 'YES' : 'NO / DEBUG 360°'} />
          <InspectorRow label="ACTIVE REAR CLAMP" value={diagnostics?.orbit?.rearWall?.activeClampState} />
          <InspectorRow label="CURRENT AZIMUTH" value={diagnostics?.orbit?.rearWall ? `${diagnostics.orbit.rearWall.currentAzimuthDegrees.toFixed(2)}°` : null} />
          <InspectorRow label="REAR HALF-SPACE MIN" value={diagnostics?.orbit?.rearWall?.minPlaneDistance?.toFixed?.(4)} />
          <InspectorRow label="REAR HALF-SPACE MAX" value={diagnostics?.orbit?.rearWall?.maxPlaneDistance?.toFixed?.(4)} />
          <InspectorRow label="PAN" value={diagnostics?.orbit?.pan ? 'BOUNDED DEBUG PAN' : 'DISABLED'} />
          <InspectorRow label="ZOOM" value={diagnostics?.orbit?.zoom ? `${safety.minDistance} — ${safety.maxDistance}` : 'DISABLED'} />
          <InspectorRow label="TARGET MODE" value={diagnostics?.orbit?.target} />
          <InspectorRow label="CAMERA MIN" value={vectorText(safety.cameraMin)} />
          <InspectorRow label="CAMERA MAX" value={vectorText(safety.cameraMax)} />
          <InspectorRow label="TARGET MIN" value={vectorText(safety.targetMin)} />
          <InspectorRow label="TARGET MAX" value={vectorText(safety.targetMax)} />
          <InspectorRow label="ACTIVE BOUNDARY" value={safety.activeBoundary} />
          <InspectorRow label="ACTIVE CATEGORY" value={safety.activeCollisionCategory} />
          <InspectorRow label="ACTIVE COLLIDER" value={safety.activeColliderName} />
          <InspectorRow label="MOVEMENT CANCELLED" value={safety.movementCancelled ? 'YES' : 'NO'} />
          <InspectorRow label="CANCELLED COMPONENT" value={safety.cancelledComponents?.join(', ')} />
          <InspectorRow label="DAMPING CLEARED" value={safety.dampingCleared ? 'YES' : 'NO'} />
          <InspectorRow label="LAST BLOCKED BOUNDARY" value={safety.lastBlockedBoundary} />
          <InspectorRow label="LAST COLLISION CATEGORY" value={safety.lastCollisionCategory} />
          <InspectorRow label="LAST COLLIDER" value={safety.lastColliderName} />
          <InspectorRow label="LAST COMPONENT CANCELLED" value={safety.lastMovementCancelled ? safety.lastCancelledComponents?.join(', ') : 'NO'} />
          <InspectorRow label="LAST DAMPING CLEARED" value={safety.lastDampingCleared ? 'YES' : 'NO'} />
          <InspectorRow label="LAST VALID CAMERA" value={vectorText(safety.lastValidCameraPosition)} />
          <InspectorRow label="LAST VALID TARGET" value={vectorText(safety.lastValidTarget)} />
          <InspectorRow label="LAST VALID DISTANCE" value={safety.lastValidDistance} />
          <InspectorRow label="FLOOR_Y" value={safety.floorY} />
          <InspectorRow label="CAMERA FLOOR CLEARANCE" value={safety.cameraFloorClearance} />
          <InspectorRow label="TARGET FLOOR CLEARANCE" value={safety.targetFloorClearance} />
          <InspectorRow label="FLOOR EPSILON" value={safety.floorEpsilon} />
          <InspectorRow label="MINIMUM SAFE CAMERA Y" value={safety.minimumCameraY} />
          <InspectorRow label="CURRENT CAMERA Y" value={safety.currentCameraY} />
          <InspectorRow label="CANDIDATE CAMERA Y" value={safety.candidateCameraY} />
          <InspectorRow label="LAST FLOOR CANDIDATE Y" value={safety.lastFloorCandidateY} />
          <InspectorRow label="TARGET Y" value={safety.targetY} />
          <InspectorRow label="RADIUS" value={safety.radius} />
          <InspectorRow label="POLAR ANGLE" value={safety.currentPolarAngle} />
          <InspectorRow label="DYNAMIC MAX POLAR" value={safety.dynamicMaxPolarAngle} />
          <InspectorRow label="LAST FLOOR MAX POLAR" value={safety.lastFloorDynamicMaxPolarAngle} />
          <InspectorRow label="FLOOR CONTACT" value={safety.floorContactActive ? 'ACTIVE' : 'CLEAR'} />
          <InspectorRow label="DOWNWARD MOMENTUM" value={safety.downwardMomentumCancelled ? 'CANCELLED' : 'CLEAR'} />
          <InspectorRow label="FLOOR CORRECTIONS" value={safety.floorCorrectionCount} />
          <InspectorRow label="CORRECTIONS" value={safety.corrections} />
          <InspectorRow label="ARCHITECTURE CORRECTIONS" value={safety.architectureCorrectionCount} />
          <InspectorRow label="FURNITURE CORRECTIONS" value={safety.furnitureCorrectionCount} />
          <InspectorRow label="SOFA CORRECTIONS" value={safety.sofaCorrectionCount} />
          <InspectorRow label="STABILIZATIONS" value={safety.stabilizations} />
          <InspectorRow label="LAST CLAMP" value={safety.lastCorrection} />
        </dl>
        <label className="studio-v2__debug-number">
          <span>AMBIENT SCRUB</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={ambient.railProgress ?? 0}
            onChange={(event) => runtime.scrubAmbientCamera(Number(event.currentTarget.value))}
          />
        </label>
        <div className="studio-v2__debug-actions">
          <button type="button" onClick={() => runtime.startAmbientCamera({ immediate: true })}>
            START IDLE OBSERVATION
          </button>
          <button type="button" onClick={() => runtime.resetAmbientCamera()}>
            RESET ROOM WIDE
          </button>
          <button type="button" onClick={() => runtime.jumpCameraToTableOverview()}>
            JUMP TABLE OVERVIEW
          </button>
          <button type="button" onClick={() => runtime.requestTableSkip()}>
            SKIP TO TABLE
          </button>
          <button type="button" onClick={() => runtime.enterTableFreeOrbit()}>
            ENTER TABLE FREE ORBIT
          </button>
          <button type="button" onClick={() => runtime.requestPhotoWallFocus('DEBUG_BUTTON')}>
            ENTER PHOTO WALL FOCUS
          </button>
          <button type="button" onClick={() => runtime.closePhotoWallFocus('DEBUG_BUTTON')}>
            EXIT PHOTO WALL FOCUS
          </button>
          <button type="button" onClick={() => runtime.setDebugTablePitch(-35)}>TABLE PITCH −35°</button>
          <button type="button" onClick={() => runtime.setDebugTablePitch(0)}>TABLE EYE LEVEL 0°</button>
          <button type="button" onClick={() => runtime.setDebugTablePitch(6)}>TABLE PITCH +6°</button>
        </div>
        <div className="studio-v2__debug-actions">
          <button type="button" onClick={() => runtime.scrubAmbientCamera(0.999)}>
            SCRUB 99.9% RAIL
          </button>
          <button type="button" onClick={() => runtime.scrubAmbientCamera(1)}>
            SCRUB 100% OVERVIEW
          </button>
        </div>
        <div className="studio-v2__debug-actions">
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: 0, pitchDegrees: 0 })}>
            OVERRIDE BASE 50%
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: -20, pitchDegrees: 0 })}>
            YAW −20°
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: 20, pitchDegrees: 0 })}>
            YAW +20°
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: 0, pitchDegrees: -8 })}>
            PITCH −8°
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: 0, pitchDegrees: 10 })}>
            PITCH +10°
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.5, yawDegrees: 18, pitchDegrees: 8 })}>
            COMBINED +18° / +8°
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.2, yawDegrees: 12, pitchDegrees: 5 })}>
            COMBINED 20% SMALL
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLook({ progress: 0.8, yawDegrees: 12, pitchDegrees: 5 })}>
            COMBINED 80% SMALL
          </button>
          <button type="button" onClick={() => runtime.releaseDebugHeadLook()}>
            RELEASE / IDLE RETURN
          </button>
          <button type="button" onClick={() => runtime.setDebugHeadLookReturnProgress(0.5)}>
            SET RETURN 50%
          </button>
          <button type="button" onClick={() => runtime.interruptDebugHeadLookReturn({ yawDegrees: -8, pitchDegrees: 3 })}>
            RE-INTERRUPT RETURN
          </button>
        </div>
        <div className="studio-v2__debug-actions">
          {[1, 5, 10, 20].map((multiplier) => (
            <ToggleButton
              key={multiplier}
              active={ambient.speedMultiplier === multiplier}
              onClick={() => runtime.setAmbientCameraSpeed(multiplier)}
            >
              {multiplier}× SPEED
            </ToggleButton>
          ))}
        </div>
        <div className="studio-v2__debug-actions">
          {[0.82, 1.05, 1.28].flatMap((radius) => [-180, -90, 0, 90, 180].map((azimuth) => (
            <button
              key={`${radius}-${azimuth}`}
              type="button"
              onClick={() => runtime.setDebugTableOrbitPose({ radius, azimuthDegrees: azimuth, polarRadians: 1.37 })}
            >
              ORBIT R{radius.toFixed(2)} A{azimuth}
            </button>
          )))}
        </div>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={Boolean(helpers.ambientPath)}
            onClick={() => {
              const visible = !helpers.ambientPath
              runtime.setAmbientPathVisible(visible)
              setHelpers((current) => ({ ...current, ambientPath: visible }))
            }}
          >
            AMBIENT PATH {helpers.ambientPath ? 'ON' : 'OFF'}
          </ToggleButton>
          <ToggleButton
            active={Boolean(helpers.ambientControlPoints)}
            onClick={() => {
              const visible = !helpers.ambientControlPoints
              runtime.setAmbientControlPointsVisible(visible)
              setHelpers((current) => ({ ...current, ambientControlPoints: visible }))
            }}
          >
            CONTROL POINTS {helpers.ambientControlPoints ? 'ON' : 'OFF'}
          </ToggleButton>
        </div>
        <div className="studio-v2__debug-actions">
          {['AUTO', 'REDUCE', 'ALLOW'].map((mode) => (
            <ToggleButton
              key={mode}
              active={ambient.reducedMotionOverride === mode}
              onClick={() => runtime.setAmbientReducedMotionOverride(mode)}
            >
              MOTION {mode}
            </ToggleButton>
          ))}
        </div>
        <div className="studio-v2__debug-actions">
          <button type="button" onClick={() => runtime.transitionCameraTo('ROOM_WIDE_START_CANDIDATE', { duration: 1200 })}>
            TRANSITION WIDE
          </button>
          <button type="button" onClick={() => runtime.transitionCameraTo('TABLE_OVERVIEW_CANDIDATE', { duration: 1200 })}>
            TRANSITION TABLE
          </button>
          <button type="button" onClick={() => runtime.cancelCameraTransition('DEBUG_CANCEL')}>
            CANCEL TRANSITION
          </button>
          <button type="button" onClick={() => runtime.resetCameraDirectorOpening({ smooth: false })}>
            RESET ACCEPTED OPENING
          </button>
        </div>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={Boolean(helpers.safeVolume)}
            onClick={() => {
              const visible = !helpers.safeVolume
              runtime.setCameraSafeVolumeVisible(visible)
              setHelpers((current) => ({ ...current, safeVolume: visible }))
            }}
          >
            SAFE VOLUME {helpers.safeVolume ? 'ON' : 'OFF'}
          </ToggleButton>
          <ToggleButton
            active={Boolean(helpers.cameraObstacles)}
            onClick={() => {
              const visible = !helpers.cameraObstacles
              runtime.setCameraMajorObstaclesVisible(visible)
              setHelpers((current) => ({ ...current, cameraObstacles: visible }))
            }}
          >
            MAJOR OBSTACLES {helpers.cameraObstacles ? 'ON' : 'OFF'}
          </ToggleButton>
        </div>
        <div className="studio-v2__debug-actions">
          <ToggleButton
            active={Boolean(diagnostics?.orbit?.rearWall?.previewEnabled)}
            onClick={() => runtime.setOfficialRearWallPreview(!diagnostics?.orbit?.rearWall?.previewEnabled)}
          >
            OFFICIAL REAR WALL {diagnostics?.orbit?.rearWall?.previewEnabled ? 'PREVIEW ON' : 'PREVIEW OFF'}
          </ToggleButton>
        </div>
        <div className="studio-v2__debug-actions">
          {Object.keys(STUDIO_V2_CAMERA_PRESETS).map((presetName) => (
            <button key={presetName} type="button" onClick={() => runtime.setCameraPreset(presetName)}>
              {presetName.replace('FOV_', '')}
            </button>
          ))}
        </div>
        <button className="studio-v2__debug-copy" type="button" onClick={() => copyJson(runtime.getCameraConfig())}>
          COPY CAMERA CONFIG
        </button>
        <button className="studio-v2__debug-copy" type="button" onClick={() => copyText(runtime.captureCurrentCameraPose())}>
          COPY DIRECTOR POSE
        </button>
      </section>

      <section className="studio-v2__debug-section">
        <h2>COLLISION CLASSIFICATION</h2>
        <dl>
          <InspectorRow label="SOLVER" value={safety.collisionSolver} />
          <InspectorRow label="SAFE VOLUME" value={safety.safeOrbitVolume?.shape ?? 'N.A.'} />
          <InspectorRow label="SAFE VOLUME CENTRE" value={vectorText(safety.safeOrbitVolume?.center)} />
          <InspectorRow label="SAFE VOLUME Y" value={safety.safeOrbitVolume ? `${safety.safeOrbitVolume.minY} — ${safety.safeOrbitVolume.maxY}` : 'N.A.'} />
          <InspectorRow label="SAFE VOLUME RADIUS" value={safety.safeOrbitVolume?.horizontalRadius ?? 'N.A.'} />
          <InspectorRow label="FIXED TARGET" value={vectorText(safety.fixedTarget)} />
          <InspectorRow label="FURNITURE COLLISION EXPERIMENTAL" value={safety.furnitureCollisionExperimental ? 'ON' : 'OFF'} />
          <InspectorRow label="FURNITURE COLLISION ACTIVE" value={safety.furnitureCollisionActive ? 'YES' : 'NO'} />
          <InspectorRow label="OFFICIAL FURNITURE COLLISION" value={safety.furnitureCollisionOfficial ? 'ON' : 'OFF'} />
          <InspectorRow label="AUTO MESH COLLIDERS" value={safety.automaticMeshColliders ? 'ENABLED' : 'DISABLED'} />
          <InspectorRow label="TEA SET" value={safety.teaSetClassification} />
          <InspectorRow label="SMALL PROP MAX EXTENT" value={safety.smallPropMaxExtent} />
          <InspectorRow label="MAJOR COLLIDERS" value={safety.majorFurnitureColliders?.join(' · ')} />
          <InspectorRow label="CAGE EXCLUDED" value={safety.cageExcludedMajorFurniture?.join(' · ')} />
          <InspectorRow label="COLLIDER OVERLAPS" value={safety.colliderOverlapCount === 0 ? 'NONE' : safety.colliderOverlaps?.join(' · ')} />
          <InspectorRow label="SOLVER ORDER" value={safety.solverOrder?.join(' → ')} />
          <InspectorRow label="EXCLUSION RULES" value={safety.exclusionRules?.join(' · ')} />
          <InspectorRow label="FUTURE WALK MODE" value={safety.futureWalkMode?.separateSystemRequired ? 'SEPARATE CAPSULE / SWEPT SYSTEM REQUIRED' : 'N.A.'} />
        </dl>
      </section>

      <section className="studio-v2__debug-section">
        <h2>VISUAL SYSTEM</h2>
        <div className="studio-v2__debug-actions">
          {Object.keys(STUDIO_V2_LIGHTING_CANDIDATES).map((candidateName) => (
            <ToggleButton
              key={candidateName}
              active={visual.lightingCandidate === candidateName}
              onClick={() => runtime.setLightingCandidate(candidateName)}
            >
              {candidateName.replace('LIGHTING_', '')}
            </ToggleButton>
          ))}
        </div>
        <div className="studio-v2__debug-actions">
          <ToggleButton active={visual.ibl} onClick={() => runtime.setIbl(!visual.ibl)}>IBL {visual.ibl ? 'ON' : 'OFF'}</ToggleButton>
          <ToggleButton active={visual.shadows} onClick={() => runtime.setShadows(!visual.shadows)}>SHADOWS {visual.shadows ? 'ON' : 'OFF'}</ToggleButton>
          <ToggleButton
            active={Boolean(visual.floorReflection?.enabled)}
            onClick={() => {
              runtime.setFloorReflection(!visual.floorReflection?.enabled)
              setVisualRevision((current) => current + 1)
            }}
          >
            REFLECTION {visual.floorReflection?.enabled ? 'ON' : 'OFF'}
          </ToggleButton>
          <ToggleButton active={false} disabled>AO OFF / N.A.</ToggleButton>
          <ToggleButton active={false} disabled>BLOOM OFF / N.A.</ToggleButton>
        </div>
        <div className="studio-v2__debug-actions">
          {Object.keys(STUDIO_V2_SHADOW_PROFILES).map((profileName) => (
            <ToggleButton
              key={profileName}
              active={visual.shadowProfile === profileName}
              disabled={profileName === 'VSM_SOFT' && !visual.vsmSupported}
              onClick={() => {
                runtime.setShadowProfile(profileName)
                setVisualRevision((current) => current + 1)
              }}
            >
              {STUDIO_V2_SHADOW_PROFILES[profileName].label}
            </ToggleButton>
          ))}
        </div>
        <div className="studio-v2__debug-actions">
          {Object.keys(STUDIO_V2_FLOOR_ARCHITECTURES).map((architecture) => (
            <ToggleButton
              key={architecture}
              active={visual.floorReflection?.architectureCandidate === architecture}
              onClick={() => {
                runtime.setFloorArchitecture(architecture)
                setVisualRevision((current) => current + 1)
              }}
            >
              {STUDIO_V2_FLOOR_ARCHITECTURES[architecture].label}
            </ToggleButton>
          ))}
        </div>
        <div className="studio-v2__debug-actions">
          {Object.keys(STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES).map((mode) => (
            <ToggleButton
              key={mode}
              active={visual.floorReflection?.diagnosticMode === mode}
              onClick={() => {
                runtime.setReflectionDiagnosticMode(mode)
                setVisualRevision((current) => current + 1)
              }}
            >
              {STUDIO_V2_REFLECTION_DIAGNOSTIC_MODES[mode]}
            </ToggleButton>
          ))}
        </div>
        <dl>
          <InspectorRow label="TONE MAPPING" value={visual.toneMapping ?? STUDIO_V2_RENDERING.toneMapping} />
          <InspectorRow label="ENVIRONMENT MODE" value={visual.environmentMode ?? 'ROOM_ENVIRONMENT_PMREM'} />
          <InspectorRow label="LIGHTS" value={visual.lightCount ?? 4} />
          <InspectorRow label="SHADOW TYPE" value={visual.shadowType ?? 'PCFShadowMap'} />
          <InspectorRow label="SHADOW CONTRIBUTION" value={Number(visual.shadowIntensity ?? STUDIO_V2_LIGHTING.key.shadowIntensity).toFixed(2)} />
          <InspectorRow label="SHADOW RADIUS" value={visual.shadowRadius ?? STUDIO_V2_LIGHTING.key.shadowRadius} />
          <InspectorRow label="SHADOW BLUR SAMPLES" value={visual.shadowBlurSamples ?? 0} />
          <InspectorRow label="SHADOW MAP" value={`${visual.shadowMapSize ?? STUDIO_V2_LIGHTING.key.shadowMapSize}²`} />
          <InspectorRow label="BIAS" value={visual.shadowBias ?? STUDIO_V2_LIGHTING.key.shadowBias} />
          <InspectorRow label="NORMAL BIAS" value={visual.shadowNormalBias ?? STUDIO_V2_LIGHTING.key.shadowNormalBias} />
          <InspectorRow label="CASTING LIGHTS" value={visual.shadowCasters ?? 1} />
          <InspectorRow label="FLOOR CANDIDATE" value={visual.floorReflection?.architectureLabel ?? 'N.A.'} />
          <InspectorRow label="FLOOR ARCHITECTURE" value={visual.floorReflection?.architecture ?? 'N.A.'} />
          <InspectorRow label="DIAGNOSTIC OUTPUT" value={visual.floorReflection?.diagnosticMode ?? 'N.A.'} />
          <InspectorRow label="REFLECTION TARGET" value={visual.floorReflection ? `${visual.floorReflection.textureSize?.join('×')} / MSAA ${visual.floorReflection.multisample}` : 'N.A.'} />
          <InspectorRow label="REFLECTION STRENGTH" value={visual.floorReflection?.reflectionStrength ?? 'N.A.'} />
          <InspectorRow label="REFLECTION F0" value={visual.floorReflection?.f0 ?? 'N.A.'} />
          <InspectorRow label="WEIGHT MODEL" value={visual.floorReflection?.weightModel ?? 'N.A.'} />
          <InspectorRow label="BASE POLISH LOBE" value={visual.floorReflection?.basePolish ?? 'N.A.'} />
          <InspectorRow label="LUMINANCE THRESHOLDS" value={visual.floorReflection ? `${visual.floorReflection.lowerLuminanceThreshold} — ${visual.floorReflection.upperLuminanceThreshold}` : 'N.A.'} />
          <InspectorRow label="FINAL WEIGHT CLAMP" value={visual.floorReflection?.finalWeightClamp ?? 'N.A.'} />
          <InspectorRow label="REFLECTION LUMINANCE" value={visual.floorReflection ? `${visual.floorReflection.lowLuminanceContribution} — ${visual.floorReflection.highLuminanceContribution}` : 'N.A.'} />
          <InspectorRow label="FLOOR BRDF" value={visual.floorReflection ? `R ${visual.floorReflection.roughness} · CC ${visual.floorReflection.clearcoat} / ${visual.floorReflection.clearcoatRoughness} · ENV ${visual.floorReflection.envMapIntensity}` : 'N.A.'} />
          <InspectorRow label="NORMAL DISTORTION" value={visual.floorReflection ? `${visual.floorReflection.normalDistortionTexels} TEXELS` : 'N.A.'} />
          <InspectorRow label="PROJECTED UV" value={visual.floorReflection?.coverageAudit ? `${visual.floorReflection.coverageAudit.projectedUv.minU.toFixed(3)}, ${visual.floorReflection.coverageAudit.projectedUv.minV.toFixed(3)} — ${visual.floorReflection.coverageAudit.projectedUv.maxU.toFixed(3)}, ${visual.floorReflection.coverageAudit.projectedUv.maxV.toFixed(3)}` : 'NOT AUDITED'} />
          <InspectorRow label="PROJECTED UV AREA" value={visual.floorReflection?.coverageAudit ? `${visual.floorReflection.coverageAudit.projectedUvAreaPercent}%` : 'N.A.'} />
          <InspectorRow label="SAMPLED SOURCE BINS" value={visual.floorReflection?.coverageAudit ? `${visual.floorReflection.coverageAudit.sampledSourceBinsPercent}%` : 'N.A.'} />
          <InspectorRow label="BLACK REGION IMPACT" value={visual.floorReflection?.coverageAudit?.blackRegionAffectsFinal ? 'YES / REVIEW' : 'NO'} />
          <InspectorRow label="CLAMP TO EDGE" value={visual.floorReflection?.coverageAudit?.clampToEdge ? 'YES' : 'NO'} />
          <InspectorRow label="BLUR TARGETS" value={visual.floorReflection?.blurTextureSize ? `2 × ${visual.floorReflection.blurTextureSize.join('×')}` : 'OFF'} />
          <InspectorRow label="BLUR FILTER" value={visual.floorReflection?.blurPasses ? `${visual.floorReflection.blurPasses} PASSES × ${visual.floorReflection.blurSampleTapsPerPass} TAPS / OFFSET ${visual.floorReflection.blurSampleOffset}` : 'OFF'} />
          <InspectorRow label="COLOUR PIPELINE" value={visual.floorReflection?.colourPipeline ?? 'N.A.'} />
          <InspectorRow label="REFLECTION UPDATE" value={visual.floorReflection?.updateStrategy ?? 'N.A.'} />
          <InspectorRow label="ACTIVE CADENCE" value={visual.floorReflection ? `${visual.floorReflection.updateCadence} / ${visual.floorReflection.updateCadenceHz} HZ` : 'N.A.'} />
          <InspectorRow label="REFLECTION PERF" value={visual.floorReflection ? `${visual.floorReflection.updateCount} RENDERS / ${visual.floorReflection.updateRateHz} HZ` : 'N.A.'} />
          <InspectorRow label="REFLECTION TARGETS" value={visual.floorReflection ? `${visual.floorReflection.activeTargets} ACTIVE / ${visual.floorReflection.allocatedTargets} ALLOCATED` : 'N.A.'} />
          <InspectorRow label="BLUR PERF" value={visual.floorReflection ? `${visual.floorReflection.blurUpdateCount} RENDERS / ${visual.floorReflection.blurUpdateRateHz} HZ` : 'N.A.'} />
        </dl>
        <label className="studio-v2__debug-range">
          <span>ENV INTENSITY <output>{Number(visual.environmentIntensity ?? STUDIO_V2_RENDERING.environmentIntensity).toFixed(2)}</output></span>
          <input type="range" min="0" max="2" step="0.01" defaultValue={STUDIO_V2_RENDERING.environmentIntensity} onInput={(event) => runtime.setEnvironmentIntensity(event.currentTarget.value)} />
        </label>
        <label className="studio-v2__debug-range">
          <span>EXPOSURE <output>{Number(visual.exposure ?? STUDIO_V2_RENDERING.exposure).toFixed(2)}</output></span>
          <input type="range" min="0.5" max="1.5" step="0.01" defaultValue={STUDIO_V2_RENDERING.exposure} onInput={(event) => runtime.setExposure(event.currentTarget.value)} />
        </label>
        <label className="studio-v2__debug-range">
          <span>KEY INTENSITY <output>{Number(visual.keyIntensity ?? STUDIO_V2_LIGHTING.key.intensity).toFixed(2)}</output></span>
          <input type="range" min="0" max="3" step="0.01" defaultValue={STUDIO_V2_LIGHTING.key.intensity} onInput={(event) => runtime.setKeyIntensity(event.currentTarget.value)} />
        </label>
        <label className="studio-v2__debug-range">
          <span>WINDOW FILL <output>{Number(visual.windowFillIntensity ?? STUDIO_V2_LIGHTING.windowFill.intensity).toFixed(2)}</output></span>
          <input type="range" min="0" max="5" step="0.05" defaultValue={STUDIO_V2_LIGHTING.windowFill.intensity} onInput={(event) => runtime.setWindowFillIntensity(event.currentTarget.value)} />
        </label>
        <label className="studio-v2__debug-range">
          <span>CEILING BOUNCE <output>{Number(visual.ceilingBounceIntensity ?? STUDIO_V2_LIGHTING.ceilingBounce.intensity).toFixed(2)}</output></span>
          <input type="range" min="0" max="2" step="0.02" defaultValue={STUDIO_V2_LIGHTING.ceilingBounce.intensity} onInput={(event) => runtime.setCeilingBounceIntensity(event.currentTarget.value)} />
        </label>
        <button className="studio-v2__debug-copy" type="button" onClick={() => copyJson(runtime.getVisualConfig())}>
          COPY VISUAL CONFIG
        </button>
      </section>

      <section className="studio-v2__debug-section">
        <h2>MODEL AUDIT</h2>
        <dl>
          <InspectorRow label="FULL BOUNDS" value={boundsText(audit?.fullBoundsRecord)} />
          <InspectorRow label="INTERIOR" value={boundsText(audit?.interiorBoundsRecord)} />
          <InspectorRow label="BACKGROUND TEXTURE" value={vectorText(audit?.environment?.background?.texture)} />
          <InspectorRow label="LIGHTING ENVIRONMENT" value={audit?.environment?.lighting?.mode ?? '—'} />
          <InspectorRow label="ROOT POS" value={vectorText(STUDIO_V2_MODEL_TRANSFORM.position)} />
          <InspectorRow label="ROOT ROT" value={vectorText(STUDIO_V2_MODEL_TRANSFORM.rotation)} />
          <InspectorRow label="ROOT SCALE" value={STUDIO_V2_MODEL_TRANSFORM.scale} />
        </dl>
        <div className="studio-v2__debug-actions">
          <ToggleButton active={helpers.lights} onClick={() => toggleHelper('lights', runtime.setLightHelpers)}>LIGHTS</ToggleButton>
        </div>
      </section>
    </aside>
  )
}

import { useState } from 'react'
import {
  STUDIO_V2_CAMERA_PRESETS,
  STUDIO_V2_LIGHTING,
  STUDIO_V2_LIGHTING_CANDIDATES,
  STUDIO_V2_MODEL_TRANSFORM,
  STUDIO_V2_RENDERING,
} from './studioV2Config'

function vectorText(vector) {
  return vector?.join(', ') ?? '—'
}

function boundsText(record) {
  return record ? `${vectorText(record.size)} · C ${vectorText(record.center)}` : '—'
}

async function copyJson(value) {
  await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
}

function InspectorRow({ label, value }) {
  return <div><dt>{label}</dt><dd>{value ?? '—'}</dd></div>
}

function ToggleButton({ children, active, onClick, disabled = false }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export default function StudioV2DebugPanel({ audit, diagnostics, runtime }) {
  const [helpers, setHelpers] = useState({ axes: false, grid: false, bounds: false, lights: false })
  const visual = diagnostics?.visual ?? runtime?.getVisualConfig?.() ?? {}
  const safety = diagnostics?.safety ?? runtime?.getCameraSafety?.() ?? {}

  if (!runtime) return null

  const toggleHelper = (name, setter) => {
    const next = !helpers[name]
    setHelpers((current) => ({ ...current, [name]: next }))
    setter(next)
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
        </dl>
      </section>

      <section className="studio-v2__debug-section">
        <h2>CAMERA / ORBIT</h2>
        <dl>
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
          <ToggleButton active={false} disabled>AO OFF / N.A.</ToggleButton>
          <ToggleButton active={false} disabled>BLOOM OFF / N.A.</ToggleButton>
        </div>
        <dl>
          <InspectorRow label="SHADOW TYPE" value={visual.shadowType ?? 'PCFSoftShadowMap'} />
          <InspectorRow label="SHADOW CONTRIBUTION" value={Number(visual.shadowIntensity ?? STUDIO_V2_LIGHTING.key.shadowIntensity).toFixed(2)} />
          <InspectorRow label="SHADOW RADIUS" value={visual.shadowRadius ?? STUDIO_V2_LIGHTING.key.shadowRadius} />
          <InspectorRow label="SHADOW MAP" value={`${visual.shadowMapSize ?? STUDIO_V2_LIGHTING.key.shadowMapSize}²`} />
          <InspectorRow label="BIAS" value={visual.shadowBias ?? STUDIO_V2_LIGHTING.key.shadowBias} />
          <InspectorRow label="NORMAL BIAS" value={visual.shadowNormalBias ?? STUDIO_V2_LIGHTING.key.shadowNormalBias} />
          <InspectorRow label="CASTING LIGHTS" value={visual.shadowCasters ?? 1} />
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
          <InspectorRow label="ENV TEXTURE" value={vectorText(audit?.environment?.texture)} />
          <InspectorRow label="ROOT POS" value={vectorText(STUDIO_V2_MODEL_TRANSFORM.position)} />
          <InspectorRow label="ROOT ROT" value={vectorText(STUDIO_V2_MODEL_TRANSFORM.rotation)} />
          <InspectorRow label="ROOT SCALE" value={STUDIO_V2_MODEL_TRANSFORM.scale} />
        </dl>
        <div className="studio-v2__debug-actions">
          <ToggleButton active={helpers.axes} onClick={() => toggleHelper('axes', runtime.setAxes)}>AXES</ToggleButton>
          <ToggleButton active={helpers.grid} onClick={() => toggleHelper('grid', runtime.setGrid)}>GRID</ToggleButton>
          <ToggleButton active={helpers.bounds} onClick={() => toggleHelper('bounds', runtime.setBounds)}>COLLIDERS / BOUNDS</ToggleButton>
          <ToggleButton active={helpers.lights} onClick={() => toggleHelper('lights', runtime.setLightHelpers)}>LIGHTS</ToggleButton>
        </div>
      </section>
    </aside>
  )
}

import * as THREE from 'three'
import {
  STUDIO_V2_ROOM_WIDE_START_POSE,
  STUDIO_V2_TABLE_OVERVIEW_POSE,
} from './studioV2CameraPoses'

export const STUDIO_V2_AMBIENT_CAMERA_CONFIG = Object.freeze({
  durationMs: 96000,
  startDelayMs: 0,
  observation: Object.freeze({
    entryBlendSeconds: 3.5,
    macbookAttentionMeters: 0.055,
    maximumYawRadians: THREE.MathUtils.degToRad(0.34),
    maximumPitchRadians: THREE.MathUtils.degToRad(0.18),
    targetDriftMeters: Object.freeze([0.018, 0.014]),
    targetDriftPeriodsSeconds: Object.freeze([29.3, 41.9, 57.7]),
    yawPeriodsSeconds: Object.freeze([18.7, 31.1, 47.3]),
    pitchPeriodsSeconds: Object.freeze([23.9, 37.7, 53.9]),
  }),
  overrideDragThresholdPx: 5,
  overrideYawMin: THREE.MathUtils.degToRad(-25),
  overrideYawMax: THREE.MathUtils.degToRad(25),
  overridePitchMin: THREE.MathUtils.degToRad(-10),
  overridePitchMax: THREE.MathUtils.degToRad(12),
  overrideRadiansPerPixel: 0.0028,
  overrideIdleMs: 2000,
  overrideReturnMs: 800,
  radioResumeDelayMs: 2000,
  visibilityResumeDelayMs: 250,
  headLookDistance: 3.2,
  pathSamples: 640,
  arcLengthDivisions: 1024,
  startEaseMs: 900,
  initialSpeedFactor: 0.35,
  endEaseMs: 4000,
  speedMultipliers: Object.freeze([1, 5, 10, 20]),
})

export const STUDIO_V2_TABLE_ORBIT_PROFILE = Object.freeze({
  target: STUDIO_V2_TABLE_OVERVIEW_POSE.target,
  minDistance: 1.45,
  maxDistance: 2.1,
  minPolarAngle: THREE.MathUtils.degToRad(55),
  maxPolarAngle: THREE.MathUtils.degToRad(96),
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  rotateSpeed: 0.36,
  zoomSpeed: 0.5,
  dampingFactor: 0.14,
  enablePan: false,
  enableZoom: true,
  targetHeightBounds: Object.freeze([1.38, 1.58]),
  viewPitchDegrees: Object.freeze({ min: -35, max: 6 }),
  sampledAzimuthPositions: 720,
})

export const STUDIO_V2_ROOM_WIDE_MANUAL_PROFILE = Object.freeze({
  target: STUDIO_V2_ROOM_WIDE_START_POSE.target,
  minDistance: 3.8,
  maxDistance: 4.8,
  minPolarAngle: 1.3,
  maxPolarAngle: 1.66,
  minAzimuthAngle: THREE.MathUtils.degToRad(-140),
  maxAzimuthAngle: THREE.MathUtils.degToRad(-64),
  rotateSpeed: 0.42,
  zoomSpeed: 0.54,
  dampingFactor: 0.14,
  enablePan: false,
  enableZoom: true,
})

export const STUDIO_V2_AMBIENT_PATH_CANDIDATES = Object.freeze({
  A: Object.freeze({
    id: 'ELEVATED_A', heightOffsetRange: Object.freeze([0.18, 0.22]), endpointPastStoolPlaneM: 0.32,
    positions: Object.freeze([
      Object.freeze([-6.38, 2.14, 0.36]), Object.freeze([-5.6, 2.18, 0.34]),
      Object.freeze([-4.4, 2.21, 0.31]), Object.freeze([-3, 2.22, 0.28]),
      Object.freeze([-1.55, 2.18, 0.25]), Object.freeze([-0.35, 2.12, 0.22]),
      Object.freeze([0.32, 2.06, 0.22]),
    ]),
    targets: Object.freeze([
      Object.freeze([-1.8, 1.62, 0.12]), Object.freeze([-1.15, 1.6, 0.1]),
      Object.freeze([-0.4, 1.58, 0.07]), Object.freeze([0.25, 1.56, 0.02]),
      Object.freeze([0.65, 1.54, -0.02]), Object.freeze([0.86, 1.51, -0.04]),
      Object.freeze([0.96, 1.49, -0.05]),
    ]),
  }),
  B: Object.freeze({
    id: 'ELEVATED_B_STAGE4B3_SELECTED', heightOffsetRange: Object.freeze([0.25, 0.32]), endpointPastStoolPlaneM: 0.48,
    positions: Object.freeze([
      STUDIO_V2_ROOM_WIDE_START_POSE.position, Object.freeze([-5.6, 2.22, 0.34]),
      Object.freeze([-4.4, 2.27, 0.31]), Object.freeze([-3, 2.28, 0.28]),
      Object.freeze([-1.55, 2.24, 0.25]), Object.freeze([-0.15, 2.2, 0.62]),
      STUDIO_V2_TABLE_OVERVIEW_POSE.position,
    ]),
    targets: Object.freeze([
      STUDIO_V2_ROOM_WIDE_START_POSE.target, Object.freeze([-1.15, 1.6, 0.1]),
      Object.freeze([-0.4, 1.58, 0.07]), Object.freeze([0.25, 1.56, 0.02]),
      Object.freeze([0.65, 1.54, -0.02]), Object.freeze([1, 1.47, -0.08]),
      STUDIO_V2_TABLE_OVERVIEW_POSE.target,
    ]),
  }),
  C: Object.freeze({
    id: 'ELEVATED_C', heightOffsetRange: Object.freeze([0.34, 0.42]), endpointPastStoolPlaneM: 0.5,
    positions: Object.freeze([
      Object.freeze([-6.38, 2.26, 0.36]), Object.freeze([-5.6, 2.3, 0.34]),
      Object.freeze([-4.4, 2.36, 0.31]), Object.freeze([-3, 2.38, 0.28]),
      Object.freeze([-1.55, 2.34, 0.25]), Object.freeze([-0.35, 2.26, 0.2]),
      Object.freeze([0.5, 2.2, 0.16]),
    ]),
    targets: Object.freeze([
      Object.freeze([-1.8, 1.66, 0.12]), Object.freeze([-1.15, 1.64, 0.1]),
      Object.freeze([-0.4, 1.62, 0.07]), Object.freeze([0.25, 1.6, 0.02]),
      Object.freeze([0.65, 1.58, -0.02]), Object.freeze([0.86, 1.55, -0.04]),
      Object.freeze([0.96, 1.52, -0.05]),
    ]),
  }),
})

function vectorPoint(values) {
  return new THREE.Vector3().fromArray(values)
}

function roundedVector(vector, digits = 5) {
  return vector.toArray().map((value) => Number(value.toFixed(digits)))
}

function rounded(value, digits = 5) {
  return Number(value.toFixed(digits))
}

function fovAt(progress) {
  const smooth = progress * progress * (3 - 2 * progress)
  return THREE.MathUtils.lerp(
    STUDIO_V2_ROOM_WIDE_START_POSE.fov,
    STUDIO_V2_TABLE_OVERVIEW_POSE.fov,
    smooth,
  )
}

function createHelperRoot(scene, positionCurve, controlPoints, debug) {
  if (!debug) return null
  const root = new THREE.Group()
  root.name = 'StudioV2AmbientCameraDebug'
  const railPoints = Array.from({ length: 161 }, (_, index) => (
    positionCurve.getPointAt(index / 160, new THREE.Vector3())
  ))
  const rail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(railPoints),
    new THREE.LineBasicMaterial({ color: 0x51e4ff, depthTest: false, transparent: true, opacity: 0.9 }),
  )
  rail.name = 'StudioV2AmbientRailHelper'
  rail.renderOrder = 1000
  rail.visible = false
  const points = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(controlPoints),
    new THREE.PointsMaterial({ color: 0xff72d5, depthTest: false, size: 0.08, sizeAttenuation: true }),
  )
  points.name = 'StudioV2AmbientControlPointsHelper'
  points.renderOrder = 1001
  points.visible = false
  root.add(rail, points)
  scene?.add(root)
  return { root, rail, points }
}

function validatePath(positionCurve, targetCurve, inspectPose) {
  let invalidSamples = 0
  let correctionSamples = 0
  let minimumBoundaryClearance = Infinity
  let minimumObstacleClearance = Infinity
  let minimumTargetClearance = Infinity
  let minimumLookRadius = Infinity
  let maximumLookRadius = 0
  const boundaryMinimums = {}
  const obstacleMinimums = {}
  const position = new THREE.Vector3()
  const target = new THREE.Vector3()
  const invalid = []
  for (let index = 0; index <= STUDIO_V2_AMBIENT_CAMERA_CONFIG.pathSamples; index += 1) {
    const progress = index / STUDIO_V2_AMBIENT_CAMERA_CONFIG.pathSamples
    positionCurve.getPointAt(progress, position)
    targetCurve.getPointAt(progress, target)
    const inspection = inspectPose(position, target)
    const lookRadius = position.distanceTo(target)
    minimumBoundaryClearance = Math.min(minimumBoundaryClearance, inspection.minimumBoundaryClearance)
    minimumObstacleClearance = Math.min(minimumObstacleClearance, inspection.minimumObstacleClearance)
    minimumTargetClearance = Math.min(minimumTargetClearance, inspection.minimumTargetClearance)
    minimumLookRadius = Math.min(minimumLookRadius, lookRadius)
    maximumLookRadius = Math.max(maximumLookRadius, lookRadius)
    inspection.boundaryDistances?.forEach(({ id, distance }) => {
      if (!boundaryMinimums[id] || distance < boundaryMinimums[id].distance) {
        boundaryMinimums[id] = { distance, progress, position: roundedVector(position, 6) }
      }
    })
    inspection.obstacleDistances?.forEach(({ id, distance }) => {
      if (!obstacleMinimums[id] || distance < obstacleMinimums[id].distance) {
        obstacleMinimums[id] = { distance, progress, position: roundedVector(position, 6) }
      }
    })
    if (!inspection.safe) {
      invalidSamples += 1
      correctionSamples += 1
      if (invalid.length < 12) invalid.push({ progress: rounded(progress), reasons: inspection.reasons })
    }
  }
  const roundedMinimums = (minimums) => Object.fromEntries(Object.entries(minimums).map(([id, record]) => [id, {
    distance: rounded(record.distance), progress: rounded(record.progress, 6), position: record.position,
  }]))
  const minimumBoundaryRecord = Object.entries(boundaryMinimums).sort((a, b) => a[1].distance - b[1].distance)[0]
  return Object.freeze({
    sampleCount: STUDIO_V2_AMBIENT_CAMERA_CONFIG.pathSamples + 1,
    invalidSamples,
    correctionSamples,
    minimumBoundaryClearance: rounded(minimumBoundaryClearance),
    minimumObstacleClearance: rounded(minimumObstacleClearance),
    minimumTargetClearance: rounded(minimumTargetClearance),
    minimumLookRadius: rounded(minimumLookRadius),
    maximumLookRadius: rounded(maximumLookRadius),
    minimumNearPlaneClearance: rounded(minimumLookRadius - STUDIO_V2_TABLE_OVERVIEW_POSE.near),
    boundaryMinimums: roundedMinimums(boundaryMinimums),
    obstacleMinimums: roundedMinimums(obstacleMinimums),
    minimumBoundaryLocation: minimumBoundaryRecord ? {
      id: minimumBoundaryRecord[0],
      distance: rounded(minimumBoundaryRecord[1].distance),
      progress: rounded(minimumBoundaryRecord[1].progress, 6),
      position: minimumBoundaryRecord[1].position,
    } : null,
    exteriorVisible: false,
    valid: invalidSamples === 0,
    invalid,
  })
}

function validateTableOrbit(inspectPose) {
  const target = vectorPoint(STUDIO_V2_TABLE_ORBIT_PROFILE.target)
  const position = new THREE.Vector3()
  const spherical = new THREE.Spherical()
  const radii = [
    STUDIO_V2_TABLE_ORBIT_PROFILE.minDistance,
    (STUDIO_V2_TABLE_ORBIT_PROFILE.minDistance + STUDIO_V2_TABLE_ORBIT_PROFILE.maxDistance) / 2,
    STUDIO_V2_TABLE_ORBIT_PROFILE.maxDistance,
  ]
  const polarAngles = [
    STUDIO_V2_TABLE_ORBIT_PROFILE.minPolarAngle,
    (STUDIO_V2_TABLE_ORBIT_PROFILE.minPolarAngle + STUDIO_V2_TABLE_ORBIT_PROFILE.maxPolarAngle) / 2,
    STUDIO_V2_TABLE_ORBIT_PROFILE.maxPolarAngle,
  ]
  let invalidSamples = 0
  let primarySafeAzimuths = 0
  let minimumBoundaryClearance = Infinity
  let minimumObstacleClearance = Infinity
  const unsafeAzimuths = new Set()
  radii.forEach((radius, radiusIndex) => {
    polarAngles.forEach((polarAngle, polarIndex) => {
      for (let degree = 0; degree < STUDIO_V2_TABLE_ORBIT_PROFILE.sampledAzimuthPositions; degree += 1) {
        const theta = THREE.MathUtils.degToRad(degree - 180)
        spherical.set(radius, polarAngle, theta)
        position.copy(target).add(new THREE.Vector3().setFromSpherical(spherical))
        const inspection = inspectPose(position, target, {
          ignoredObstacleIds: ['KITCHEN ISLAND / BODY'],
        })
        minimumBoundaryClearance = Math.min(minimumBoundaryClearance, inspection.minimumBoundaryClearance)
        minimumObstacleClearance = Math.min(minimumObstacleClearance, inspection.minimumObstacleClearance)
        if (!inspection.safe) {
          invalidSamples += 1
          unsafeAzimuths.add(degree)
        } else if (radiusIndex === 1 && polarIndex === 1) {
          primarySafeAzimuths += 1
        }
      }
    })
  })
  const totalSamples = radii.length * polarAngles.length * STUDIO_V2_TABLE_ORBIT_PROFILE.sampledAzimuthPositions
  return Object.freeze({
    totalSamples,
    radii,
    polarAngles,
    invalidSamples,
    safe: invalidSamples === 0,
    primarySafeCoverageDegrees: primarySafeAzimuths,
    unsafeAzimuthDegrees: [...unsafeAzimuths].sort((a, b) => a - b),
    minimumBoundaryClearance: rounded(minimumBoundaryClearance),
    minimumObstacleClearance: rounded(minimumObstacleClearance),
  })
}

export function createStudioV2AmbientCameraRail({ candidate = 'B', debug = false, inspectPose, scene }) {
  const candidateKey = candidate in STUDIO_V2_AMBIENT_PATH_CANDIDATES ? candidate : 'B'
  const selectedCandidate = STUDIO_V2_AMBIENT_PATH_CANDIDATES[candidateKey]
  const positionPoints = selectedCandidate.positions.map(vectorPoint)
  const targetPoints = selectedCandidate.targets.map(vectorPoint)
  const positionCurve = new THREE.CatmullRomCurve3(positionPoints, false, 'centripetal')
  const targetCurve = new THREE.CatmullRomCurve3(targetPoints, false, 'centripetal')
  positionCurve.arcLengthDivisions = STUDIO_V2_AMBIENT_CAMERA_CONFIG.arcLengthDivisions
  targetCurve.arcLengthDivisions = STUDIO_V2_AMBIENT_CAMERA_CONFIG.arcLengthDivisions
  positionCurve.updateArcLengths()
  targetCurve.updateArcLengths()
  const totalDistance = positionCurve.getLength()
  const helper = createHelperRoot(scene, positionCurve, positionPoints, debug)
  const pathSafety = validatePath(positionCurve, targetCurve, inspectPose)
  const tableOrbitSafety = validateTableOrbit(inspectPose)
  const scratchPosition = new THREE.Vector3()
  const scratchTarget = new THREE.Vector3()

  return Object.freeze({
    dispose() {
      helper?.root.traverse((object) => {
        object.geometry?.dispose?.()
        object.material?.dispose?.()
      })
      helper?.root.removeFromParent()
    },
    getPoint(progress, output = {}) {
      const clamped = THREE.MathUtils.clamp(progress, 0, 1)
      const position = output.position ?? new THREE.Vector3()
      const target = output.target ?? new THREE.Vector3()
      positionCurve.getPointAt(clamped, position)
      targetCurve.getPointAt(clamped, target)
      return { position, target, fov: fovAt(clamped) }
    },
    getSnapshot() {
      return {
        curveType: 'CENTRIPETAL_CATMULL_ROM_ARC_LENGTH',
        selectedCandidate: selectedCandidate.id,
        candidateKey,
        heightOffsetRange: selectedCandidate.heightOffsetRange,
        endpointPastStoolPlaneM: selectedCandidate.endpointPastStoolPlaneM,
        candidates: Object.fromEntries(Object.entries(STUDIO_V2_AMBIENT_PATH_CANDIDATES).map(([key, value]) => [key, {
          id: value.id,
          heightOffsetRange: value.heightOffsetRange,
          endpointPastStoolPlaneM: value.endpointPastStoolPlaneM,
          positions: value.positions,
          targets: value.targets,
        }])),
        durationMs: STUDIO_V2_AMBIENT_CAMERA_CONFIG.durationMs,
        totalDistance: rounded(totalDistance),
        positionControlPoints: positionPoints.map((point) => roundedVector(point)),
        targetControlPoints: targetPoints.map((point) => roundedVector(point)),
        pathSafety,
        tableOrbitSafety,
        pathVisible: Boolean(helper?.rail.visible),
        controlPointsVisible: Boolean(helper?.points.visible),
      }
    },
    pathSafety,
    setControlPointsVisible(visible) {
      if (helper) helper.points.visible = Boolean(visible)
      return Boolean(helper?.points.visible)
    },
    setPathVisible(visible) {
      if (helper) helper.rail.visible = Boolean(visible)
      return Boolean(helper?.rail.visible)
    },
    tableOrbitSafety,
    tableProfile: STUDIO_V2_TABLE_ORBIT_PROFILE,
    totalDistance,
    scratch: { position: scratchPosition, target: scratchTarget },
  })
}

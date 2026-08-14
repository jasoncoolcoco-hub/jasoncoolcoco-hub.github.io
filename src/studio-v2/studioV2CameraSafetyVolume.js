import * as THREE from 'three'
import {
  STUDIO_V2_CAMERA_SAFETY,
  STUDIO_V2_COLLISION_POLICY,
  STUDIO_V2_FLOOR_SAFETY,
} from './studioV2Config'

const CAMERA_RADIUS = 0.12
const TARGET_MARGIN = 0.12
const FLOOR_Y = STUDIO_V2_FLOOR_SAFETY.floorY

function freezeBoundary(boundary) {
  return Object.freeze({
    ...boundary,
    normal: Object.freeze([...boundary.normal]),
  })
}

export const SAFE_INTERIOR_CAMERA_VOLUME = Object.freeze({
  representation: 'CONVEX_HALF_SPACES_WITH_SLOPED_CEILING',
  cameraRadius: CAMERA_RADIUS,
  targetMargin: TARGET_MARGIN,
  hysteresis: 0.004,
  boundaries: Object.freeze([
    freezeBoundary({ id: 'FLOOR', role: 'floor', normal: [0, 1, 0], minimumDot: FLOOR_Y + CAMERA_RADIUS }),
    freezeBoundary({ id: 'CEILING', role: 'ceiling', normal: [0, -1, 0], minimumDot: -(STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[1] - 0.22) }),
    freezeBoundary({ id: 'LEFT_WALL', role: 'side-wall', normal: [1, 0, 0], minimumDot: STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[0] + CAMERA_RADIUS }),
    freezeBoundary({ id: 'REAR_PROTECTION', role: 'rear-virtual-protection', normal: [-1, 0, 0], minimumDot: -(STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[0] - CAMERA_RADIUS) }),
    freezeBoundary({ id: 'SIDE_WALL', role: 'side-wall', normal: [0, 0, 1], minimumDot: STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[2] + CAMERA_RADIUS }),
    freezeBoundary({ id: 'GLASS_WALL', role: 'glass-wall', normal: [0, 0, -1], minimumDot: -(STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[2] - CAMERA_RADIUS) }),
    freezeBoundary({ id: 'SLOPED_CEILING', role: 'sloped-ceiling', normal: [-0.18, -0.983666, 0], minimumDot: -4.28 }),
  ]),
  targetBounds: Object.freeze({
    min: Object.freeze([
      -6.2,
      Math.max(STUDIO_V2_CAMERA_SAFETY.targetBounds.min[1], FLOOR_Y + 0.16),
      STUDIO_V2_CAMERA_SAFETY.targetBounds.min[2] + TARGET_MARGIN,
    ]),
    max: Object.freeze([
      STUDIO_V2_CAMERA_SAFETY.targetBounds.max[0] - TARGET_MARGIN,
      STUDIO_V2_CAMERA_SAFETY.targetBounds.max[1] - 0.16,
      STUDIO_V2_CAMERA_SAFETY.targetBounds.max[2] - TARGET_MARGIN,
    ]),
  }),
})

export const STUDIO_V2_MAJOR_CAMERA_OBSTACLES = Object.freeze(
  STUDIO_V2_COLLISION_POLICY.majorFurnitureColliders.map((collider) => Object.freeze({
    id: collider.name,
    category: collider.category,
    min: Object.freeze([...collider.min]),
    max: Object.freeze([...collider.max]),
  })),
)

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(4)))
}

function boundaryPlane(boundary) {
  return new THREE.Plane(
    new THREE.Vector3().fromArray(boundary.normal).normalize(),
    -boundary.minimumDot,
  )
}

export function createStudioV2CameraVolumeSafety({ scene, debug = false } = {}) {
  const planes = SAFE_INTERIOR_CAMERA_VOLUME.boundaries.map((boundary) => ({
    ...boundary,
    plane: boundaryPlane(boundary),
  }))
  const targetBounds = new THREE.Box3(
    new THREE.Vector3().fromArray(SAFE_INTERIOR_CAMERA_VOLUME.targetBounds.min),
    new THREE.Vector3().fromArray(SAFE_INTERIOR_CAMERA_VOLUME.targetBounds.max),
  )
  const obstacleRecords = STUDIO_V2_MAJOR_CAMERA_OBSTACLES.map((obstacle) => ({
    ...obstacle,
    box: new THREE.Box3(
      new THREE.Vector3().fromArray(obstacle.min),
      new THREE.Vector3().fromArray(obstacle.max),
    ).expandByScalar(0.06),
  }))
  const lastValidPosition = new THREE.Vector3(-6.42, 1.92, 0.3)
  const lastValidTarget = new THREE.Vector3().fromArray(SAFE_INTERIOR_CAMERA_VOLUME.targetBounds.min)
  const scratchPosition = new THREE.Vector3()
  const scratchTarget = new THREE.Vector3()
  const scratchClosest = new THREE.Vector3()
  let hasLastValidPose = false
  let clampActive = false
  let lastViolatedBoundary = 'NONE'
  let correctionCount = 0

  const helperRoot = debug ? new THREE.Group() : null
  const safeHelpers = debug ? new THREE.Group() : null
  const obstacleHelpers = debug ? new THREE.Group() : null
  if (helperRoot) {
    helperRoot.name = 'StudioV2CameraSafetyDebug'
    safeHelpers.name = 'StudioV2SafeVolumeHelpers'
    obstacleHelpers.name = 'StudioV2MajorObstacleHelpers'
    const broadBounds = new THREE.Box3(
      new THREE.Vector3(
        STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[0] + CAMERA_RADIUS,
        FLOOR_Y + CAMERA_RADIUS,
        STUDIO_V2_CAMERA_SAFETY.cameraBounds.min[2] + CAMERA_RADIUS,
      ),
      new THREE.Vector3(
        STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[0] - CAMERA_RADIUS,
        STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[1] - 0.22,
        STUDIO_V2_CAMERA_SAFETY.cameraBounds.max[2] - CAMERA_RADIUS,
      ),
    )
    safeHelpers.add(new THREE.Box3Helper(broadBounds, 0x54d7ff))
    const sloped = planes.find(({ id }) => id === 'SLOPED_CEILING')
    if (sloped) safeHelpers.add(new THREE.PlaneHelper(sloped.plane, 5, 0x73ffa1))
    obstacleRecords.forEach(({ box }) => obstacleHelpers.add(new THREE.Box3Helper(box, 0xffa84d)))
    safeHelpers.visible = false
    obstacleHelpers.visible = false
    helperRoot.add(safeHelpers, obstacleHelpers)
    scene?.add(helperRoot)
  }

  function projectHalfSpaces(position, violations) {
    planes.forEach(({ id, plane }) => {
      const distance = plane.distanceToPoint(position)
      if (distance >= -SAFE_INTERIOR_CAMERA_VOLUME.hysteresis) return
      position.addScaledVector(plane.normal, -distance + SAFE_INTERIOR_CAMERA_VOLUME.hysteresis)
      violations.push(id)
    })
  }

  function projectObstacle(position, violations) {
    const obstacle = obstacleRecords.find(({ box }) => box.containsPoint(position))
    if (!obstacle) return
    obstacle.box.clampPoint(position, scratchClosest)
    const candidates = [
      { axis: 'x', value: obstacle.box.min.x - SAFE_INTERIOR_CAMERA_VOLUME.hysteresis, amount: Math.abs(position.x - obstacle.box.min.x) },
      { axis: 'x', value: obstacle.box.max.x + SAFE_INTERIOR_CAMERA_VOLUME.hysteresis, amount: Math.abs(obstacle.box.max.x - position.x) },
      { axis: 'z', value: obstacle.box.min.z - SAFE_INTERIOR_CAMERA_VOLUME.hysteresis, amount: Math.abs(position.z - obstacle.box.min.z) },
      { axis: 'z', value: obstacle.box.max.z + SAFE_INTERIOR_CAMERA_VOLUME.hysteresis, amount: Math.abs(obstacle.box.max.z - position.z) },
    ].sort((a, b) => a.amount - b.amount)
    position[candidates[0].axis] = candidates[0].value
    violations.push(`OBSTACLE:${obstacle.id}`)
    projectHalfSpaces(position, violations)
  }

  function contains(position) {
    return planes.every(({ plane }) => plane.distanceToPoint(position) >= -0.00001)
      && !obstacleRecords.some(({ box }) => box.containsPoint(position))
  }

  function boxInteriorClearance(box, point) {
    if (!box.containsPoint(point)) return -box.distanceToPoint(point)
    return Math.min(
      point.x - box.min.x,
      box.max.x - point.x,
      point.y - box.min.y,
      box.max.y - point.y,
      point.z - box.min.z,
      box.max.z - point.z,
    )
  }

  function inspect(position, target, { ignoredObstacleIds = [] } = {}) {
    const ignored = new Set(ignoredObstacleIds)
    const boundaryDistances = planes.map(({ id, plane }) => ({
      id,
      distance: plane.distanceToPoint(position),
    }))
    const targetClearance = boxInteriorClearance(targetBounds, target)
    const obstacleDistances = obstacleRecords.map(({ id, box }) => ({
      id,
      distance: box.distanceToPoint(position),
      inside: box.containsPoint(position),
    }))
    const violatedBoundaries = boundaryDistances
      .filter(({ distance }) => distance < -0.00001)
      .map(({ id }) => id)
    const intersectedObstacles = obstacleDistances
      .filter(({ id, inside }) => inside && !ignored.has(id))
      .map(({ id }) => id)
    const targetSafe = targetBounds.containsPoint(target)
    const reasons = [
      ...violatedBoundaries,
      ...intersectedObstacles.map((id) => `OBSTACLE:${id}`),
      ...(!targetSafe ? ['TARGET_BOUNDS'] : []),
    ]
    return {
      safe: reasons.length === 0,
      reasons,
      boundaryDistances,
      obstacleDistances,
      violatedBoundaries,
      intersectedObstacles,
      targetSafe,
      minimumBoundaryClearance: Math.min(...boundaryDistances.map(({ distance }) => distance)),
      minimumObstacleClearance: Math.min(...obstacleDistances.map(({ distance }) => distance)),
      minimumTargetClearance: targetClearance,
      ignoredObstacleIds: [...ignored],
    }
  }

  function resolve(position, target, { includeObstacles = true } = {}) {
    scratchPosition.copy(position)
    scratchTarget.copy(target).clamp(targetBounds.min, targetBounds.max)
    const violations = []
    projectHalfSpaces(scratchPosition, violations)
    if (includeObstacles) projectObstacle(scratchPosition, violations)
    if (!contains(scratchPosition)) {
      if (hasLastValidPose) {
        scratchPosition.copy(lastValidPosition)
        scratchTarget.copy(lastValidTarget)
        violations.push('LAST_VALID_FALLBACK')
      }
    } else {
      lastValidPosition.copy(scratchPosition)
      lastValidTarget.copy(scratchTarget)
      hasLastValidPose = true
    }
    clampActive = violations.length > 0
    if (clampActive) {
      lastViolatedBoundary = violations[violations.length - 1]
      correctionCount += 1
    }
    return {
      corrected: clampActive,
      position: scratchPosition,
      target: scratchTarget,
      violations,
    }
  }

  return {
    contains,
    dispose() {
      helperRoot?.traverse((object) => {
        object.geometry?.dispose?.()
        object.material?.dispose?.()
      })
      helperRoot?.removeFromParent()
    },
    getSnapshot() {
      return {
        cameraRadius: SAFE_INTERIOR_CAMERA_VOLUME.cameraRadius,
        clampActive,
        correctionCount,
        lastViolatedBoundary,
        representation: SAFE_INTERIOR_CAMERA_VOLUME.representation,
        boundaries: SAFE_INTERIOR_CAMERA_VOLUME.boundaries.map(({ id, role, normal, minimumDot }) => ({ id, role, normal, minimumDot })),
        targetBounds: SAFE_INTERIOR_CAMERA_VOLUME.targetBounds,
        majorObstacles: STUDIO_V2_MAJOR_CAMERA_OBSTACLES.map(({ id }) => id),
        lastValidPosition: roundedVector(lastValidPosition),
        lastValidTarget: roundedVector(lastValidTarget),
        safeVolumeVisible: Boolean(safeHelpers?.visible),
        obstaclesVisible: Boolean(obstacleHelpers?.visible),
      }
    },
    inspect,
    resolve,
    setMajorObstaclesVisible(visible) {
      if (obstacleHelpers) obstacleHelpers.visible = Boolean(visible)
      return Boolean(obstacleHelpers?.visible)
    },
    setSafeVolumeVisible(visible) {
      if (safeHelpers) safeHelpers.visible = Boolean(visible)
      return Boolean(safeHelpers?.visible)
    },
  }
}

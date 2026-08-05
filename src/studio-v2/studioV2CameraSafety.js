import * as THREE from 'three'
import {
  OFFICIAL_CAMERA_SAFE_VOLUME,
  STUDIO_V2_CAMERA_SAFETY,
  STUDIO_V2_COLLISION_POLICY,
  STUDIO_V2_CONTROLS,
  STUDIO_V2_FLOOR_SAFETY,
  STUDIO_V2_OFFICIAL_CONTROLS,
} from './studioV2Config'

function vectorFrom(values) {
  return new THREE.Vector3().fromArray(values)
}

function boxFrom(record) {
  return new THREE.Box3(vectorFrom(record.min), vectorFrom(record.max))
}

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)))
}

function rounded(value) {
  return Number(value.toFixed(4))
}

function changedAxes(before, after, prefix) {
  return ['x', 'y', 'z']
    .filter((axis) => Math.abs(before[axis] - after[axis]) > 0.00001)
    .map((axis) => `${prefix}.${axis.toUpperCase()}`)
}

export function createStudioV2CameraSafety({
  safeOrbit = false,
  furnitureCollisionExperimental = false,
} = {}) {
  const cameraBounds = boxFrom(STUDIO_V2_CAMERA_SAFETY.cameraBounds)
  const targetBounds = boxFrom(STUDIO_V2_CAMERA_SAFETY.targetBounds)
  const majorFurnitureColliders = STUDIO_V2_CAMERA_SAFETY.majorFurnitureColliders.map((record, index) => ({
    ...record,
    order: index,
    box: boxFrom(record),
  }))
  const colliderOverlaps = majorFurnitureColliders.flatMap((collider, index) => (
    majorFurnitureColliders.slice(index + 1).flatMap((other) => {
      const overlap = collider.box.clone().intersect(other.box)
      const size = overlap.isEmpty() ? new THREE.Vector3() : overlap.getSize(new THREE.Vector3())
      return size.x > 0.0001 && size.y > 0.0001 && size.z > 0.0001
        ? [`${collider.name} <> ${other.name}`]
        : []
    })
  ))
  const furnitureCollisionActive = furnitureCollisionExperimental && !safeOrbit
  const distanceLimits = safeOrbit ? STUDIO_V2_OFFICIAL_CONTROLS : STUDIO_V2_CONTROLS
  const configuredMinPolarAngle = safeOrbit
    ? STUDIO_V2_OFFICIAL_CONTROLS.minPolarAngle
    : STUDIO_V2_CONTROLS.minPolarAngle
  const configuredMaxPolarAngle = safeOrbit
    ? STUDIO_V2_OFFICIAL_CONTROLS.maxPolarAngle
    : STUDIO_V2_CONTROLS.maxPolarAngle
  const minimumCameraY = STUDIO_V2_FLOOR_SAFETY.floorY
    + STUDIO_V2_FLOOR_SAFETY.cameraFloorClearance
  const minimumTargetY = STUDIO_V2_FLOOR_SAFETY.floorY
    + STUDIO_V2_FLOOR_SAFETY.targetFloorClearance
  const projectionEpsilon = STUDIO_V2_CAMERA_SAFETY.projectionEpsilon
  const safeFallback = new THREE.Vector3(-6.42, 1.92, 0.3)
  const fallbackDirection = new THREE.Vector3(1, 0, 0)
  const requestedCameraPosition = safeFallback.clone()
  const requestedTarget = new THREE.Vector3(-2.35, 1.62, 0.16)
  const lastValidCameraPosition = safeFallback.clone()
  const lastValidTarget = requestedTarget.clone()
  const lastBlockedRequestedCameraPosition = safeFallback.clone()
  const lastBlockedRequestedTarget = requestedTarget.clone()
  const fixedOfficialTarget = vectorFrom(OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget)
  const safeVolumeCenter = vectorFrom(OFFICIAL_CAMERA_SAFE_VOLUME.center)
  const candidatePosition = new THREE.Vector3()
  const candidateTarget = new THREE.Vector3()
  const previousValue = new THREE.Vector3()
  const offset = new THREE.Vector3()
  const spherical = new THREE.Spherical()
  let hasFixedOfficialTarget = safeOrbit
  let hasLastValidState = false
  let lastValidDistance = lastValidCameraPosition.distanceTo(lastValidTarget)
  let correctionCount = 0
  let architectureCorrectionCount = 0
  let furnitureCorrectionCount = 0
  let sofaCorrectionCount = 0
  let floorCorrectionCount = 0
  let lastCorrection = 'NONE'
  let activeBoundary = 'NONE'
  let activeCollisionCategory = 'NONE'
  let activeColliderName = 'NONE'
  let movementCancelled = false
  let cancelledComponents = []
  let dampingCleared = false
  let lastMovementCancelled = false
  let lastCancelledComponents = ['NONE']
  let lastDampingCleared = false
  let lastBlockedBoundary = 'NONE'
  let lastCollisionCategory = 'NONE'
  let lastColliderName = 'NONE'
  let currentCameraY = safeFallback.y
  let candidateCameraY = safeFallback.y
  let targetY = requestedTarget.y
  let radius = lastValidDistance
  let candidatePolarAngle = 0
  let currentPolarAngle = 0
  let dynamicMaxPolarAngle = configuredMaxPolarAngle
  let floorContactActive = false
  let downwardMomentumCancelled = false
  let lastFloorCandidateY = safeFallback.y
  let lastFloorDynamicMaxPolarAngle = configuredMaxPolarAngle

  function setActiveCollision(category, colliderName, boundary) {
    activeCollisionCategory = category
    activeColliderName = colliderName
    activeBoundary = boundary
  }

  function calculateDynamicMaxPolarAngle(targetHeight, orbitRadius) {
    const safeRadius = Math.max(orbitRadius, 0.0001)
    const ratio = (minimumCameraY - targetHeight) / safeRadius
    const clampedRatio = THREE.MathUtils.clamp(ratio, -1, 1)
    return Math.acos(clampedRatio)
  }

  function safeDynamicMaxPolarAngle(targetHeight, orbitRadius) {
    return Math.max(
      configuredMinPolarAngle,
      Math.min(
        configuredMaxPolarAngle,
        calculateDynamicMaxPolarAngle(targetHeight, orbitRadius)
          - STUDIO_V2_FLOOR_SAFETY.floorEpsilon,
      ),
    )
  }

  function setOfficialTarget(_position, target) {
    target.copy(fixedOfficialTarget)
    hasFixedOfficialTarget = true
  }

  function isInsideSafeOrbitVolume(position) {
    const dx = position.x - safeVolumeCenter.x
    const dz = position.z - safeVolumeCenter.z
    const horizontalDistance = Math.hypot(dx, dz)
    return horizontalDistance <= OFFICIAL_CAMERA_SAFE_VOLUME.horizontalRadius + 0.00001
      && position.y >= OFFICIAL_CAMERA_SAFE_VOLUME.minY - 0.00001
      && position.y <= OFFICIAL_CAMERA_SAFE_VOLUME.maxY + 0.00001
      && cameraBounds.containsPoint(position)
  }

  function constrainToSafeOrbitVolume(position, cancelled) {
    previousValue.copy(position)
    const dx = position.x - safeVolumeCenter.x
    const dz = position.z - safeVolumeCenter.z
    const horizontalDistance = Math.hypot(dx, dz)
    if (horizontalDistance > OFFICIAL_CAMERA_SAFE_VOLUME.horizontalRadius) {
      const scale = OFFICIAL_CAMERA_SAFE_VOLUME.horizontalRadius / horizontalDistance
      position.x = safeVolumeCenter.x + dx * scale
      position.z = safeVolumeCenter.z + dz * scale
    }
    position.y = THREE.MathUtils.clamp(
      position.y,
      OFFICIAL_CAMERA_SAFE_VOLUME.minY,
      OFFICIAL_CAMERA_SAFE_VOLUME.maxY,
    )
    position.clamp(cameraBounds.min, cameraBounds.max)
    const axes = changedAxes(previousValue, position, 'CAMERA')
    if (!axes.length) return false
    cancelled.push(...axes, 'SAFE_ORBIT_VOLUME')
    setActiveCollision('ARCHITECTURE_HARD_COLLIDER', 'OFFICIAL CAMERA SAFE VOLUME', 'SAFE ORBIT VOLUME')
    return true
  }

  function clampTarget(target, cancelled, { floorOnly = false } = {}) {
    previousValue.copy(target)
    if (!floorOnly) target.x = THREE.MathUtils.clamp(target.x, targetBounds.min.x, targetBounds.max.x)
    target.y = THREE.MathUtils.clamp(target.y, minimumTargetY, targetBounds.max.y)
    if (!floorOnly) target.z = THREE.MathUtils.clamp(target.z, targetBounds.min.z, targetBounds.max.z)
    const axes = changedAxes(previousValue, target, 'TARGET')
    if (!axes.length) return false
    cancelled.push(...axes)
    const floorContact = target.y !== previousValue.y && previousValue.y < minimumTargetY
    setActiveCollision(
      'ARCHITECTURE_HARD_COLLIDER',
      floorContact ? 'FLOOR / TARGET CLEARANCE' : 'INTERIOR TARGET CAGE',
      floorContact ? 'TARGET FLOOR CLEARANCE' : 'INTERIOR TARGET CAGE',
    )
    return true
  }

  function solveSphericalFloor(position, target, cancelled, { trackFloor = true } = {}) {
    offset.copy(position).sub(target)
    if (offset.lengthSq() < 0.000001) offset.copy(fallbackDirection).multiplyScalar(-1)
    spherical.setFromVector3(offset)

    const requestedRadius = spherical.radius
    const requestedPhi = spherical.phi
    const clampedRadius = THREE.MathUtils.clamp(
      requestedRadius,
      distanceLimits.minDistance,
      distanceLimits.maxDistance,
    )
    spherical.radius = clampedRadius
    const safeMaxPhi = safeDynamicMaxPolarAngle(target.y, clampedRadius)
    spherical.phi = THREE.MathUtils.clamp(requestedPhi, configuredMinPolarAngle, safeMaxPhi)
    spherical.makeSafe()

    const radiusChanged = Math.abs(requestedRadius - clampedRadius) > 0.00001
    const contactedFloor = requestedPhi > safeMaxPhi + 0.00001
      || position.y < minimumCameraY - 0.00001

    if (radiusChanged) {
      cancelled.push('ZOOM')
      const boundary = requestedRadius < clampedRadius ? 'MINIMUM ZOOM' : 'MAXIMUM ZOOM'
      setActiveCollision('CONTROL_LIMIT', boundary, boundary)
    }
    if (contactedFloor) {
      cancelled.push('POLAR.DOWN')
      setActiveCollision('ARCHITECTURE_HARD_COLLIDER', 'FLOOR', 'FLOOR POLAR LIMIT')
      if (trackFloor) {
        floorContactActive = true
        downwardMomentumCancelled = true
        floorCorrectionCount += 1
        lastFloorCandidateY = position.y
        lastFloorDynamicMaxPolarAngle = safeMaxPhi
      }
    }

    position.copy(target).add(offset.setFromSpherical(spherical))
    candidatePolarAngle = requestedPhi
    currentPolarAngle = spherical.phi
    dynamicMaxPolarAngle = safeMaxPhi
    radius = spherical.radius
    targetY = target.y
    currentCameraY = position.y
    return contactedFloor
  }

  function clampToCameraSideAndCeilingBounds(position, cancelled) {
    previousValue.copy(position)
    position.x = THREE.MathUtils.clamp(position.x, cameraBounds.min.x, cameraBounds.max.x)
    position.y = Math.min(position.y, cameraBounds.max.y)
    position.z = THREE.MathUtils.clamp(position.z, cameraBounds.min.z, cameraBounds.max.z)
    const axes = changedAxes(previousValue, position, 'CAMERA')
    if (!axes.length) return false
    cancelled.push(...axes)
    const boundary = position.y !== previousValue.y ? 'CEILING CAMERA CAGE' : 'INTERIOR CAMERA CAGE'
    setActiveCollision('ARCHITECTURE_HARD_COLLIDER', boundary, boundary)
    return true
  }

  function resolveFurnitureCollider(position, collider, cancelled) {
    if (!collider.box.containsPoint(position)) return false

    const proposals = []
    for (const axis of ['x', 'z']) {
      if (lastValidCameraPosition[axis] < collider.box.min[axis]) {
        proposals.push({
          axis,
          value: collider.box.min[axis] - projectionEpsilon,
          penetration: position[axis] - collider.box.min[axis],
        })
      } else if (lastValidCameraPosition[axis] > collider.box.max[axis]) {
        proposals.push({
          axis,
          value: collider.box.max[axis] + projectionEpsilon,
          penetration: collider.box.max[axis] - position[axis],
        })
      }
    }

    if (!proposals.length) {
      for (const axis of ['x', 'z']) {
        proposals.push(
          {
            axis,
            value: collider.box.min[axis] - projectionEpsilon,
            penetration: position[axis] - collider.box.min[axis],
          },
          {
            axis,
            value: collider.box.max[axis] + projectionEpsilon,
            penetration: collider.box.max[axis] - position[axis],
          },
        )
      }
    }

    proposals.sort((a, b) => a.penetration - b.penetration || a.axis.localeCompare(b.axis))
    const proposal = proposals[0]
    if (!proposal) return false
    position[proposal.axis] = proposal.value
    cancelled.push(`CAMERA.${proposal.axis.toUpperCase()}`)
    setActiveCollision(
      collider.category,
      collider.name,
      `FURNITURE SLIDE: ${collider.name}`,
    )
    return true
  }

  function isPositionSafe(position) {
    if (safeOrbit) return isInsideSafeOrbitVolume(position)
    return position.y >= minimumCameraY - 0.00001
      && cameraBounds.containsPoint(position)
      && (!furnitureCollisionActive
        || !majorFurnitureColliders.some((collider) => collider.box.containsPoint(position)))
  }

  function isDistanceSafe(position, target) {
    const distance = position.distanceTo(target)
    return distance >= distanceLimits.minDistance - 0.0001
      && distance <= distanceLimits.maxDistance + 0.0001
  }

  function prepareControls(camera, controls) {
    if (safeOrbit) {
      controls.target.copy(fixedOfficialTarget)
      controls.enablePan = false
      controls.enableZoom = OFFICIAL_CAMERA_SAFE_VOLUME.zoom
      controls.minDistance = OFFICIAL_CAMERA_SAFE_VOLUME.minDistance
      controls.maxDistance = OFFICIAL_CAMERA_SAFE_VOLUME.maxDistance
      controls.minPolarAngle = OFFICIAL_CAMERA_SAFE_VOLUME.minPolarAngle
      controls.maxPolarAngle = OFFICIAL_CAMERA_SAFE_VOLUME.maxPolarAngle
      return
    }
    const preparedTargetY = Math.max(controls.target.y, minimumTargetY)
    const preparedRadius = Math.max(camera.position.distanceTo(controls.target), 0.0001)
    controls.maxPolarAngle = safeDynamicMaxPolarAngle(preparedTargetY, preparedRadius)
  }

  function acceptSafeOrbit(camera, controls) {
    requestedCameraPosition.copy(camera.position)
    requestedTarget.copy(controls.target)
    candidatePosition.copy(requestedCameraPosition)
    candidateTarget.copy(fixedOfficialTarget)
    candidateCameraY = requestedCameraPosition.y
    activeBoundary = 'NONE'
    activeCollisionCategory = 'NONE'
    activeColliderName = 'NONE'
    cancelledComponents = []
    dampingCleared = false
    floorContactActive = false
    downwardMomentumCancelled = false

    const targetAxes = changedAxes(requestedTarget, candidateTarget, 'TARGET')
    if (targetAxes.length) {
      cancelledComponents.push(...targetAxes)
      setActiveCollision('CONTROL_LIMIT', 'FIXED OFFICIAL TARGET', 'FIXED OFFICIAL TARGET')
    }

    offset.copy(candidatePosition).sub(candidateTarget)
    if (offset.lengthSq() < 0.000001) {
      offset.copy(safeFallback).sub(candidateTarget)
    }
    spherical.setFromVector3(offset)
    const requestedRadius = spherical.radius
    const requestedPhi = spherical.phi
    spherical.radius = THREE.MathUtils.clamp(
      requestedRadius,
      OFFICIAL_CAMERA_SAFE_VOLUME.minDistance,
      OFFICIAL_CAMERA_SAFE_VOLUME.maxDistance,
    )
    spherical.phi = THREE.MathUtils.clamp(
      requestedPhi,
      OFFICIAL_CAMERA_SAFE_VOLUME.minPolarAngle,
      OFFICIAL_CAMERA_SAFE_VOLUME.maxPolarAngle,
    )
    spherical.makeSafe()

    if (Math.abs(requestedRadius - spherical.radius) > 0.00001) {
      cancelledComponents.push('ZOOM')
      setActiveCollision('CONTROL_LIMIT', 'SAFE ORBIT RADIUS', 'SAFE ORBIT RADIUS')
    }
    if (Math.abs(requestedPhi - spherical.phi) > 0.00001) {
      cancelledComponents.push(requestedPhi > spherical.phi ? 'POLAR.DOWN' : 'POLAR.UP')
      setActiveCollision('CONTROL_LIMIT', 'SAFE POLAR ANGLE', 'SAFE POLAR ANGLE')
    }

    candidatePosition.copy(candidateTarget).add(offset.setFromSpherical(spherical))
    constrainToSafeOrbitVolume(candidatePosition, cancelledComponents)

    movementCancelled = cancelledComponents.length > 0
    if (movementCancelled) {
      correctionCount += 1
      if (activeCollisionCategory === 'ARCHITECTURE_HARD_COLLIDER') architectureCorrectionCount += 1
      lastCorrection = activeBoundary
      lastMovementCancelled = true
      lastCancelledComponents = [...new Set(cancelledComponents)]
      lastBlockedBoundary = activeBoundary
      lastCollisionCategory = activeCollisionCategory
      lastColliderName = activeColliderName
      lastBlockedRequestedCameraPosition.copy(requestedCameraPosition)
      lastBlockedRequestedTarget.copy(requestedTarget)
    }

    camera.position.copy(candidatePosition)
    controls.target.copy(candidateTarget)
    controls.minDistance = OFFICIAL_CAMERA_SAFE_VOLUME.minDistance
    controls.maxDistance = OFFICIAL_CAMERA_SAFE_VOLUME.maxDistance
    controls.minPolarAngle = OFFICIAL_CAMERA_SAFE_VOLUME.minPolarAngle
    controls.maxPolarAngle = OFFICIAL_CAMERA_SAFE_VOLUME.maxPolarAngle
    camera.updateMatrixWorld()

    lastValidCameraPosition.copy(candidatePosition)
    lastValidTarget.copy(candidateTarget)
    lastValidDistance = candidatePosition.distanceTo(candidateTarget)
    hasLastValidState = true
    radius = lastValidDistance
    targetY = candidateTarget.y
    currentCameraY = candidatePosition.y
    currentPolarAngle = spherical.phi
    candidatePolarAngle = requestedPhi
    dynamicMaxPolarAngle = OFFICIAL_CAMERA_SAFE_VOLUME.maxPolarAngle

    return {
      blocked: movementCancelled,
      stableOrbit: true,
      cancelledComponents: [...cancelledComponents],
      floorContact: false,
      downwardMomentumCancelled: false,
    }
  }

  function accept(camera, controls) {
    if (safeOrbit) return acceptSafeOrbit(camera, controls)
    requestedCameraPosition.copy(camera.position)
    requestedTarget.copy(controls.target)
    candidatePosition.copy(requestedCameraPosition)
    candidateTarget.copy(requestedTarget)
    candidateCameraY = requestedCameraPosition.y
    activeBoundary = 'NONE'
    activeCollisionCategory = 'NONE'
    activeColliderName = 'NONE'
    cancelledComponents = []
    dampingCleared = false
    floorContactActive = false
    downwardMomentumCancelled = false

    clampTarget(candidateTarget, cancelledComponents)
    solveSphericalFloor(candidatePosition, candidateTarget, cancelledComponents)
    const downwardPolarMomentum = (controls._sphericalDelta?.phi ?? 0) > 0.000001
    const touchingDynamicFloorLimit = currentPolarAngle >= dynamicMaxPolarAngle - 0.00001
    if (touchingDynamicFloorLimit && downwardPolarMomentum && !floorContactActive) {
      cancelledComponents.push('POLAR.DOWN')
      setActiveCollision('ARCHITECTURE_HARD_COLLIDER', 'FLOOR', 'FLOOR POLAR LIMIT')
      floorContactActive = true
      downwardMomentumCancelled = true
      floorCorrectionCount += 1
      lastFloorCandidateY = candidateCameraY
      lastFloorDynamicMaxPolarAngle = dynamicMaxPolarAngle
    }
    clampToCameraSideAndCeilingBounds(candidatePosition, cancelledComponents)

    const contactedFurniture = furnitureCollisionActive
      ? majorFurnitureColliders
        .filter((collider) => collider.box.containsPoint(candidatePosition))
        .sort((a, b) => a.order - b.order)[0]
      : null
    if (contactedFurniture) {
      resolveFurnitureCollider(candidatePosition, contactedFurniture, cancelledComponents)
    }

    const unresolvedCollider = furnitureCollisionActive
      ? majorFurnitureColliders.find((collider) => collider.box.containsPoint(candidatePosition))
      : null
    const completeValidMovement = isPositionSafe(candidatePosition)
      && isDistanceSafe(candidatePosition, candidateTarget)
      && !unresolvedCollider

    if (!completeValidMovement && hasLastValidState) {
      candidatePosition.copy(lastValidCameraPosition)
      candidateTarget.copy(lastValidTarget)
      cancelledComponents.push('FULL MOVEMENT')
      if (unresolvedCollider) {
        setActiveCollision(
          unresolvedCollider.category,
          unresolvedCollider.name,
          `FURNITURE BLOCKED: ${unresolvedCollider.name}`,
        )
      } else if (activeBoundary === 'NONE') {
        setActiveCollision('RECOVERY', 'LAST VALID STATE', 'LAST VALID STATE')
      }
      currentCameraY = candidatePosition.y
      targetY = candidateTarget.y
      radius = candidatePosition.distanceTo(candidateTarget)
      spherical.setFromVector3(offset.copy(candidatePosition).sub(candidateTarget))
      currentPolarAngle = spherical.phi
      dynamicMaxPolarAngle = safeDynamicMaxPolarAngle(targetY, radius)
    }

    movementCancelled = cancelledComponents.length > 0
    if (movementCancelled) {
      correctionCount += 1
      if (activeCollisionCategory === 'ARCHITECTURE_HARD_COLLIDER') architectureCorrectionCount += 1
      if (activeCollisionCategory === 'MAJOR_FURNITURE_COLLIDER') {
        furnitureCorrectionCount += 1
        if (activeColliderName.startsWith('SOFA ')) sofaCorrectionCount += 1
      }
      lastCorrection = activeBoundary
      lastMovementCancelled = true
      lastCancelledComponents = [...new Set(cancelledComponents)]
      lastBlockedBoundary = activeBoundary
      lastCollisionCategory = activeCollisionCategory
      lastColliderName = activeColliderName
      lastBlockedRequestedCameraPosition.copy(requestedCameraPosition)
      lastBlockedRequestedTarget.copy(requestedTarget)
    }

    camera.position.copy(candidatePosition)
    controls.target.copy(candidateTarget)
    controls.maxPolarAngle = dynamicMaxPolarAngle
    camera.updateMatrixWorld()

    if (isPositionSafe(candidatePosition) && isDistanceSafe(candidatePosition, candidateTarget)) {
      lastValidCameraPosition.copy(candidatePosition)
      lastValidTarget.copy(candidateTarget)
      lastValidDistance = candidatePosition.distanceTo(candidateTarget)
      hasLastValidState = true
    }

    return {
      blocked: movementCancelled,
      cancelledComponents: [...cancelledComponents],
      floorContact: floorContactActive,
      downwardMomentumCancelled,
    }
  }

  function clampConfig(config) {
    const position = vectorFrom(config.position)
    const target = vectorFrom(config.target)
    const ignored = []

    if (safeOrbit) {
      setOfficialTarget(position, target)
      offset.copy(position).sub(target)
      if (offset.lengthSq() < 0.000001) offset.copy(safeFallback).sub(target)
      spherical.setFromVector3(offset)
      spherical.radius = THREE.MathUtils.clamp(
        spherical.radius,
        OFFICIAL_CAMERA_SAFE_VOLUME.minDistance,
        OFFICIAL_CAMERA_SAFE_VOLUME.maxDistance,
      )
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi,
        OFFICIAL_CAMERA_SAFE_VOLUME.minPolarAngle,
        OFFICIAL_CAMERA_SAFE_VOLUME.maxPolarAngle,
      )
      spherical.makeSafe()
      position.copy(target).add(offset.setFromSpherical(spherical))
      constrainToSafeOrbitVolume(position, ignored)
      return {
        ...config,
        position: position.toArray(),
        target: target.toArray(),
      }
    }

    clampTarget(target, ignored)
    solveSphericalFloor(position, target, ignored, { trackFloor: false })
    clampToCameraSideAndCeilingBounds(position, ignored)

    const contactedFurniture = furnitureCollisionActive
      ? majorFurnitureColliders
        .filter((collider) => collider.box.containsPoint(position))
        .sort((a, b) => a.order - b.order)[0]
      : null
    if (contactedFurniture) resolveFurnitureCollider(position, contactedFurniture, ignored)
    if (!isPositionSafe(position) || !isDistanceSafe(position, target)) {
      position.copy(safeFallback)
    }
    return {
      ...config,
      position: position.toArray(),
      target: target.toArray(),
    }
  }

  function setDampingCleared(value) {
    dampingCleared = Boolean(value)
    if (dampingCleared) lastDampingCleared = true
  }

  function isCameraSafe(position) {
    const point = position.isVector3 ? position : vectorFrom(position)
    return isPositionSafe(point)
  }

  function record() {
    return {
      mode: safeOrbit ? 'STABLE SAFE ORBIT' : 'CAPTURE / LEGACY RESEARCH',
      cameraMin: roundedVector(cameraBounds.min),
      cameraMax: roundedVector(cameraBounds.max),
      targetMin: safeOrbit && hasFixedOfficialTarget
        ? roundedVector(fixedOfficialTarget)
        : roundedVector(targetBounds.min),
      targetMax: safeOrbit && hasFixedOfficialTarget
        ? roundedVector(fixedOfficialTarget)
        : roundedVector(targetBounds.max),
      minDistance: distanceLimits.minDistance,
      maxDistance: distanceLimits.maxDistance,
      collisionSolver: safeOrbit ? 'SINGLE SAFE ORBIT VOLUME' : 'ARCHITECTURE BOUNDS',
      solverOrder: safeOrbit
        ? [
          'FIXED_TARGET',
          'NARROW_RADIUS',
          'POLAR_LIMITS',
          'SINGLE_SAFE_VOLUME',
          'ARCHITECTURE_VALIDATION',
          'SYNC_AND_RENDER_ONCE',
        ]
        : [...STUDIO_V2_COLLISION_POLICY.solverOrder],
      safeOrbitVolume: safeOrbit ? {
        shape: OFFICIAL_CAMERA_SAFE_VOLUME.shape,
        center: [...OFFICIAL_CAMERA_SAFE_VOLUME.center],
        minY: OFFICIAL_CAMERA_SAFE_VOLUME.minY,
        maxY: OFFICIAL_CAMERA_SAFE_VOLUME.maxY,
        horizontalRadius: OFFICIAL_CAMERA_SAFE_VOLUME.horizontalRadius,
        architectureClearance: OFFICIAL_CAMERA_SAFE_VOLUME.architectureClearance,
      } : null,
      fixedTarget: safeOrbit ? [...OFFICIAL_CAMERA_SAFE_VOLUME.fixedTarget] : null,
      furnitureCollisionExperimental,
      furnitureCollisionActive,
      furnitureCollisionOfficial: false,
      futureWalkMode: { ...OFFICIAL_CAMERA_SAFE_VOLUME.futureWalkMode },
      automaticMeshColliders: STUDIO_V2_COLLISION_POLICY.automaticMeshColliders,
      exclusionRules: [...STUDIO_V2_COLLISION_POLICY.exclusionRules],
      smallPropMaxExtent: STUDIO_V2_COLLISION_POLICY.smallPropMaxExtent,
      nonCollidingProps: STUDIO_V2_COLLISION_POLICY.nonCollidingProps.map((prop) => ({
        name: prop.name,
        classification: prop.classification,
        groupNames: [...prop.groupNames],
        meshNames: [...prop.meshNames],
      })),
      teaSetClassification: STUDIO_V2_COLLISION_POLICY.nonCollidingProps[0].classification,
      majorFurnitureColliders: majorFurnitureColliders.map((collider) => collider.name),
      cageExcludedMajorFurniture: STUDIO_V2_COLLISION_POLICY.cageExcludedMajorFurniture.map((record) => record.name),
      colliderOverlaps,
      colliderOverlapCount: colliderOverlaps.length,
      corrections: correctionCount,
      architectureCorrectionCount,
      furnitureCorrectionCount,
      sofaCorrectionCount,
      lastCorrection,
      requestedCameraPosition: roundedVector(requestedCameraPosition),
      requestedTarget: roundedVector(requestedTarget),
      lastBlockedRequestedCameraPosition: roundedVector(lastBlockedRequestedCameraPosition),
      lastBlockedRequestedTarget: roundedVector(lastBlockedRequestedTarget),
      activeBoundary,
      activeCollisionCategory,
      activeColliderName,
      movementCancelled,
      cancelledComponents: cancelledComponents.length ? [...new Set(cancelledComponents)] : ['NONE'],
      dampingCleared,
      lastMovementCancelled,
      lastCancelledComponents,
      lastDampingCleared,
      lastBlockedBoundary,
      lastCollisionCategory,
      lastColliderName,
      lastValidCameraPosition: roundedVector(lastValidCameraPosition),
      lastValidTarget: roundedVector(lastValidTarget),
      lastValidDistance: Number(lastValidDistance.toFixed(3)),
      floorY: rounded(STUDIO_V2_FLOOR_SAFETY.floorY),
      cameraFloorClearance: rounded(STUDIO_V2_FLOOR_SAFETY.cameraFloorClearance),
      targetFloorClearance: rounded(STUDIO_V2_FLOOR_SAFETY.targetFloorClearance),
      floorEpsilon: rounded(STUDIO_V2_FLOOR_SAFETY.floorEpsilon),
      minimumCameraY: rounded(minimumCameraY),
      minimumTargetY: rounded(minimumTargetY),
      currentCameraY: rounded(currentCameraY),
      candidateCameraY: rounded(candidateCameraY),
      targetY: rounded(targetY),
      radius: rounded(radius),
      candidatePolarAngle: rounded(candidatePolarAngle),
      currentPolarAngle: rounded(currentPolarAngle),
      dynamicMaxPolarAngle: rounded(dynamicMaxPolarAngle),
      floorContactActive,
      downwardMomentumCancelled,
      floorCorrectionCount,
      lastFloorCandidateY: rounded(lastFloorCandidateY),
      lastFloorDynamicMaxPolarAngle: rounded(lastFloorDynamicMaxPolarAngle),
    }
  }

  return {
    cameraBounds,
    targetBounds,
    majorFurnitureColliders,
    accept,
    clampConfig,
    isCameraSafe,
    prepareControls,
    record,
    setDampingCleared,
  }
}

import * as THREE from 'three/webgpu'

const fallbackDirection = new THREE.Vector3(0, 1, 0)

function slerpUnitVectors(start, end, progress, target) {
  const dot = THREE.MathUtils.clamp(start.dot(end), -1, 1)
  const angle = Math.acos(dot)
  const sinAngle = Math.sin(angle)

  if (Math.abs(sinAngle) < 0.000001) {
    return target.lerpVectors(start, end, progress).normalize()
  }

  const startWeight =
    Math.sin((1 - progress) * angle) / sinAngle
  const endWeight = Math.sin(progress * angle) / sinAngle

  return target
    .copy(start)
    .multiplyScalar(startWeight)
    .addScaledVector(end, endWeight)
    .normalize()
}

export function createRouteCurve({
  altitudeProfileExponent = 1,
  departureBias = 0,
  departureFalloffPower = 4,
  end,
  earthRadius,
  maxAltitude,
  pointCount,
  start,
  surfaceOffset,
}) {
  const startDirection = start.clone().normalize()
  const endDirection = end.clone().normalize()
  const direction = new THREE.Vector3()
  const pathNormal = new THREE.Vector3()
  const points = []
  const samples = Math.max(8, pointCount)

  if (startDirection.lengthSq() === 0) {
    startDirection.copy(fallbackDirection)
  }
  if (endDirection.lengthSq() === 0) {
    endDirection.copy(fallbackDirection)
  }

  pathNormal.crossVectors(startDirection, endDirection)
  if (pathNormal.lengthSq() > 0.000001) {
    pathNormal.normalize()
  } else {
    pathNormal.set(0, 0, 0)
  }

  for (let index = 0; index <= samples; index += 1) {
    const progress = index / samples
    const altitudeEnvelope = Math.max(
      0,
      Math.sin(Math.PI * progress),
    )
    const altitude =
      altitudeEnvelope ** altitudeProfileExponent * maxAltitude
    const radius = earthRadius + surfaceOffset + altitude

    slerpUnitVectors(
      startDirection,
      endDirection,
      progress,
      direction,
    )

    if (departureBias !== 0 && pathNormal.lengthSq() > 0) {
      const departureEnvelope =
        altitudeEnvelope *
        (1 - progress) ** departureFalloffPower
      direction
        .addScaledVector(
          pathNormal,
          departureBias * departureEnvelope,
        )
        .normalize()
    }

    points.push(
      direction.clone().multiplyScalar(radius),
    )
  }

  return new THREE.CatmullRomCurve3(
    points,
    false,
    'centripetal',
    0.5,
  )
}

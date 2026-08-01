import * as THREE from 'three/webgpu'

const degreesToRadians = Math.PI / 180

/**
 * Converts geographic coordinates into the local coordinate system used by
 * the Earth sphere and its equirectangular textures.
 */
export function geoToVector3(latitude, longitude, radius = 1) {
  const latitudeRadians = latitude * degreesToRadians
  const longitudeRadians = longitude * degreesToRadians
  const latitudeRadius = Math.cos(latitudeRadians) * radius

  return new THREE.Vector3(
    latitudeRadius * Math.cos(longitudeRadians),
    Math.sin(latitudeRadians) * radius,
    -latitudeRadius * Math.sin(longitudeRadians),
  )
}

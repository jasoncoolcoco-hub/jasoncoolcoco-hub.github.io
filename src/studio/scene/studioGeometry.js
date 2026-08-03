import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'

export function roofHeightAt(x, z, roof = studioLayout.slopedCeiling) {
  const xMin = roof.corners.D[0]
  const xMax = roof.corners.A[0]
  const zMin = roof.corners.D[2]
  const zMax = roof.corners.C[2]
  const xRatio = THREE.MathUtils.clamp((x - xMin) / (xMax - xMin), 0, 1)
  const zRatio = THREE.MathUtils.clamp((z - zMin) / (zMax - zMin), 0, 1)
  const frontHeight = THREE.MathUtils.lerp(roof.cornerHeights.D, roof.cornerHeights.A, xRatio)
  const rearHeight = THREE.MathUtils.lerp(roof.cornerHeights.C, roof.cornerHeights.B, xRatio)
  return THREE.MathUtils.lerp(frontHeight, rearHeight, zRatio)
}

export function createSurface(points, material, { name = '', reverse = false, castShadow = true } = {}) {
  const geometry = new THREE.BufferGeometry()
  const positions = points.flatMap((point) => point)
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  geometry.setAttribute('uv1', geometry.attributes.uv.clone())
  geometry.setIndex(reverse ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  const surface = new THREE.Mesh(geometry, material)
  surface.name = name
  surface.castShadow = castShadow
  surface.receiveShadow = true
  return surface
}

import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'
import { roofHeightAt } from './studioGeometry'

function createCurtainSurface(spec, material, folds = 22) {
  const xSegments = folds
  const ySegments = 10
  const vertices = []
  const indices = []

  for (let yIndex = 0; yIndex <= ySegments; yIndex += 1) {
    const yRatio = yIndex / ySegments
    const y = -spec.height / 2 + yRatio * spec.height
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = -spec.width / 2 + xRatio * spec.width
      const edgeFalloff = Math.sin(xRatio * Math.PI)
      const z = Math.sin(xRatio * Math.PI * folds * 0.95) * spec.depth * edgeFalloff
      vertices.push(x, y, z)
    }
  }

  for (let yIndex = 0; yIndex < ySegments; yIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const a = yIndex * (xSegments + 1) + xIndex
      const b = a + 1
      const c = a + xSegments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const curtain = new THREE.Mesh(geometry, material)
  curtain.position.set(...spec.position)
  curtain.rotation.set(...spec.rotation)
  curtain.castShadow = true
  curtain.receiveShadow = true
  return curtain
}

function createCeilingCanopy(spec, material) {
  const xSegments = 18
  const zSegments = 16
  const vertices = []
  const indices = []

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zRatio = zIndex / zSegments
    const z = -spec.depth / 2 + zRatio * spec.depth
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = -spec.width / 2 + xRatio * spec.width
      const radialX = Math.sin(xRatio * Math.PI)
      const radialZ = Math.sin(zRatio * Math.PI)
      const mainSag = radialX * radialZ * spec.slope
      const folds = Math.sin(xRatio * Math.PI * 7) * 0.12 * radialZ
      const worldX = spec.position[0] + x
      const worldZ = spec.position[2] + z
      const attachedY = roofHeightAt(worldX, worldZ) - spec.anchorGap
      vertices.push(x, attachedY - mainSag + folds, z)
    }
  }

  for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const a = zIndex * (xSegments + 1) + xIndex
      const b = a + 1
      const c = a + xSegments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const canopy = new THREE.Mesh(geometry, material)
  canopy.name = 'CeilingCanopy'
  canopy.position.set(spec.position[0], 0, spec.position[2])
  canopy.rotation.set(0, spec.rotation[1], 0)
  canopy.castShadow = true
  canopy.receiveShadow = true
  canopy.userData.structureName = 'Ceiling Canopy'
  return canopy
}

export function createCurtainZones(materials) {
  const group = new THREE.Group()
  group.name = 'CurtainZones'

  const redCurtain = createCurtainSurface(studioLayout.redCurtain, materials.redCurtain, 28)
  redCurtain.name = 'RedCurtain'
  redCurtain.userData.structureName = 'Red Curtain Zone'
  group.add(redCurtain)

  const rearCurtain = createCurtainSurface(studioLayout.rearCurtain, materials.rearCurtain, 24)
  rearCurtain.name = 'RearCurtain'
  rearCurtain.userData.structureName = 'Rear Curtain'
  group.add(rearCurtain)

  group.add(createCeilingCanopy(studioLayout.ceilingCanopy, materials.canopy))
  return group
}

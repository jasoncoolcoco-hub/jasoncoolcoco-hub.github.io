import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'

const stageOutline = [
  [-6.8, -4.8],
  [-5.8, -5.35],
  [3.9, -5.2],
  [6.7, -3.7],
  [6.2, 3.6],
  [4.4, 5.15],
  [-5.9, 4.9],
  [-7.1, 2.8],
]

function pointInsidePolygon(x, z, polygon) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [x1, z1] = polygon[index]
    const [x2, z2] = polygon[previous]
    const intersects = ((z1 > z) !== (z2 > z)) && (x < ((x2 - x1) * (z - z1)) / (z2 - z1) + x1)
    if (intersects) inside = !inside
  }
  return inside
}

function createStageBase(material, height) {
  const shape = new THREE.Shape()
  stageOutline.forEach(([x, z], index) => {
    if (index === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.1,
    bevelThickness: 0.08,
    curveSegments: 2,
  })
  geometry.rotateX(-Math.PI / 2)
  const base = new THREE.Mesh(geometry, material)
  base.castShadow = true
  base.receiveShadow = true
  return base
}

function createQuiltedTop(material, seamMaterial, baseHeight) {
  const group = new THREE.Group()
  const cellsX = 6
  const cellsZ = 5
  const minX = -6.3
  const maxX = 6
  const minZ = -4.55
  const maxZ = 4.45
  const cellWidth = (maxX - minX) / cellsX
  const cellDepth = (maxZ - minZ) / cellsZ
  const seamPoints = []

  for (let zIndex = 0; zIndex < cellsZ; zIndex += 1) {
    for (let xIndex = 0; xIndex < cellsX; xIndex += 1) {
      const x0 = minX + xIndex * cellWidth
      const x1 = x0 + cellWidth
      const z0 = minZ + zIndex * cellDepth
      const z1 = z0 + cellDepth
      const centerX = (x0 + x1) / 2
      const centerZ = (z0 + z1) / 2
      const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
      if (!corners.every(([x, z]) => pointInsidePolygon(x, z, stageOutline))) continue

      const cornerY = baseHeight + 0.035 + ((xIndex + zIndex) % 2) * 0.018
      const centerY = baseHeight + 0.15 + Math.sin((xIndex + 1) * (zIndex + 2)) * 0.018
      const positions = [
        x0, cornerY, z0, centerX, centerY, centerZ, x1, cornerY, z0,
        x1, cornerY, z0, centerX, centerY, centerZ, x1, cornerY, z1,
        x1, cornerY, z1, centerX, centerY, centerZ, x0, cornerY, z1,
        x0, cornerY, z1, centerX, centerY, centerZ, x0, cornerY, z0,
      ]
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geometry.computeVertexNormals()
      const module = new THREE.Mesh(geometry, material)
      module.castShadow = true
      module.receiveShadow = true
      group.add(module)

      corners.forEach(([x, z]) => seamPoints.push(x, cornerY + 0.006, z, centerX, centerY + 0.006, centerZ))
    }
  }

  const seamGeometry = new THREE.BufferGeometry()
  seamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3))
  group.add(new THREE.LineSegments(seamGeometry, seamMaterial))
  return group
}

export function createCentralPaddedStage(materials) {
  const spec = studioLayout.centralStage
  const group = new THREE.Group()
  group.name = 'CentralPaddedStage'
  group.position.set(...spec.position)
  group.rotation.set(...spec.rotation)
  group.userData.structureName = 'Central Padded Stage'
  group.scale.set(spec.width / 13.8, 1, spec.depth / 10.5)
  group.add(createStageBase(materials.stage, spec.height))
  group.add(createQuiltedTop(materials.stage, materials.stageSeam, spec.height))
  return group
}

import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'

const stageOutline = [
  [-10.9, -2.3],
  [-10.2, -5.5],
  [-7.8, -7.9],
  [-1.6, -8.25],
  [4.3, -7.95],
  [8.7, -6.1],
  [10.7, -3.25],
  [10.35, 3.9],
  [7.35, 7.55],
  [0.3, 8.15],
  [-6.9, 7.45],
  [-10.55, 4.1],
]

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
  const topPositions = []
  const seamPoints = []
  const centerY = baseHeight + 0.15
  const outerY = baseHeight + 0.045

  stageOutline.forEach(([outerX, outerZ], index) => {
    const [nextOuterX, nextOuterZ] = stageOutline[(index + 1) % stageOutline.length]
    const innerScale = 0.54
    const innerX = outerX * innerScale
    const innerZ = outerZ * innerScale
    const nextInnerX = nextOuterX * innerScale
    const nextInnerZ = nextOuterZ * innerScale
    const innerY = baseHeight + 0.13 + (index % 2) * 0.025
    const nextInnerY = baseHeight + 0.13 + ((index + 1) % 2) * 0.025

    topPositions.push(
      outerX, outerY, outerZ, nextOuterX, outerY, nextOuterZ, nextInnerX, nextInnerY, nextInnerZ,
      outerX, outerY, outerZ, nextInnerX, nextInnerY, nextInnerZ, innerX, innerY, innerZ,
      innerX, innerY, innerZ, nextInnerX, nextInnerY, nextInnerZ, 0, centerY, 0,
    )

    seamPoints.push(
      outerX, outerY + 0.008, outerZ, nextOuterX, outerY + 0.008, nextOuterZ,
      outerX, outerY + 0.008, outerZ, innerX, innerY + 0.008, innerZ,
      innerX, innerY + 0.008, innerZ, nextInnerX, nextInnerY + 0.008, nextInnerZ,
      innerX, innerY + 0.008, innerZ, 0, centerY + 0.008, 0,
    )
  })

  const topGeometry = new THREE.BufferGeometry()
  topGeometry.setAttribute('position', new THREE.Float32BufferAttribute(topPositions, 3))
  topGeometry.computeVertexNormals()
  const top = new THREE.Mesh(topGeometry, material)
  top.castShadow = true
  top.receiveShadow = true
  group.add(top)

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
  group.userData.stageRole = 'Only restored interior element after shell approval'
  group.visible = spec.visibility
  group.scale.set(spec.width / 21.6, 1, spec.depth / 16.4)
  group.add(createStageBase(materials.stage, spec.height))
  group.add(createQuiltedTop(materials.stage, materials.stageSeam, spec.height))
  return group
}

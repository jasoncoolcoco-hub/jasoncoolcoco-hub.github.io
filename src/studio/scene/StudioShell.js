import * as THREE from 'three'
import { studioDimensions, studioLayout } from '../config/studioConfig'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addFloorZone(group, spec, material, height = 0.16) {
  if (!spec.visibility) return
  const zone = box(spec.width, height, spec.depth, material)
  zone.position.set(...spec.position)
  zone.userData.structureName = spec.material
  group.add(zone)
}

function ceilingHeight(xRatio, zRatio, slope) {
  const front = THREE.MathUtils.lerp(slope.leftFront, slope.rightFront, xRatio)
  const rear = THREE.MathUtils.lerp(slope.leftRear, slope.rightRear, xRatio)
  return THREE.MathUtils.lerp(front, rear, zRatio)
}

function createSlopedCeiling(spec, materials) {
  const group = new THREE.Group()
  group.name = 'SlopedCeiling'
  if (!spec.visibility) return group

  const xSegments = 12
  const zSegments = 14
  const vertices = []
  const indices = []
  const uvs = []

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zRatio = zIndex / zSegments
    const z = -spec.depth / 2 + zRatio * spec.depth
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = -spec.width / 2 + xRatio * spec.width
      const baseY = ceilingHeight(xRatio, zRatio, spec.slope)
      const variation = Math.sin(xRatio * Math.PI * 5) * Math.sin(zRatio * Math.PI * 3) * 0.045
      vertices.push(x, baseY + variation, z)
      uvs.push(xRatio, zRatio)
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
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const ceiling = new THREE.Mesh(geometry, materials.ceiling)
  ceiling.receiveShadow = true
  ceiling.castShadow = true
  group.add(ceiling)

  const seamMaterial = new THREE.LineBasicMaterial({ color: '#594838', transparent: true, opacity: 0.28 })
  const seamPoints = []
  ;[0.18, 0.39, 0.61, 0.82].forEach((xRatio) => {
    for (let segment = 0; segment < 18; segment += 1) {
      const z0 = segment / 18
      const z1 = (segment + 1) / 18
      const x = -spec.width / 2 + xRatio * spec.width
      seamPoints.push(
        x, ceilingHeight(xRatio, z0, spec.slope) - 0.012, -spec.depth / 2 + z0 * spec.depth,
        x, ceilingHeight(xRatio, z1, spec.slope) - 0.012, -spec.depth / 2 + z1 * spec.depth,
      )
    }
  })
  ;[0.24, 0.5, 0.76].forEach((zRatio) => {
    for (let segment = 0; segment < 18; segment += 1) {
      const x0 = segment / 18
      const x1 = (segment + 1) / 18
      seamPoints.push(
        -spec.width / 2 + x0 * spec.width, ceilingHeight(x0, zRatio, spec.slope) - 0.012, -spec.depth / 2 + zRatio * spec.depth,
        -spec.width / 2 + x1 * spec.width, ceilingHeight(x1, zRatio, spec.slope) - 0.012, -spec.depth / 2 + zRatio * spec.depth,
      )
    }
  })
  const seamGeometry = new THREE.BufferGeometry()
  seamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3))
  group.add(new THREE.LineSegments(seamGeometry, seamMaterial))

  const frontBeam = box(spec.width, 0.28, 0.34, materials.ceilingEdge)
  frontBeam.position.set(0, (spec.slope.leftFront + spec.slope.rightFront) / 2 - 0.14, -spec.depth / 2)
  frontBeam.rotation.z = Math.atan2(spec.slope.leftFront - spec.slope.rightFront, spec.width)
  group.add(frontBeam)

  return group
}

function createLeftLevelChanges(materials) {
  const group = new THREE.Group()
  group.name = 'LeftLevelChanges'

  const platform = box(8.5, 0.52, 9.6, materials.paleFloor)
  platform.position.set(10.7, 0.24, 11.3)
  group.add(platform)

  for (let stepIndex = 0; stepIndex < 8; stepIndex += 1) {
    const step = box(2.1, 0.16 + stepIndex * 0.16, 0.58, materials.stair)
    step.position.set(14, 0.08 + stepIndex * 0.08, 5.2 + stepIndex * 0.55)
    group.add(step)
  }

  const leftMass = box(1.2, 7.5, 8.8, materials.deepFloor)
  leftMass.position.set(15.5, 3.75, 9.6)
  group.add(leftMass)
  return group
}

function createStructuralColumns(materials) {
  const group = new THREE.Group()
  group.name = 'StructuralColumns'
  const columnPositions = [
    [-12.55, 4.6, -10.8],
    [-12.55, 4.8, 7.3],
    [13.85, 4.15, 13.2],
  ]

  columnPositions.forEach(([x, y, z], index) => {
    const column = box(0.58, y * 2, 0.58, materials.column)
    column.position.set(x, y, z)
    column.userData.structureName = `Column ${index + 1}`
    group.add(column)
  })
  return group
}

export function createStudioShell(materials) {
  const root = new THREE.Group()
  root.name = 'StudioShell'

  addFloorZone(root, studioLayout.floor, materials.concrete, 0.32)
  addFloorZone(root, studioLayout.timberFloor, materials.timber, 0.1)
  addFloorZone(root, studioLayout.displayApron, materials.paleFloor, 0.2)
  addFloorZone(root, studioLayout.deepWorkZone, materials.deepFloor, 0.16)

  const displayWall = box(
    studioLayout.displayWall.width,
    studioLayout.displayWall.height,
    studioLayout.displayWall.depth,
    materials.displayWall,
  )
  displayWall.position.set(...studioLayout.displayWall.position)
  displayWall.rotation.set(...studioLayout.displayWall.rotation)
  displayWall.userData.structureName = 'Left Display Wall'
  root.add(displayWall)

  const rearCorner = box(8.4, 7.2, 0.38, materials.deepFloor)
  rearCorner.position.set(10.7, 3.6, studioDimensions.depth / 2 - 0.18)
  root.add(rearCorner)

  root.add(createSlopedCeiling(studioLayout.slopedCeiling, materials))
  root.add(createLeftLevelChanges(materials))
  root.add(createStructuralColumns(materials))
  return root
}

import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'

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

function createRoofGrid(spec, material) {
  const xSegments = 14
  const zSegments = 20
  const vertices = []
  const indices = []
  const uvs = []

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zRatio = zIndex / zSegments
    const z = -spec.depth / 2 + zRatio * spec.depth
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xRatio = xIndex / xSegments
      const x = -spec.width / 2 + xRatio * spec.width
      const shellVariation = Math.sin(xRatio * Math.PI * 4) * Math.sin(zRatio * Math.PI * 3) * 0.025
      vertices.push(x, roofHeightAt(x, z, spec) + shellVariation, z)
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
  const ceiling = new THREE.Mesh(geometry, material)
  ceiling.name = 'WedgeCeilingInnerSurface'
  ceiling.castShadow = true
  ceiling.receiveShadow = true
  return ceiling
}

function createRoofSeams(spec) {
  const seamMaterial = new THREE.LineBasicMaterial({ color: '#594838', transparent: true, opacity: 0.28 })
  const seamPoints = []

  ;[0.17, 0.36, 0.56, 0.77].forEach((xRatio) => {
    const x = -spec.width / 2 + xRatio * spec.width
    for (let segment = 0; segment < 18; segment += 1) {
      const z0 = -spec.depth / 2 + (segment / 18) * spec.depth
      const z1 = -spec.depth / 2 + ((segment + 1) / 18) * spec.depth
      seamPoints.push(x, roofHeightAt(x, z0, spec) - 0.015, z0, x, roofHeightAt(x, z1, spec) - 0.015, z1)
    }
  })

  ;[0.22, 0.47, 0.72].forEach((zRatio) => {
    const z = -spec.depth / 2 + zRatio * spec.depth
    for (let segment = 0; segment < 18; segment += 1) {
      const x0 = -spec.width / 2 + (segment / 18) * spec.width
      const x1 = -spec.width / 2 + ((segment + 1) / 18) * spec.width
      seamPoints.push(x0, roofHeightAt(x0, z, spec) - 0.015, z, x1, roofHeightAt(x1, z, spec) - 0.015, z)
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3))
  return new THREE.LineSegments(geometry, seamMaterial)
}

function createRoofShell(spec, materials) {
  const group = new THREE.Group()
  group.name = 'SlopedCeiling'
  if (!spec.visibility) return group

  const xMin = -spec.width / 2
  const xMax = spec.width / 2
  const zFront = -spec.depth / 2
  const zRear = spec.depth / 2
  const thickness = spec.thickness
  const leftFront = roofHeightAt(xMin, zFront, spec)
  const rightFront = roofHeightAt(xMax, zFront, spec)
  const leftRear = roofHeightAt(xMin, zRear, spec)
  const rightRear = roofHeightAt(xMax, zRear, spec)

  group.add(createRoofGrid(spec, materials.ceiling))
  group.add(createRoofSeams(spec))
  group.add(createSurface([
    [xMin, leftFront + thickness, zFront],
    [xMax, rightFront + thickness, zFront],
    [xMax, rightRear + thickness, zRear],
    [xMin, leftRear + thickness, zRear],
  ], materials.ceilingEdge, { name: 'WedgeRoofOuterSurface' }))

  group.add(createSurface([
    [xMin, leftFront, zFront], [xMax, rightFront, zFront],
    [xMax, rightFront + thickness, zFront], [xMin, leftFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'WedgeRoofFrontFascia' }))
  group.add(createSurface([
    [xMin, leftRear, zRear], [xMax, rightRear, zRear],
    [xMax, rightRear + thickness, zRear], [xMin, leftRear + thickness, zRear],
  ], materials.ceilingEdge, { name: 'WedgeRoofRearFascia' }))
  group.add(createSurface([
    [xMin, leftFront, zFront], [xMin, leftRear, zRear],
    [xMin, leftRear + thickness, zRear], [xMin, leftFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'WedgeRoofGlassFascia' }))
  group.add(createSurface([
    [xMax, rightFront, zFront], [xMax, rightRear, zRear],
    [xMax, rightRear + thickness, zRear], [xMax, rightFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'WedgeRoofSolidFascia' }))

  ;[0.2, 0.5, 0.8].forEach((xRatio) => {
    const x = xMin + xRatio * spec.width
    const startY = roofHeightAt(x, zFront, spec)
    const endY = roofHeightAt(x, zRear, spec)
    const beam = box(0.24, 0.22, Math.hypot(spec.depth, endY - startY), materials.ceilingEdge)
    beam.position.set(x, (startY + endY) / 2 - 0.1, 0)
    beam.rotation.x = -Math.atan2(endY - startY, spec.depth)
    group.add(beam)
  })

  return group
}

function createWedgeBoundaryWalls(materials) {
  const group = new THREE.Group()
  group.name = 'WedgeBoundaryWalls'
  const roof = studioLayout.slopedCeiling
  const xMin = -roof.width / 2
  const xMax = roof.width / 2
  const zFront = -roof.depth / 2
  const zRear = roof.depth / 2

  const solidSideWall = createSurface([
    [xMax, 0, zFront],
    [xMax, 0, zRear],
    [xMax, roofHeightAt(xMax, zRear, roof), zRear],
    [xMax, roofHeightAt(xMax, zFront, roof), zFront],
  ], materials.displayWall, { name: 'SolidSideWall' })
  solidSideWall.userData.structureName = 'Trapezoid Solid Side Wall'
  group.add(solidSideWall)

  const rearWall = createSurface([
    [xMin, 0, zRear],
    [xMax, 0, zRear],
    [xMax, roofHeightAt(xMax, zRear, roof), zRear],
    [xMin, roofHeightAt(xMin, zRear, roof), zRear],
  ], materials.deepFloor, { name: 'SlopedRearBoundary', reverse: true })
  rearWall.userData.structureName = 'Sloped Rear Boundary'
  group.add(rearWall)
  return group
}

function createLeftLevelChanges(materials) {
  const group = new THREE.Group()
  group.name = 'LeftLevelChanges'

  const platform = box(12.2, 0.64, 14.4, materials.paleFloor)
  platform.position.set(15.2, 0.3, 16.3)
  group.add(platform)

  for (let stepIndex = 0; stepIndex < 10; stepIndex += 1) {
    const step = box(2.7, 0.17 + stepIndex * 0.17, 0.7, materials.stair)
    step.position.set(19.8, 0.085 + stepIndex * 0.085, 7.2 + stepIndex * 0.68)
    group.add(step)
  }

  const leftMass = box(1.55, 11.2, 13.2, materials.deepFloor)
  leftMass.position.set(21.1, 5.6, 14.2)
  group.add(leftMass)
  return group
}

function createStructuralColumns(materials) {
  const group = new THREE.Group()
  group.name = 'StructuralColumns'
  const columnPositions = [
    [-19.4, -15.5],
    [-19.4, 11],
    [19.5, 18.8],
  ]

  columnPositions.forEach(([x, z], index) => {
    const height = roofHeightAt(x, z) - 0.18
    const column = box(0.62, height, 0.62, materials.column)
    column.position.set(x, height / 2, z)
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
  displayWall.name = 'LeftDisplayWall'
  displayWall.position.set(...studioLayout.displayWall.position)
  displayWall.rotation.set(...studioLayout.displayWall.rotation)
  displayWall.userData.structureName = 'Left Display Wall'
  root.add(displayWall)

  root.add(createWedgeBoundaryWalls(materials))
  root.add(createRoofShell(studioLayout.slopedCeiling, materials))
  root.add(createLeftLevelChanges(materials))
  root.add(createStructuralColumns(materials))
  return root
}

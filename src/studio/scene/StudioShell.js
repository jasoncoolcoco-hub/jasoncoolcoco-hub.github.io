import * as THREE from 'three'
import { floorPlan, studioLayout, studioShellBaseline } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'
import { createGlassFacade } from './GlassFacade'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addFloorFace(group, spec, material, height = 0.32) {
  if (!spec.visibility) return
  const floor = new THREE.Mesh(new THREE.BoxGeometry(spec.width, height, spec.depth, 10, 1, 12), material)
  floor.name = 'Face0FloorSurface'
  floor.position.set(...spec.position)
  floor.castShadow = true
  floor.receiveShadow = true
  floor.userData.structureName = 'Face 0 / Rectangular Floor A–B–C–D'
  floor.userData.corners = floorPlan.corners
  floor.userData.openEdges = floorPlan.openEdges
  group.add(floor)
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
      vertices.push(x, roofHeightAt(x, z, spec), z)
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
  ceiling.name = 'Face3RoofInnerSurface'
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

function createRoofFromBoundaryEdges(spec, materials) {
  const group = new THREE.Group()
  group.name = 'Face3RoofPlane'
  group.userData.structureName = 'Face 3 / Sloped roof covering the full A–B–C–D projection'
  if (!spec.visibility) return group

  const xMin = -spec.width / 2
  const xMax = spec.width / 2
  const zFront = -spec.depth / 2
  const zRear = spec.depth / 2
  const thickness = spec.thickness
  const heightA = roofHeightAt(xMin, zFront, spec)
  const heightB = roofHeightAt(xMin, zRear, spec)
  const heightC = roofHeightAt(xMax, zRear, spec)
  const heightD = roofHeightAt(xMax, zFront, spec)

  const innerSurface = createRoofGrid(spec, materials.ceiling)
  innerSurface.userData.structureName = 'Full rectangular roof projection bounded by A–B–C–D'
  group.add(innerSurface)
  group.add(createRoofSeams(spec))
  group.add(createSurface([
    [xMin, heightA + thickness, zFront],
    [xMax, heightD + thickness, zFront],
    [xMax, heightC + thickness, zRear],
    [xMin, heightB + thickness, zRear],
  ], materials.ceilingEdge, { name: 'Face3RoofOuterSurface' }))

  group.add(createSurface([
    [xMin, heightA, zFront], [xMin, heightB, zRear],
    [xMin, heightB + thickness, zRear], [xMin, heightA + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofWall1SharedEdge' }))
  group.add(createSurface([
    [xMin, heightB, zRear], [xMax, heightC, zRear],
    [xMax, heightC + thickness, zRear], [xMin, heightB + thickness, zRear],
  ], materials.ceilingEdge, { name: 'RoofWall2SharedEdge' }))
  group.add(createSurface([
    [xMax, heightD, zFront], [xMax, heightC, zRear],
    [xMax, heightC + thickness, zRear], [xMax, heightD + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofEdge3OpenBoundary' }))
  group.add(createSurface([
    [xMin, heightA, zFront], [xMax, heightD, zFront],
    [xMax, heightD + thickness, zFront], [xMin, heightA + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofEdge4OpenBoundary' }))

  ;[0.2, 0.5, 0.8].forEach((xRatio) => {
    const x = xMin + xRatio * spec.width
    const startY = roofHeightAt(x, zFront, spec)
    const endY = roofHeightAt(x, zRear, spec)
    const beam = box(0.24, 0.22, Math.hypot(spec.depth, endY - startY), materials.ceilingEdge)
    beam.position.set(x, (startY + endY) / 2 - 0.1, 0)
    beam.rotation.x = -Math.atan2(endY - startY, spec.depth)
    beam.name = `RoofSpan${Math.round(xRatio * 10)}`
    group.add(beam)
  })

  return group
}

function createRearWall(materials) {
  const group = new THREE.Group()
  group.name = 'Face2RearWall'
  group.userData.structureName = 'Face 2 / Rear wall on edge B–C'
  if (!studioShellBaseline.wall2.visibility) return group

  const roof = studioLayout.slopedCeiling
  const [pointB, pointC] = floorPlan.wall2Edge.map((corner) => floorPlan.corners[corner])
  const heightB = roofHeightAt(pointB[0], pointB[2], roof)
  const heightC = roofHeightAt(pointC[0], pointC[2], roof)

  const wall = createSurface([
    pointB,
    pointC,
    [pointC[0], heightC, pointC[2]],
    [pointB[0], heightB, pointB[2]],
  ], materials[studioShellBaseline.wall2.material], { name: 'Face2RearWallSurface', reverse: true })
  wall.userData.structureName = 'Wall 2 follows B–C and meets the sloped roof at 8m / 20.5m'
  group.add(wall)

  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#c9aa7d', transparent: true, opacity: 0.68 })
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), outlineMaterial)
  outline.name = 'Face2RearWallOutline'
  group.add(outline)

  const sharedCorner = box(0.34, heightB, 0.34, materials.ceilingEdge)
  sharedCorner.name = 'Wall1Wall2SharedCornerB'
  sharedCorner.position.set(pointB[0], heightB / 2, pointB[2])
  group.add(sharedCorner)

  return group
}

export function createStudioShell(materials) {
  const root = new THREE.Group()
  root.name = 'StudioShell'
  root.userData.structureName = 'Rectangular floor shell with two walls and two open edges'
  root.userData.floorCorners = floorPlan.corners

  addFloorFace(root, studioLayout.floor, materials.concrete)
  root.add(createGlassFacade(materials))
  root.add(createRearWall(materials))
  root.add(createRoofFromBoundaryEdges(studioLayout.slopedCeiling, materials))
  return root
}

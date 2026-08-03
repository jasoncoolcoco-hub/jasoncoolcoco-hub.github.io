import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { floorPlan, studioLayout, studioShellBaseline } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'
import { createGlassFacade } from './GlassFacade'

function addUv1(geometry) {
  if (geometry.attributes.uv && !geometry.attributes.uv1) {
    geometry.setAttribute('uv1', geometry.attributes.uv.clone())
  }
  return geometry
}

function roundedBox(width, height, depth, material, radius = 0.03, segments = 2) {
  const geometry = addUv1(new RoundedBoxGeometry(width, height, depth, segments, radius))
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function roundedBeamBetween(start, end, width, height, material, name = '') {
  const startPoint = new THREE.Vector3(...start)
  const endPoint = new THREE.Vector3(...end)
  const direction = endPoint.clone().sub(startPoint)
  const length = direction.length()
  const beam = roundedBox(width, height, 1, material, Math.min(width, height) * 0.18, 2)
  beam.name = name
  beam.position.copy(startPoint).add(endPoint).multiplyScalar(0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize())
  beam.scale.z = length
  return beam
}

function addFloorEdgeJoints(group, spec, topY, materials) {
  const xMin = -spec.width / 2
  const xMax = spec.width / 2
  const zMin = -spec.depth / 2
  const zMax = spec.depth / 2
  const jointHeight = 0.014
  const jointWidth = 0.045
  const edges = [
    [[xMin, topY, zMin], [xMax, topY, zMin], 'FloorEdgeDA'],
    [[xMax, topY, zMin], [xMax, topY, zMax], 'FloorEdgeCD'],
    [[xMax, topY, zMax], [xMin, topY, zMax], 'FloorEdgeBC'],
    [[xMin, topY, zMax], [xMin, topY, zMin], 'FloorEdgeAB'],
  ]
  edges.forEach(([start, end, name]) => {
    group.add(roundedBeamBetween(start, end, jointWidth, jointHeight, materials.floorJoint, name))
  })
}

function addFloorFace(group, spec, materials, height = 0.32) {
  if (!spec.visibility) return
  const floor = roundedBox(spec.width, height, spec.depth, materials.concrete, 0.055, 3)
  floor.name = 'Face0FloorSurface'
  floor.position.set(...spec.position)
  floor.userData.structureName = 'Face 0 / Bevelled rectangular floor A–B–C–D'
  floor.userData.corners = floorPlan.corners
  floor.userData.openEdges = floorPlan.openEdges
  group.add(floor)
  addFloorEdgeJoints(group, spec, spec.position[1] + height / 2 + 0.004, materials)
}

function createTimberFloorZone(spec, materials) {
  const group = new THREE.Group()
  group.name = 'TimberFloorFinishZone'
  if (!spec.visibility) return group

  const boardWidth = spec.boardWidth
  const gap = spec.boardGap
  const rows = Math.floor((spec.width + gap) / (boardWidth + gap))
  const xMin = -spec.width / 2 + boardWidth / 2
  const zMin = -spec.depth / 2
  const zMax = spec.depth / 2
  const lengths = [4.15, 3.35, 5.05, 4.55, 3.8]
  const transforms = []

  for (let row = 0; row < rows; row += 1) {
    const x = xMin + row * (boardWidth + gap)
    let cursor = zMin
    let segment = 0
    while (cursor < zMax - 0.08) {
      let length = lengths[(row * 3 + segment) % lengths.length]
      if (segment === 0) length *= 0.55 + (row % 4) * 0.12
      length = Math.min(length, zMax - cursor)
      if (length < 0.18) break
      transforms.push({ x, z: cursor + length / 2, length, row, segment })
      cursor += length + gap
      segment += 1
    }
  }

  const geometry = addUv1(new RoundedBoxGeometry(1, spec.thickness, 1, 2, 0.018))
  const boards = new THREE.InstancedMesh(geometry, materials.timber, transforms.length)
  boards.name = 'StaggeredTimberBoards'
  boards.castShadow = true
  boards.receiveShadow = true
  boards.instanceMatrix.setUsage(THREE.StaticDrawUsage)
  const matrix = new THREE.Matrix4()
  const palette = ['#806651', '#755b47', '#866b54', '#705744', '#7b604b']
  transforms.forEach(({ x, z, length, row, segment }, index) => {
    matrix.compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion(),
      new THREE.Vector3(boardWidth, 1, Math.max(0.08, length - gap)),
    )
    boards.setMatrixAt(index, matrix)
    boards.setColorAt(index, new THREE.Color(palette[(row + segment * 2) % palette.length]))
  })
  boards.instanceMatrix.needsUpdate = true
  if (boards.instanceColor) boards.instanceColor.needsUpdate = true
  group.position.set(...spec.position)
  group.add(boards)

  const edgeOffset = spec.width / 2 + 0.035
  ;[-edgeOffset, edgeOffset].forEach((x, index) => {
    const trim = roundedBox(0.045, 0.026, spec.depth, materials.floorJoint, 0.009, 2)
    trim.name = `TimberFloorBoundary${index + 1}`
    trim.position.set(x, spec.thickness * 0.42, 0)
    group.add(trim)
  })
  return group
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
  geometry.setAttribute('uv1', geometry.attributes.uv.clone())
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const ceiling = new THREE.Mesh(geometry, material)
  ceiling.name = 'Face3RoofInnerSurface'
  ceiling.castShadow = true
  ceiling.receiveShadow = true
  return ceiling
}

function createRoofSeams(spec, material) {
  const seamPoints = []

  ;[0.25, 0.5, 0.75].forEach((xRatio) => {
    const x = -spec.width / 2 + xRatio * spec.width
    const segments = 20
    for (let segment = 0; segment < segments; segment += 1) {
      const z0 = -spec.depth / 2 + (segment / segments) * spec.depth
      const z1 = -spec.depth / 2 + ((segment + 1) / segments) * spec.depth
      seamPoints.push(x, roofHeightAt(x, z0, spec) - 0.018, z0, x, roofHeightAt(x, z1, spec) - 0.018, z1)
    }
  })

  ;[0.34, 0.67].forEach((zRatio) => {
    const z = -spec.depth / 2 + zRatio * spec.depth
    const segments = 22
    for (let segment = 0; segment < segments; segment += 1) {
      const x0 = -spec.width / 2 + (segment / segments) * spec.width
      const x1 = -spec.width / 2 + ((segment + 1) / segments) * spec.width
      seamPoints.push(x0, roofHeightAt(x0, z, spec) - 0.018, z, x1, roofHeightAt(x1, z, spec) - 0.018, z)
    }
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3))
  const seams = new THREE.LineSegments(geometry, material)
  seams.name = 'RoofPanelJoints'
  return seams
}

function createRoofFromBoundaryEdges(spec, materials) {
  const group = new THREE.Group()
  group.name = 'Face3RoofPlane'
  group.userData.structureName = 'Face 3 / Detailed roof on approved A–B–C–D plane'
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
  innerSurface.userData.structureName = 'Textured roof interior on frozen plane'
  group.add(innerSurface)
  group.add(createRoofSeams(spec, materials.roofJoint))
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

  const edgeY = thickness * 0.48
  const edgeBeams = [
    [[xMin, heightA + edgeY, zFront], [xMin, heightB + edgeY, zRear], 'RoofEdgeABTrim'],
    [[xMin, heightB + edgeY, zRear], [xMax, heightC + edgeY, zRear], 'RoofEdgeBCTrim'],
    [[xMax, heightC + edgeY, zRear], [xMax, heightD + edgeY, zFront], 'RoofEdgeCDTrim'],
    [[xMax, heightD + edgeY, zFront], [xMin, heightA + edgeY, zFront], 'RoofEdgeDATrim'],
  ]
  edgeBeams.forEach(([start, end, name]) => {
    group.add(roundedBeamBetween(start, end, 0.24, 0.18, materials.ceilingEdge, name))
  })

  ;[0.2, 0.46, 0.72].forEach((xRatio, index) => {
    const x = xMin + xRatio * spec.width
    const startY = roofHeightAt(x, zFront, spec) - 0.08
    const endY = roofHeightAt(x, zRear, spec) - 0.08
    group.add(roundedBeamBetween(
      [x, startY, zFront],
      [x, endY, zRear],
      0.18,
      0.12,
      materials.ceilingEdge,
      `RoofStructuralRib${index + 1}`,
    ))
  })
  return group
}

function createRearWall(materials) {
  const group = new THREE.Group()
  group.name = 'Face2RearWall'
  group.userData.structureName = 'Face 2 / Solid wall on approved edge B–C'
  if (!studioShellBaseline.wall2.visibility) return group

  const roof = studioLayout.slopedCeiling
  const [pointB, pointC] = floorPlan.wall2Edge.map((corner) => floorPlan.corners[corner])
  const heightB = roofHeightAt(pointB[0], pointB[2], roof)
  const heightC = roofHeightAt(pointC[0], pointC[2], roof)
  const zInside = pointB[2]
  const thickness = 0.24
  const zOutside = zInside + thickness
  const wallMaterial = materials[studioShellBaseline.wall2.material]

  const interior = createSurface([
    pointB,
    pointC,
    [pointC[0], heightC, pointC[2]],
    [pointB[0], heightB, pointB[2]],
  ], wallMaterial, { name: 'Face2RearWallInterior', reverse: true })
  interior.userData.structureName = 'Wall 2 interior finish on frozen B–C edge'
  group.add(interior)
  group.add(createSurface([
    [pointC[0], 0, zOutside], [pointB[0], 0, zOutside],
    [pointB[0], heightB, zOutside], [pointC[0], heightC, zOutside],
  ], wallMaterial, { name: 'Face2RearWallExterior' }))
  group.add(createSurface([
    [pointB[0], 0, zOutside], [pointB[0], 0, zInside],
    [pointB[0], heightB, zInside], [pointB[0], heightB, zOutside],
  ], materials.wallTrim, { name: 'Wall2ReturnAtB' }))
  group.add(createSurface([
    [pointC[0], 0, zInside], [pointC[0], 0, zOutside],
    [pointC[0], heightC, zOutside], [pointC[0], heightC, zInside],
  ], materials.wallTrim, { name: 'Wall2OpenEdgeReturnAtC' }))
  group.add(createSurface([
    [pointB[0], heightB, zInside], [pointC[0], heightC, zInside],
    [pointC[0], heightC, zOutside], [pointB[0], heightB, zOutside],
  ], materials.wallTrim, { name: 'Wall2SlopedTopClosure' }))

  const baseboard = roundedBox(pointC[0] - pointB[0], 0.18, 0.1, materials.wallTrim, 0.025, 2)
  baseboard.name = 'Wall2RestrainedBaseboard'
  baseboard.position.set(0, 0.09, zInside - 0.055)
  group.add(baseboard)

  group.add(roundedBeamBetween(
    [pointB[0], heightB - 0.08, zInside - 0.035],
    [pointC[0], heightC - 0.08, zInside - 0.035],
    0.16,
    0.12,
    materials.wallTrim,
    'Wall2SlopedTopTrim',
  ))

  const sharedCorner = roundedBox(0.42, heightB, 0.42, materials.glassFrame, 0.045, 3)
  sharedCorner.name = 'Wall1Wall2SharedCornerB'
  sharedCorner.position.set(pointB[0] + 0.02, heightB / 2, zInside - 0.02)
  group.add(sharedCorner)
  return group
}

export function createStudioShell(materials) {
  const root = new THREE.Group()
  root.name = 'StudioShell'
  root.userData.structureName = 'Approved shell with reversible realism finish layers'
  root.userData.floorCorners = floorPlan.corners

  addFloorFace(root, studioLayout.floor, materials)
  root.add(createTimberFloorZone(studioLayout.timberFloor, materials))
  root.add(createGlassFacade(materials))
  root.add(createRearWall(materials))
  root.add(createRoofFromBoundaryEdges(studioLayout.slopedCeiling, materials))
  return root
}

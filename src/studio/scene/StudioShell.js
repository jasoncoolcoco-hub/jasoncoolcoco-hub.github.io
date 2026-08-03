import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'
import { createGlassFacade } from './GlassFacade'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function addFloorZone(group, spec, material, height = 0.16) {
  if (!spec.visibility) return
  const zone = box(spec.width, height, spec.depth, material)
  zone.name = 'Face0Floor'
  zone.position.set(...spec.position)
  zone.userData.structureName = 'Face 0 / Floor'
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

function createRoofFromWallEdges(spec, materials) {
  const group = new THREE.Group()
  group.name = 'Face3RoofPlane'
  group.userData.structureName = 'Face 3 / Roof defined by Wall 1 + Wall 2'
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

  const innerSurface = createRoofGrid(spec, materials.ceiling)
  innerSurface.userData.structureName = 'Roof plane spanning shared wall top edges'
  group.add(innerSurface)
  group.add(createRoofSeams(spec))
  group.add(createSurface([
    [xMin, leftFront + thickness, zFront],
    [xMax, rightFront + thickness, zFront],
    [xMax, rightRear + thickness, zRear],
    [xMin, leftRear + thickness, zRear],
  ], materials.ceilingEdge, { name: 'Face3RoofOuterSurface' }))

  group.add(createSurface([
    [xMin, leftFront, zFront], [xMax, rightFront, zFront],
    [xMax, rightFront + thickness, zFront], [xMin, leftFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofFrontOpenEdge' }))
  group.add(createSurface([
    [xMin, leftRear, zRear], [xMax, rightRear, zRear],
    [xMax, rightRear + thickness, zRear], [xMin, leftRear + thickness, zRear],
  ], materials.ceilingEdge, { name: 'RoofWall2SharedEdge' }))
  group.add(createSurface([
    [xMin, leftFront, zFront], [xMin, leftRear, zRear],
    [xMin, leftRear + thickness, zRear], [xMin, leftFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofWall1SharedEdge' }))
  group.add(createSurface([
    [xMax, rightFront, zFront], [xMax, rightRear, zRear],
    [xMax, rightRear + thickness, zRear], [xMax, rightFront + thickness, zFront],
  ], materials.ceilingEdge, { name: 'RoofTaperedOpenEdge' }))

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

function createRearTriangularWall(materials) {
  const group = new THREE.Group()
  group.name = 'Face2RearTriangularWall'
  group.userData.structureName = 'Face 2 / Rear Triangular Wall'

  const roof = studioLayout.slopedCeiling
  const xWall1 = -roof.width / 2
  const xTaper = roof.width / 2
  const zRear = roof.depth / 2
  const wall1Top = roofHeightAt(xWall1, zRear, roof)
  const taperedTop = roofHeightAt(xTaper, zRear, roof)

  const wall = createSurface([
    [xWall1, 0, zRear],
    [xTaper, 0, zRear],
    [xTaper, taperedTop, zRear],
    [xWall1, wall1Top, zRear],
  ], materials.deepFloor, { name: 'Face2RearTriangularSurface', reverse: true })
  wall.userData.structureName = 'Wall 2 rising from 0.9m to the Wall 1 junction'
  group.add(wall)

  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#c9aa7d', transparent: true, opacity: 0.68 })
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), outlineMaterial)
  outline.name = 'Face2RearTriangularOutline'
  group.add(outline)

  const sharedCorner = box(0.34, wall1Top, 0.34, materials.ceilingEdge)
  sharedCorner.name = 'Wall1Wall2SharedCorner'
  sharedCorner.position.set(xWall1, wall1Top / 2, zRear)
  group.add(sharedCorner)

  return group
}

export function createStudioShell(materials) {
  const root = new THREE.Group()
  root.name = 'StudioShell'
  root.userData.structureName = 'Four-face triangular wedge shell'

  addFloorZone(root, studioLayout.floor, materials.concrete, 0.32)
  root.add(createGlassFacade(materials))
  root.add(createRearTriangularWall(materials))
  root.add(createRoofFromWallEdges(studioLayout.slopedCeiling, materials))
  return root
}

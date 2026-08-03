import * as THREE from 'three'
import { shellGeometry } from '../config/studioConfig'
import { createTriangle } from './studioGeometry'
import { createGlassFacade } from './GlassFacade'

function addOutline(group, mesh, color, opacity, name) {
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), material)
  outline.name = name
  group.add(outline)
}

function createFloorFace(materials) {
  const group = new THREE.Group()
  group.name = 'Face0Floor'
  group.userData.structureName = 'Face 0 / Floor triangle converging at apex'

  const floor = createTriangle([
    shellGeometry.floorExtent.wall2Base,
    shellGeometry.floorExtent.wall1Base,
    shellGeometry.apexPosition,
  ], materials.concrete, { name: 'Face0ApexFloorSurface' })
  group.add(floor)
  addOutline(group, floor, '#bca681', 0.5, 'Face0ApexFloorOutline')
  return group
}

function createRearTriangularWall(materials) {
  const group = new THREE.Group()
  group.name = 'Face2RearTriangularWall'
  group.userData.structureName = 'Face 2 / Dominant wall triangle converging at apex'

  const floorBase = shellGeometry.wall2Extent.basePosition
  const roofBase = [floorBase[0], shellGeometry.wall2Extent.baseHeight, floorBase[2]]
  const wall = createTriangle([
    floorBase,
    roofBase,
    shellGeometry.apexPosition,
  ], materials.deepFloor, { name: 'Face2ApexWallSurface', reverse: true })
  materials.deepFloor.side = THREE.DoubleSide
  group.add(wall)
  addOutline(group, wall, '#c9aa7d', 0.72, 'Face2ApexWallOutline')
  return group
}

function createRoofFromApex(materials) {
  const group = new THREE.Group()
  group.name = 'Face3RoofPlane'
  group.userData.structureName = 'Face 3 / High roof triangle converging at apex'

  const wall1Base = shellGeometry.wall1Extent.basePosition
  const wall2Base = shellGeometry.wall2Extent.basePosition
  const wall1Roof = [wall1Base[0], shellGeometry.wall1Extent.baseHeight, wall1Base[2]]
  const wall2Roof = [wall2Base[0], shellGeometry.wall2Extent.baseHeight, wall2Base[2]]
  const roof = createTriangle([
    wall1Roof,
    wall2Roof,
    shellGeometry.apexPosition,
  ], materials.ceiling, { name: 'Face3ApexRoofSurface' })
  group.add(roof)
  addOutline(group, roof, '#5c4939', 0.8, 'Face3ApexRoofOutline')

  const guideMaterial = new THREE.LineBasicMaterial({ color: '#594838', transparent: true, opacity: 0.28 })
  const guidePoints = []
  ;[0.22, 0.44, 0.66, 0.84].forEach((ratio) => {
    const base = new THREE.Vector3(...wall1Roof).lerp(new THREE.Vector3(...wall2Roof), ratio)
    guidePoints.push(...base.toArray(), ...shellGeometry.apexPosition)
  })
  const guideGeometry = new THREE.BufferGeometry()
  guideGeometry.setAttribute('position', new THREE.Float32BufferAttribute(guidePoints, 3))
  const guides = new THREE.LineSegments(guideGeometry, guideMaterial)
  guides.name = 'RoofApexConvergenceGuides'
  group.add(guides)
  return group
}

export function createStudioShell(materials) {
  const root = new THREE.Group()
  root.name = 'StudioShell'
  root.userData.structureName = 'Single-apex four-face shell'
  root.userData.apexPosition = shellGeometry.apexPosition

  root.add(createFloorFace(materials))
  root.add(createGlassFacade(materials))
  root.add(createRearTriangularWall(materials))
  root.add(createRoofFromApex(materials))
  return root
}

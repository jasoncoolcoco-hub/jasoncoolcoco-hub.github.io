import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { floorPlan, studioLayout } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'

function roundedBox(width, height, depth, material, radius = 0.025, segments = 2) {
  const geometry = new RoundedBoxGeometry(width, height, depth, segments, radius)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function facadeTopAt(spec, z) {
  return roofHeightAt(spec.position[0], z) - spec.roofInset
}

function createFacadePanel(spec, material, x, zStart, zEnd, bottomOffset = 0, name = '') {
  const bottom = spec.elevation + bottomOffset
  return createSurface([
    [x, bottom, zStart],
    [x, bottom, zEnd],
    [x, facadeTopAt(spec, zEnd), zEnd],
    [x, facadeTopAt(spec, zStart), zStart],
  ], material, { name, castShadow: false })
}

function createGlassPanelVolume(spec, material, zStart, zEnd, name) {
  const xInside = spec.position[0] + 0.035
  const xOutside = spec.position[0] - 0.035
  const bottom = spec.elevation + 0.1
  const topStart = facadeTopAt(spec, zStart) - 0.08
  const topEnd = facadeTopAt(spec, zEnd) - 0.08
  const points = [
    [xInside, bottom, zStart], [xInside, bottom, zEnd],
    [xInside, topEnd, zEnd], [xInside, topStart, zStart],
    [xOutside, bottom, zStart], [xOutside, bottom, zEnd],
    [xOutside, topEnd, zEnd], [xOutside, topStart, zStart],
  ]
  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    3, 2, 6, 3, 6, 7,
    1, 5, 6, 1, 6, 2,
    0, 3, 7, 0, 7, 4,
  ]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const glass = new THREE.Mesh(geometry, material)
  glass.name = name
  glass.castShadow = false
  glass.receiveShadow = true
  glass.renderOrder = 2
  return glass
}

function beamMatrix(start, end, matrix = new THREE.Matrix4()) {
  const startPoint = new THREE.Vector3(...start)
  const endPoint = new THREE.Vector3(...end)
  const direction = endPoint.clone().sub(startPoint)
  const length = direction.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    direction.clone().normalize(),
  )
  return matrix.compose(
    startPoint.add(endPoint).multiplyScalar(0.5),
    quaternion,
    new THREE.Vector3(1, 1, length),
  )
}

function roundedBeamBetween(start, end, width, height, material, name) {
  const beam = roundedBox(width, height, 1, material, Math.min(width, height) * 0.16, 2)
  beam.name = name
  beamMatrix(start, end, beam.matrix)
  beam.matrix.decompose(beam.position, beam.quaternion, beam.scale)
  return beam
}

function createExteriorDepth(spec, materials, startZ, endZ) {
  const group = new THREE.Group()
  group.name = 'FacadeExteriorDepth'
  const backdrop = createFacadePanel(
    spec,
    materials.darkExterior,
    spec.position[0] - 1.25,
    startZ - 0.6,
    endZ + 0.6,
    -0.15,
    'ColdExteriorBackdrop',
  )
  group.add(backdrop)
  const exteriorFloor = roundedBox(5.8, 0.12, endZ - startZ + 1.2, materials.darkExterior, 0.025, 2)
  exteriorFloor.name = 'ExteriorDepthFloor'
  exteriorFloor.position.set(spec.position[0] - 3, -0.07, (startZ + endZ) / 2)
  group.add(exteriorFloor)
  return group
}

export function createGlassFacade(materials) {
  const spec = studioLayout.glassFacade
  const group = new THREE.Group()
  group.name = 'Face1GlassFacade'
  group.userData.structureName = 'Face 1 / Physical glass facade on approved edge A–B'
  group.userData.edge = floorPlan.wall1Edge

  const pointA = floorPlan.corners.A
  const pointB = floorPlan.corners.B
  const startZ = pointA[2] + 0.3
  const endZ = pointB[2] - 0.3
  const bayStops = [0, 0.075, 0.16, 0.25, 0.35, 0.46, 0.58, 0.7, 0.81, 0.91, 1]
  group.add(createExteriorDepth(spec, materials, startZ, endZ))

  const glassPanels = new THREE.Group()
  glassPanels.name = 'GlassPanels'
  for (let bay = 0; bay < bayStops.length - 1; bay += 1) {
    const bayStart = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay]) + 0.075
    const bayEnd = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay + 1]) - 0.075
    const paneMaterial = materials.glass.clone()
    paneMaterial.name = `Physical Glass Bay ${bay + 1}`
    paneMaterial.color.offsetHSL((bay % 3 - 1) * 0.002, 0, (bay % 4 - 1.5) * 0.006)
    paneMaterial.roughness = 0.07 + (bay % 3) * 0.008
    glassPanels.add(createGlassPanelVolume(spec, paneMaterial, bayStart, bayEnd, `GlassBay${bay + 1}`))
  }
  group.add(glassPanels)

  const mullionGeometry = new RoundedBoxGeometry(0.32, 1, 0.24, 2, 0.035)
  const mullions = new THREE.InstancedMesh(mullionGeometry, materials.glassFrame, bayStops.length)
  mullions.name = 'InstancedFacadeMullions'
  mullions.castShadow = true
  mullions.receiveShadow = true
  const mullionMatrix = new THREE.Matrix4()
  bayStops.forEach((stop, index) => {
    const z = THREE.MathUtils.lerp(startZ, endZ, stop)
    const top = facadeTopAt(spec, z)
    const height = top - spec.elevation
    mullionMatrix.compose(
      new THREE.Vector3(spec.position[0] - 0.045, spec.elevation + height / 2, z),
      new THREE.Quaternion(),
      new THREE.Vector3(1, height, 1),
    )
    mullions.setMatrixAt(index, mullionMatrix)
  })
  mullions.instanceMatrix.needsUpdate = true
  group.add(mullions)

  const transomCount = (bayStops.length - 1) * 2
  const transomGeometry = new RoundedBoxGeometry(0.25, 0.18, 1, 2, 0.025)
  const transoms = new THREE.InstancedMesh(transomGeometry, materials.glassFrame, transomCount)
  transoms.name = 'InstancedFacadeTransoms'
  transoms.castShadow = true
  transoms.receiveShadow = true
  let transomIndex = 0
  for (let bay = 0; bay < bayStops.length - 1; bay += 1) {
    const bayStart = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay])
    const bayEnd = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay + 1])
    ;[0.36, 0.69].forEach((heightRatio) => {
      const yStart = spec.elevation + (facadeTopAt(spec, bayStart) - spec.elevation) * heightRatio
      const yEnd = spec.elevation + (facadeTopAt(spec, bayEnd) - spec.elevation) * heightRatio
      transoms.setMatrixAt(transomIndex, beamMatrix(
        [spec.position[0] - 0.04, yStart, bayStart],
        [spec.position[0] - 0.04, yEnd, bayEnd],
      ))
      transomIndex += 1
    })
  }
  transoms.instanceMatrix.needsUpdate = true
  group.add(transoms)

  const topFrame = roundedBeamBetween(
    [spec.position[0] - 0.045, facadeTopAt(spec, startZ), startZ],
    [spec.position[0] - 0.045, facadeTopAt(spec, endZ), endZ],
    0.34,
    0.24,
    materials.glassFrame,
    'FacadeSlopedTopFrame',
  )
  group.add(topFrame)

  const bottomRail = roundedBox(0.34, 0.22, endZ - startZ, materials.glassFrame, 0.035, 3)
  bottomRail.name = 'FacadeBottomFrameAB'
  bottomRail.position.set(spec.position[0] - 0.045, spec.elevation + 0.02, (startZ + endZ) / 2)
  group.add(bottomRail)

  const bracketGeometry = new RoundedBoxGeometry(0.46, 0.28, 0.36, 2, 0.035)
  const brackets = new THREE.InstancedMesh(bracketGeometry, materials.wallTrim, bayStops.length)
  brackets.name = 'InstancedFacadeRoofBrackets'
  brackets.castShadow = true
  brackets.receiveShadow = true
  bayStops.forEach((stop, index) => {
    const z = THREE.MathUtils.lerp(startZ, endZ, stop)
    const top = facadeTopAt(spec, z)
    const matrix = new THREE.Matrix4().makeTranslation(spec.position[0] - 0.19, top + 0.09, z)
    brackets.setMatrixAt(index, matrix)
  })
  brackets.instanceMatrix.needsUpdate = true
  group.add(brackets)

  const cornerPlate = roundedBox(0.5, 0.16, 0.5, materials.glassFrame, 0.04, 3)
  cornerPlate.name = 'FacadeWall2CornerPlate'
  cornerPlate.position.set(spec.position[0], spec.elevation + 0.12, endZ)
  group.add(cornerPlate)
  return group
}

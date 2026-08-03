import * as THREE from 'three'
import { shellGeometry } from '../config/studioConfig'
import { createTriangle } from './studioGeometry'

function beamBetween(start, end, thickness, material, name = '') {
  const startPoint = new THREE.Vector3(...start)
  const endPoint = new THREE.Vector3(...end)
  const direction = endPoint.clone().sub(startPoint)
  const length = direction.length()
  const beam = new THREE.Mesh(new THREE.BoxGeometry(thickness, thickness, length), material)
  beam.name = name
  beam.position.copy(startPoint).add(endPoint).multiplyScalar(0.5)
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize())
  beam.castShadow = true
  beam.receiveShadow = true
  return beam
}

function lerpPoint(start, end, amount) {
  return new THREE.Vector3(...start).lerp(new THREE.Vector3(...end), amount).toArray()
}

export function createGlassFacade(materials) {
  const group = new THREE.Group()
  group.name = 'Face1GlassFacade'
  group.userData.structureName = 'Face 1 / Smaller glass triangle converging at apex'

  const floorBase = shellGeometry.wall1Extent.basePosition
  const roofBase = [floorBase[0], shellGeometry.wall1Extent.baseHeight, floorBase[2]]
  const apex = shellGeometry.apexPosition

  const glass = createTriangle(
    [floorBase, roofBase, apex],
    materials.glass,
    { name: 'Face1ApexGlassSurface', castShadow: false },
  )
  glass.renderOrder = 2
  group.add(glass)

  group.add(beamBetween(floorBase, roofBase, 0.3, materials.glassFrame, 'Wall1EntranceEdge'))
  group.add(beamBetween(roofBase, apex, 0.3, materials.glassFrame, 'Wall1RoofEdge'))
  group.add(beamBetween(apex, floorBase, 0.3, materials.glassFrame, 'Wall1FloorEdge'))

  ;[0.18, 0.36, 0.54, 0.72, 0.88].forEach((ratio, index) => {
    const basePoint = lerpPoint(floorBase, roofBase, ratio)
    group.add(beamBetween(basePoint, apex, 0.19, materials.glassFrame, `Wall1ApexMullion${index + 1}`))
  })

  ;[0.32, 0.62].forEach((ratio, index) => {
    const floorSide = lerpPoint(floorBase, apex, ratio)
    const roofSide = lerpPoint(roofBase, apex, ratio)
    group.add(beamBetween(floorSide, roofSide, 0.17, materials.glassFrame, `Wall1CrossRail${index + 1}`))
  })

  return group
}

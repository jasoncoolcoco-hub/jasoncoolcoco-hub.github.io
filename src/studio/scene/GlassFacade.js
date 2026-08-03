import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'
import { createSurface, roofHeightAt } from './studioGeometry'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
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

function createSlopedRail(spec, material, zStart, zEnd, heightRatio = 1) {
  const yStart = spec.elevation + (facadeTopAt(spec, zStart) - spec.elevation) * heightRatio
  const yEnd = spec.elevation + (facadeTopAt(spec, zEnd) - spec.elevation) * heightRatio
  const deltaY = yEnd - yStart
  const deltaZ = zEnd - zStart
  const rail = box(0.28, 0.17, Math.hypot(deltaZ, deltaY), material)
  rail.position.set(spec.position[0] - 0.035, (yStart + yEnd) / 2, (zStart + zEnd) / 2)
  rail.rotation.x = -Math.atan2(deltaY, deltaZ)
  return rail
}

export function createGlassFacade(materials) {
  const spec = studioLayout.glassFacade
  const group = new THREE.Group()
  group.name = 'Face1GlassFacade'
  group.userData.structureName = 'Face 1 / Glass Facade'

  const startZ = spec.position[2] - spec.depth / 2
  const endZ = startZ + spec.depth
  const exterior = createFacadePanel(
    spec,
    materials.darkExterior,
    spec.position[0] - 0.74,
    startZ,
    endZ,
    -0.1,
    'SlopedExteriorVoid',
  )
  group.add(exterior)

  const bayStops = [0, 0.075, 0.16, 0.25, 0.35, 0.46, 0.58, 0.7, 0.81, 0.91, 1]

  for (let bay = 0; bay < bayStops.length - 1; bay += 1) {
    const bayStart = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay])
    const bayEnd = THREE.MathUtils.lerp(startZ, endZ, bayStops[bay + 1])
    const pane = createFacadePanel(
      spec,
      materials.glass,
      spec.position[0],
      bayStart + 0.1,
      bayEnd - 0.1,
      0.12,
      `TriangularWedgeGlassBay${bay + 1}`,
    )
    pane.renderOrder = 2
    group.add(pane)

    ;[0.35, 0.68, 1].forEach((heightRatio) => {
      group.add(createSlopedRail(spec, materials.glassFrame, bayStart, bayEnd, heightRatio))
    })
  }

  bayStops.forEach((stop, index) => {
    const z = THREE.MathUtils.lerp(startZ, endZ, stop)
    const top = facadeTopAt(spec, z)
    const height = top - spec.elevation
    const mullion = box(0.3, height, 0.19, materials.glassFrame)
    mullion.position.set(spec.position[0] - 0.04, spec.elevation + height / 2, z)
    mullion.userData.structureName = `Sloped Glass Mullion ${index + 1}`
    group.add(mullion)

    const bracket = box(0.4, 0.34, 0.42, materials.displayWall)
    bracket.position.set(spec.position[0] - 0.2, top + 0.12, z)
    group.add(bracket)
  })

  const bottomRail = box(0.3, 0.18, spec.depth, materials.glassFrame)
  bottomRail.position.set(spec.position[0] - 0.04, spec.elevation, spec.position[2])
  group.add(bottomRail)
  return group
}

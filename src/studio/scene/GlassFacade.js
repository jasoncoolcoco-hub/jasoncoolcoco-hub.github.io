import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function topHeightAt(spec, z) {
  const startZ = spec.position[2] - spec.depth / 2
  const ratio = THREE.MathUtils.clamp((z - startZ) / spec.depth, 0, 1)
  return THREE.MathUtils.lerp(spec.topFront, spec.topRear, ratio)
}

function createFacadeSurface(spec, material, x, zStart, zEnd, bottomOffset = 0) {
  const bottom = spec.elevation + bottomOffset
  const positions = [
    x, bottom, zStart,
    x, bottom, zEnd,
    x, topHeightAt(spec, zEnd), zEnd,
    x, topHeightAt(spec, zStart), zStart,
  ]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  const surface = new THREE.Mesh(geometry, material)
  surface.receiveShadow = true
  return surface
}

function createSlopedRail(spec, material, zStart, zEnd, heightRatio = 1) {
  const yStart = spec.elevation + (topHeightAt(spec, zStart) - spec.elevation) * heightRatio
  const yEnd = spec.elevation + (topHeightAt(spec, zEnd) - spec.elevation) * heightRatio
  const deltaY = yEnd - yStart
  const deltaZ = zEnd - zStart
  const rail = box(0.26, 0.17, Math.hypot(deltaZ, deltaY), material)
  rail.position.set(spec.position[0] - 0.035, (yStart + yEnd) / 2, (zStart + zEnd) / 2)
  rail.rotation.x = -Math.atan2(deltaY, deltaZ)
  return rail
}

export function createGlassFacade(materials) {
  const spec = studioLayout.glassFacade
  const group = new THREE.Group()
  group.name = 'GlassFacade'
  group.userData.structureName = 'Glass Facade'

  const startZ = spec.position[2] - spec.depth / 2
  const endZ = startZ + spec.depth
  const exterior = createFacadeSurface(
    spec,
    materials.darkExterior,
    spec.position[0] - 0.72,
    startZ - 0.65,
    endZ + 0.65,
    -0.08,
  )
  group.add(exterior)

  const bayCount = spec.bayCount
  const bayDepth = spec.depth / bayCount

  for (let bay = 0; bay < bayCount; bay += 1) {
    const paneStart = startZ + bayDepth * bay + 0.1
    const paneEnd = startZ + bayDepth * (bay + 1) - 0.1
    const pane = createFacadeSurface(spec, materials.glass, spec.position[0], paneStart, paneEnd, 0.12)
    pane.renderOrder = 2
    group.add(pane)

    const mullionZ = startZ + bayDepth * bay
    const mullionTop = topHeightAt(spec, mullionZ)
    const mullionHeight = mullionTop - spec.elevation
    const mullion = box(0.28, mullionHeight, 0.18, materials.glassFrame)
    mullion.position.set(spec.position[0] - 0.035, spec.elevation + mullionHeight / 2, mullionZ)
    group.add(mullion)
  }

  const endMullionHeight = topHeightAt(spec, endZ) - spec.elevation
  const endMullion = box(0.28, endMullionHeight, 0.18, materials.glassFrame)
  endMullion.position.set(spec.position[0] - 0.035, spec.elevation + endMullionHeight / 2, endZ)
  group.add(endMullion)

  const bottomRail = box(0.28, 0.17, spec.depth, materials.glassFrame)
  bottomRail.position.set(spec.position[0] - 0.035, spec.elevation, spec.position[2])
  group.add(bottomRail)

  for (let bay = 0; bay < bayCount; bay += 1) {
    const bayStart = startZ + bayDepth * bay
    const bayEnd = bayStart + bayDepth
    ;[0.34, 0.67, 1].forEach((heightRatio) => {
      group.add(createSlopedRail(spec, materials.glassFrame, bayStart, bayEnd, heightRatio))
    })
  }

  for (let bay = 0; bay <= bayCount; bay += 1) {
    const bracket = box(0.38, 0.32, 0.38, materials.displayWall)
    const bracketZ = startZ + bayDepth * bay
    bracket.position.set(spec.position[0] - 0.2, topHeightAt(spec, bracketZ) + 0.2, bracketZ)
    group.add(bracket)
  }

  return group
}

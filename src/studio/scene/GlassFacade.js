import * as THREE from 'three'
import { studioLayout } from '../config/studioConfig'

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export function createGlassFacade(materials) {
  const spec = studioLayout.glassFacade
  const group = new THREE.Group()
  group.name = 'GlassFacade'
  group.userData.structureName = 'Glass Facade'

  const exterior = box(0.18, spec.height + 1.2, spec.depth + 1.2, materials.darkExterior)
  exterior.position.set(spec.position[0] - 0.52, spec.position[1], spec.position[2])
  group.add(exterior)

  const bayCount = 8
  const bayDepth = spec.depth / bayCount
  const startZ = spec.position[2] - spec.depth / 2
  const glassGeometry = new THREE.PlaneGeometry(bayDepth - 0.16, spec.height - 0.28)
  glassGeometry.rotateY(Math.PI / 2)

  for (let bay = 0; bay < bayCount; bay += 1) {
    const pane = new THREE.Mesh(glassGeometry, materials.glass)
    pane.position.set(spec.position[0], spec.position[1], startZ + bayDepth * (bay + 0.5))
    pane.renderOrder = 2
    group.add(pane)

    const mullion = box(0.24, spec.height + 0.2, 0.16, materials.glassFrame)
    mullion.position.set(spec.position[0] - 0.03, spec.position[1], startZ + bayDepth * bay)
    group.add(mullion)
  }

  const endMullion = box(0.24, spec.height + 0.2, 0.16, materials.glassFrame)
  endMullion.position.set(spec.position[0] - 0.03, spec.position[1], startZ + spec.depth)
  group.add(endMullion)

  ;[0.25, 0.56, 0.99].forEach((heightRatio) => {
    const rail = box(0.24, 0.15, spec.depth, materials.glassFrame)
    rail.position.set(
      spec.position[0] - 0.03,
      spec.elevation + spec.height * heightRatio,
      spec.position[2],
    )
    group.add(rail)
  })

  for (let bay = 0; bay <= bayCount; bay += 1) {
    const bracket = box(0.38, 0.32, 0.38, materials.displayWall)
    bracket.position.set(spec.position[0] - 0.2, spec.height + 0.32, startZ + bayDepth * bay)
    group.add(bracket)
  }

  return group
}

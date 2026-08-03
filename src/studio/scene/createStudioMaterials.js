import * as THREE from 'three'
import { studioMaterials } from '../config/studioConfig'
import { createArchitecturalTextureSet, createTimberTextureSet } from './proceduralTextures'

function texturedStandardMaterial(name, config, textureSet, options = {}) {
  const aoMap = textureSet.bumpMap.clone()
  aoMap.name = `${name} ambient occlusion ${textureSet.size}`
  aoMap.channel = 1
  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: config.roughness,
    metalness: config.metalness ?? 0,
    map: textureSet.map,
    roughnessMap: textureSet.roughnessMap,
    bumpMap: textureSet.bumpMap,
    bumpScale: options.bumpScale ?? 0.018,
    aoMap,
    aoMapIntensity: options.aoMapIntensity ?? 0.14,
    ...options.material,
  })
  material.name = name
  material.userData.textureSize = textureSet.size
  material.userData.realisticMaterial = true
  return material
}

export function createStudioMaterials() {
  const concreteTextures = createArchitecturalTextureSet({
    name: 'warm mineral floor',
    baseColor: '#9a907e',
    seed: 410,
    repeat: [7, 4.5],
    grain: 12,
    blotches: 18,
    roughnessBase: 235,
    roughnessSpread: 18,
    bumpSpread: 16,
  })
  const wallTextures = createArchitecturalTextureSet({
    name: 'warm plaster wall',
    baseColor: '#bbb4a9',
    seed: 733,
    repeat: [8, 3],
    grain: 6,
    blotches: 14,
    roughnessBase: 238,
    roughnessSpread: 12,
    bumpSpread: 12,
  })
  const roofTextures = createArchitecturalTextureSet({
    name: 'warm roof concrete',
    baseColor: '#8d7764',
    seed: 990,
    repeat: [5, 4],
    grain: 8,
    blotches: 22,
    roughnessBase: 226,
    roughnessSpread: 18,
    bumpSpread: 14,
  })
  const timberTextures = createTimberTextureSet(1024)

  const materialSet = {
    concrete: texturedStandardMaterial('Mineral Floor', studioMaterials.concrete, concreteTextures, {
      bumpScale: 0.022,
      aoMapIntensity: 0.13,
    }),
    deepFloor: texturedStandardMaterial('Warm Plaster Wall', studioMaterials.deepFloor, wallTextures, {
      bumpScale: 0.012,
      aoMapIntensity: 0.16,
    }),
    ceiling: texturedStandardMaterial('Warm Concrete Roof', studioMaterials.ceiling, roofTextures, {
      bumpScale: 0.014,
      aoMapIntensity: 0.12,
      material: { side: THREE.DoubleSide },
    }),
    timber: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.86,
      metalness: 0,
      map: timberTextures.map,
      roughnessMap: timberTextures.roughnessMap,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: studioMaterials.glass.color,
      roughness: studioMaterials.glass.roughness,
      metalness: 0,
      transmission: 0.9,
      thickness: 0.08,
      ior: 1.47,
      attenuationColor: new THREE.Color('#91a8a7'),
      attenuationDistance: 16,
      specularIntensity: 0.72,
      specularColor: new THREE.Color('#d9e9e7'),
      transparent: true,
      opacity: studioMaterials.glass.opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    glassFrame: new THREE.MeshStandardMaterial({
      color: studioMaterials.glassFrame.color,
      roughness: studioMaterials.glassFrame.roughness,
      metalness: studioMaterials.glassFrame.metalness,
    }),
    ceilingEdge: new THREE.MeshStandardMaterial({
      color: studioMaterials.ceilingEdge.color,
      roughness: studioMaterials.ceilingEdge.roughness,
      metalness: 0.04,
    }),
    wallTrim: new THREE.MeshStandardMaterial({ color: '#aaa296', roughness: 0.82, metalness: 0.03 }),
    floorJoint: new THREE.MeshStandardMaterial({ color: '#665e54', roughness: 0.9, metalness: 0 }),
    roofJoint: new THREE.LineBasicMaterial({ color: '#4d4239', transparent: true, opacity: 0.2 }),
    darkExterior: new THREE.MeshStandardMaterial({
      color: studioMaterials.darkExterior.color,
      roughness: 0.92,
      metalness: 0,
      emissive: '#071318',
      emissiveIntensity: 0.12,
      side: THREE.DoubleSide,
    }),
    paleFloor: new THREE.MeshStandardMaterial(studioMaterials.paleFloor),
    displayWall: new THREE.MeshStandardMaterial(studioMaterials.displayWall),
    canopy: new THREE.MeshStandardMaterial({ ...studioMaterials.canopy, side: THREE.DoubleSide }),
    redCurtain: new THREE.MeshStandardMaterial({ ...studioMaterials.redCurtain, side: THREE.DoubleSide }),
    rearCurtain: new THREE.MeshStandardMaterial({ ...studioMaterials.rearCurtain, side: THREE.DoubleSide }),
    stage: new THREE.MeshStandardMaterial(studioMaterials.stage),
    stageSeam: new THREE.LineBasicMaterial({ color: studioMaterials.stageSeam.color, transparent: true, opacity: 0.52 }),
    column: new THREE.MeshStandardMaterial(studioMaterials.column),
    stair: new THREE.MeshStandardMaterial(studioMaterials.stair),
  }

  materialSet.timber.name = 'Staggered Timber Boards'
  materialSet.timber.userData.textureSize = timberTextures.size
  materialSet.glass.name = 'Physical Curtain Wall Glass'
  materialSet.glass.userData.realisticMaterial = true
  materialSet.glassFrame.name = 'Bevelled Curtain Wall Aluminium'
  materialSet.__textureSizes = {
    floor: concreteTextures.size,
    wall: wallTextures.size,
    roof: roofTextures.size,
    timber: timberTextures.size,
  }
  return materialSet
}

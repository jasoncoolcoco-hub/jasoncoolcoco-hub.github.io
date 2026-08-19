import * as THREE from 'three'
import {
  STUDIO_V2_EXTERIOR_DAYLIGHT,
  STUDIO_V2_MATERIAL_TUNING,
} from './studioV2Config'

const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'alphaMap',
]

function rounded(value) {
  return Number(value.toFixed(3))
}

function textureRecord(texture) {
  if (!texture?.isTexture) return null
  const image = texture.image
  return {
    width: image?.width ?? image?.videoWidth ?? null,
    height: image?.height ?? image?.videoHeight ?? null,
    anisotropy: texture.anisotropy,
    colorSpace: texture.colorSpace,
    source: texture.source?.data?.src || image?.currentSrc || image?.src || null,
  }
}

export function materialRecord(material) {
  if (!material?.isMaterial) return null
  return {
    name: material.name || 'UNNAMED',
    type: material.type,
    color: material.color?.getHexString ? `#${material.color.getHexString()}` : null,
    metalness: typeof material.metalness === 'number' ? rounded(material.metalness) : null,
    roughness: typeof material.roughness === 'number' ? rounded(material.roughness) : null,
    opacity: rounded(material.opacity),
    transparent: material.transparent,
    toneMapped: material.toneMapped,
    vertexColors: material.vertexColors,
    emissive: material.emissive?.getHexString ? `#${material.emissive.getHexString()}` : null,
    emissiveIntensity: typeof material.emissiveIntensity === 'number' ? rounded(material.emissiveIntensity) : null,
    envMapIntensity: typeof material.envMapIntensity === 'number' ? rounded(material.envMapIntensity) : null,
    normalScale: material.normalScale?.isVector2
      ? material.normalScale.toArray().map(rounded)
      : null,
    maps: Object.fromEntries(
      TEXTURE_KEYS
        .map((key) => [key, textureRecord(material[key])])
        .filter(([, value]) => value),
    ),
  }
}

function preserveOriginal(material) {
  if (material.userData.studioV2OriginalMaterial) return material.userData.studioV2OriginalMaterial
  const original = materialRecord(material)
  material.userData.studioV2OriginalMaterial = original
  return original
}

function cloneMaterialVariant(source, name) {
  const original = preserveOriginal(source)
  const variant = source.clone()
  variant.name = name
  variant.userData.studioV2OriginalMaterial = original
  return variant
}

function componentRecords(geometry, matrixWorld) {
  const index = geometry.index
  const position = geometry.getAttribute('position')
  if (!index || !position) return []

  const parent = Array.from({ length: position.count }, (_, vertexIndex) => vertexIndex)
  const find = (vertexIndex) => {
    let current = vertexIndex
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]]
      current = parent[current]
    }
    return current
  }
  const union = (a, b) => {
    const rootA = find(a)
    const rootB = find(b)
    if (rootA !== rootB) parent[rootB] = rootA
  }

  for (let offset = 0; offset < index.count; offset += 3) {
    const a = index.getX(offset)
    const b = index.getX(offset + 1)
    const c = index.getX(offset + 2)
    union(a, b)
    union(a, c)
  }

  const components = new Map()
  const vertex = new THREE.Vector3()
  for (let offset = 0; offset < index.count; offset += 3) {
    const triangle = [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)]
    const root = find(triangle[0])
    if (!components.has(root)) {
      components.set(root, { indices: [], vertices: new Set(), bounds: new THREE.Box3() })
    }
    const component = components.get(root)
    component.indices.push(...triangle)
    triangle.forEach((vertexIndex) => component.vertices.add(vertexIndex))
  }

  return [...components.values()].map((component) => {
    component.vertices.forEach((vertexIndex) => {
      vertex.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrixWorld)
      component.bounds.expandByPoint(vertex)
    })
    return {
      bounds: component.bounds,
      center: component.bounds.getCenter(new THREE.Vector3()),
      indices: component.indices,
      size: component.bounds.getSize(new THREE.Vector3()),
      triangles: component.indices.length / 3,
    }
  })
}

function partitionConnectedComponents(object, variantNames, classify) {
  const source = Array.isArray(object.material) ? object.material[0] : object.material
  if (!source?.isMaterial || !object.geometry?.index) return null
  const components = componentRecords(object.geometry, object.matrixWorld)
  if (!components.length) return null

  const buckets = new Map(variantNames.map((name) => [name, []]))
  const counts = new Map(variantNames.map((name) => [name, 0]))
  components.forEach((component) => {
    const variantName = classify(component)
    const bucket = buckets.get(variantName) ?? buckets.get(variantNames[0])
    component.indices.forEach((indexValue) => bucket.push(indexValue))
    counts.set(variantName, (counts.get(variantName) ?? 0) + 1)
  })

  const geometry = object.geometry.clone()
  const combinedIndices = []
  const materials = []
  geometry.clearGroups()
  variantNames.forEach((variantName) => {
    const indices = buckets.get(variantName)
    if (!indices?.length) return
    const start = combinedIndices.length
    indices.forEach((indexValue) => combinedIndices.push(indexValue))
    geometry.addGroup(start, indices.length, materials.length)
    materials.push(cloneMaterialVariant(source, variantName))
  })
  geometry.setIndex(combinedIndices)
  object.geometry = geometry
  object.material = materials
  return {
    mesh: object.name,
    sourceMaterial: source.name,
    components: components.length,
    groups: Object.fromEntries([...counts].filter(([, count]) => count > 0)),
  }
}

function splitStudioV2Materials(root) {
  const segmentation = []
  root.updateWorldMatrix(true, true)
  root.traverse((object) => {
    if (!object.isMesh || !object.visible) return
    const source = Array.isArray(object.material) ? object.material[0] : object.material
    if (!source?.isMaterial) return

    if (object.name === 'Cube_Material.003_0' && source.name === 'Material.003') {
      const result = partitionConnectedComponents(
        object,
        ['StudioV2LightTimber', 'StudioV2KitchenTimber', 'StudioV2DarkCeilingTimber'],
        ({ center, size }) => {
          if (center.y >= 4 && size.y <= 0.12) return 'StudioV2DarkCeilingTimber'
          if (center.x >= 6 && center.y < 4) return 'StudioV2KitchenTimber'
          return 'StudioV2LightTimber'
        },
      )
      if (result) segmentation.push(result)
      return
    }

    const objectVariant = {
      Cube004_Material003_0: 'StudioV2IslandTimber',
      Cylinder_Material003_0: 'StudioV2StoolTimber',
      'Cylinder_����������_������_0': 'StudioV2StoolLegMetal',
      Cube003_Material008_0: 'StudioV2IslandPainted',
    }[object.name]
    const expectedSource = {
      StudioV2IslandTimber: 'Material.003',
      StudioV2StoolTimber: 'Material.003',
      StudioV2StoolLegMetal: 'material',
      StudioV2IslandPainted: 'Material.008',
    }[objectVariant]
    if (objectVariant && (source.name === expectedSource || source.name === objectVariant)) {
      if (source.name === expectedSource) object.material = cloneMaterialVariant(source, objectVariant)
      segmentation.push({
        mesh: object.name,
        sourceMaterial: source.name,
        components: null,
        groups: { [objectVariant]: 1 },
      })
      return
    }

    if (
      (object.name === 'Cube.002_Material.004_0' || object.name === 'Cube.007_Material.004_0')
      && source.name === 'Material.004'
    ) {
      const objectBounds = new THREE.Box3().setFromObject(object)
      const result = partitionConnectedComponents(
        object,
        ['StudioV2CoffeeTableTop', 'StudioV2CoffeeTableFrame'],
        ({ center }) => (
          center.y >= objectBounds.max.y - 0.15
            ? 'StudioV2CoffeeTableTop'
            : 'StudioV2CoffeeTableFrame'
        ),
      )
      if (result) segmentation.push(result)
      return
    }

    if (
      (object.name === 'node_0.001_Material.006_0' || object.name === 'node_0001_Material006_0')
      && source.name === 'Material.006'
    ) {
      const result = partitionConnectedComponents(
        object,
        [
          'StudioV2KitchenPainted',
          'StudioV2KitchenMetal',
          'StudioV2KitchenHandle',
          'StudioV2KitchenKnob',
          'StudioV2KitchenOvenControl',
          'StudioV2KitchenOvenHandle',
          'StudioV2KitchenAppliance',
          'StudioV2KitchenGlass',
        ],
        ({ center, size, triangles }) => {
          const dimensions = size.toArray().sort((a, b) => a - b)
          const [smallest, middle, longest] = dimensions
          const thin = smallest <= 0.09
          const handleLike = center.x >= 5.28 && center.x <= 5.96
            && size.z >= 0.18 && size.z <= 0.34
            && size.x <= 0.1 && size.y <= 0.085
            && triangles >= 8
          const ovenKnob = center.x >= 5.28 && center.x <= 5.46
            && center.y >= 1.24 && center.y <= 1.47
            && center.z >= -2.35 && center.z <= -1.42
            && longest >= 0.03 && longest <= 0.14
            && triangles >= 8
          const ovenControlBand = center.x >= 5.26 && center.x <= 5.47
            && center.y >= 1 && center.y <= 1.48
            && center.z >= -2.4 && center.z <= -1.25
          const ovenHandle = center.x >= 5.28 && center.x <= 5.46
            && center.y >= 1.1 && center.y <= 1.25
            && center.z >= -2.35 && center.z <= -1.3
            && size.x <= 0.12 && size.y <= 0.13 && size.z >= 0.35
            && triangles >= 8
          const worktopPart = center.y >= 1.25 && center.y <= 1.78 && longest <= 1.45 && thin
          const ovenGlass = center.x <= 5.5
            && center.y >= 0.65 && center.y <= 1.18
            && center.z >= -2.1 && center.z <= -1.5
            && smallest <= 0.06 && middle >= 0.35 && longest >= 0.55
          const ovenZone = center.z >= -2.4 && center.z <= -1.45
            && center.y >= 0.3 && center.y <= 1.48 && longest <= 1.25 && thin
          if (ovenGlass) return 'StudioV2KitchenGlass'
          if (ovenKnob) return 'StudioV2KitchenKnob'
          if (ovenHandle) return 'StudioV2KitchenOvenHandle'
          if (ovenControlBand) return 'StudioV2KitchenOvenControl'
          if (triangles <= 8) return 'StudioV2KitchenPainted'
          if (handleLike) return 'StudioV2KitchenHandle'
          if (ovenZone) return 'StudioV2KitchenAppliance'
          if (worktopPart) return 'StudioV2KitchenMetal'
          return 'StudioV2KitchenPainted'
        },
      )
      if (result) segmentation.push(result)
    }
  })
  return segmentation
}

function applyTuning(material, tuning) {
  if (tuning.color && material.color?.isColor) material.color.set(tuning.color)
  if (typeof tuning.metalness === 'number' && 'metalness' in material) material.metalness = tuning.metalness
  if (typeof tuning.roughness === 'number' && 'roughness' in material) material.roughness = tuning.roughness
  if (typeof tuning.envMapIntensity === 'number' && 'envMapIntensity' in material) {
    material.envMapIntensity = tuning.envMapIntensity
  }
  if (typeof tuning.normalScale === 'number' && material.normalScale?.isVector2) {
    material.normalScale.setScalar(tuning.normalScale)
  }
  material.needsUpdate = true
}

const STUDIO_V2_CABINET_SEAM_BACKINGS = [
  // Upper cabinet doors on the kitchen wall.
  { axis: 'vertical', x: 5.93, y: 2.953, z: -3.357, length: 1.23 },
  { axis: 'vertical', x: 5.93, y: 2.953, z: -2.34, length: 1.23 },
  { axis: 'vertical', x: 5.93, y: 2.953, z: -1.31, length: 1.23 },
  // Lower cabinet doors and drawer columns.
  { axis: 'vertical', x: 5.42, y: 0.849, z: -3.331, length: 1.18 },
  { axis: 'vertical', x: 5.42, y: 0.849, z: -2.34, length: 1.18 },
  { axis: 'vertical', x: 5.42, y: 0.849, z: -1.31, length: 1.18 },
  { axis: 'horizontal', x: 5.42, y: 0.732, z: -0.81, length: 1.01 },
  { axis: 'horizontal', x: 5.42, y: 1.227, z: -0.81, length: 1.01 },
  // Tall cabinet split lines.
  { axis: 'vertical', x: 5.42, y: 2.51, z: 0.235, length: 2.11 },
  { axis: 'horizontal', x: 5.42, y: 1.449, z: -0.035, length: 0.53 },
  { axis: 'horizontal', x: 5.42, y: 1.449, z: 0.755, length: 0.53 },
  // Rear white cabinet row directly below the timber countertop.
  { axis: 'horizontal', x: 5.46, y: 1.455, z: 2.26, length: 2.04 },
]

function createKitchenCabinetSeamBackings(root) {
  const seamMaterial = new THREE.MeshBasicMaterial({
    color: '#111110',
    depthWrite: true,
    fog: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  seamMaterial.name = 'StudioV2KitchenSeamBacking'
  const group = new THREE.Group()
  group.name = 'StudioV2KitchenSeamBackings'
  group.renderOrder = -1
  const seamWidth = 0.026
  STUDIO_V2_CABINET_SEAM_BACKINGS.forEach((seam, index) => {
    const width = seam.axis === 'vertical' ? seamWidth : seam.length
    const height = seam.axis === 'vertical' ? seam.length : seamWidth
    const backing = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      seamMaterial,
    )
    backing.name = `StudioV2KitchenSeamBacking_${index + 1}`
    backing.position.set(seam.x, seam.y, seam.z)
    backing.rotation.y = Math.PI / 2
    backing.castShadow = false
    backing.receiveShadow = false
    group.add(backing)
  })
  root.add(group)
  return {
    count: group.children.length,
    minimumDepthOffset: 0.025,
    width: seamWidth,
  }
}

export function applyStudioV2MaterialTuning(root, renderer) {
  const materials = new Map()
  const materialMeshes = new Map()
  const textures = new Set()
  const report = []
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  const segmentation = splitStudioV2Materials(root)
  const cabinetSeamBackings = createKitchenCabinetSeamBackings(root)

  root.traverse((object) => {
    if (!object.isMesh || !object.visible) return
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      if (!material?.isMaterial) return
      materials.set(material.uuid, material)
      if (!materialMeshes.has(material)) materialMeshes.set(material, new Set())
      materialMeshes.get(material).add(object.name)
      TEXTURE_KEYS.forEach((key) => {
        const texture = material[key]
        if (!texture?.isTexture || textures.has(texture)) return
        textures.add(texture)
        texture.anisotropy = maxAnisotropy
        texture.needsUpdate = true
      })
    })
  })

  materials.forEach((material) => {
    const name = material.name
    const tuning = STUDIO_V2_MATERIAL_TUNING[name]
    if (!tuning) return
    const previous = preserveOriginal(material)
    applyTuning(material, tuning)
    report.push({
      category: tuning.category,
      name,
      meshes: [...(materialMeshes.get(material) ?? [])],
      previous,
      current: materialRecord(material),
    })
  })

  return {
    anisotropy: maxAnisotropy,
    materials,
    report,
    segmentation,
    cabinetSeamBackings,
  }
}

export function findStudioV2EnvironmentMesh(root, audit) {
  const candidates = []
  const knownNames = new Set(audit?.environmentMeshes ?? [])

  root.traverse((object) => {
    if (!object.isMesh || !object.material) return
    const material = Array.isArray(object.material) ? object.material[0] : object.material
    const texture = material?.map || material?.emissiveMap
    const image = texture?.image
    const width = image?.width ?? image?.videoWidth ?? 0
    const height = image?.height ?? image?.videoHeight ?? 0
    const bounds = new THREE.Box3().setFromObject(object)
    const size = new THREE.Vector3()
    bounds.getSize(size)
    const diagonal = size.length()
    const nameSignal = /sphere|environment|panorama|sky/i.test(`${object.name} ${material?.name ?? ''}`)
    const auditSignal = knownNames.has(object.name)
    const panoramaSignal = width >= 2048 && width / Math.max(1, height) >= 1.8
    const sizeSignal = diagonal >= 24
    const score = [nameSignal, auditSignal, panoramaSignal, sizeSignal].filter(Boolean).length
    if (score >= 2 && texture) {
      candidates.push({ object, material, texture, score, diagonal, width, height })
    }
  })

  return candidates.sort((a, b) => b.score - a.score || b.diagonal - a.diagonal)[0] ?? null
}

export function tuneStudioV2ExteriorDaylight(candidate) {
  const material = candidate?.material
  if (!candidate?.object?.isMesh || !material?.isMaterial) return null

  const previous = preserveOriginal(material)
  applyTuning(material, STUDIO_V2_EXTERIOR_DAYLIGHT)
  if (material.emissive?.isColor) material.emissive.set(STUDIO_V2_EXTERIOR_DAYLIGHT.emissive)
  if (typeof material.emissiveIntensity === 'number') {
    material.emissiveIntensity = STUDIO_V2_EXTERIOR_DAYLIGHT.emissiveIntensity
  }
  material.needsUpdate = true
  candidate.object.castShadow = false
  candidate.object.receiveShadow = false

  return {
    mesh: candidate.object.name,
    previous,
    current: materialRecord(material),
    strategy: 'restrained emissive backdrop with neutral window-side daylight',
  }
}

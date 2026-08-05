import * as THREE from 'three'

function roundedVector(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(3)))
}

function boxRecord(box) {
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  return {
    min: roundedVector(box.min),
    max: roundedVector(box.max),
    size: roundedVector(size),
    center: roundedVector(center),
  }
}

export function auditStudioV2Model(root) {
  root.updateWorldMatrix(true, true)
  const fullBounds = new THREE.Box3()
  const meshRecords = []
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry || !object.visible) return
    const bounds = new THREE.Box3().setFromObject(object)
    const size = new THREE.Vector3()
    bounds.getSize(size)
    meshRecords.push({ bounds, diagonal: size.length(), name: object.name })
    fullBounds.union(bounds)
    geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      if (!material?.isMaterial) return
      materials.add(material)
      Object.values(material).forEach((value) => value?.isTexture && textures.add(value))
    })
  })

  meshRecords.sort((a, b) => b.diagonal - a.diagonal)
  const largest = meshRecords[0]
  const secondLargest = meshRecords[1]
  const environmentThreshold = Math.max(24, (secondLargest?.diagonal ?? 0) * 1.7)
  const environmentMeshes = new Set(
    meshRecords
      .filter((record) => record.diagonal >= environmentThreshold)
      .map((record) => record.name),
  )
  if (environmentMeshes.size === 0 && largest && largest.diagonal > 24) {
    environmentMeshes.add(largest.name)
  }

  const interiorBounds = new THREE.Box3()
  meshRecords.forEach((record) => {
    if (!environmentMeshes.has(record.name)) interiorBounds.union(record.bounds)
  })
  if (interiorBounds.isEmpty()) interiorBounds.copy(fullBounds)

  return {
    fullBounds,
    interiorBounds,
    fullBoundsRecord: boxRecord(fullBounds),
    interiorBoundsRecord: boxRecord(interiorBounds),
    environmentMeshes: [...environmentMeshes],
    meshes: meshRecords.length,
    geometries: geometries.size,
    materials: materials.size,
    textures: textures.size,
  }
}

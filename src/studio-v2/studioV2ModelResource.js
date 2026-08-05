import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

let resource = null

function disposeImportedModel(root) {
  const geometries = new Set()
  const materials = new Set()
  const textures = new Set()

  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      if (!material?.isMaterial) return
      materials.add(material)
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value)
      })
    })
  })

  textures.forEach((texture) => texture.dispose())
  materials.forEach((material) => material.dispose())
  geometries.forEach((geometry) => geometry.dispose())
}

function scheduleResourceCleanup(entry) {
  if (entry.refs > 0 || entry.cleanupTimer || !entry.settled) return
  entry.cleanupTimer = window.setTimeout(() => {
    if (entry.refs > 0 || resource !== entry) return
    if (entry.asset?.scene) disposeImportedModel(entry.asset.scene)
    resource = null
  }, 0)
}

function createResource(url) {
  const subscribers = new Set()
  const entry = {
    asset: null,
    cleanupTimer: null,
    error: null,
    refs: 0,
    settled: false,
    subscribers,
  }
  const loader = new GLTFLoader()
  entry.promise = new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        entry.asset = gltf
        entry.settled = true
        subscribers.forEach((subscriber) => subscriber(100))
        resolve(gltf)
        scheduleResourceCleanup(entry)
      },
      (event) => {
        const progress = event.total > 0 ? Math.min(99, (event.loaded / event.total) * 100) : 0
        subscribers.forEach((subscriber) => subscriber(progress))
      },
      (error) => {
        entry.error = error
        entry.settled = true
        reject(error)
        scheduleResourceCleanup(entry)
      },
    )
  })
  entry.promise.catch(() => {})
  return entry
}

export function acquireStudioV2Model(url, onProgress) {
  if (resource?.error && resource.refs === 0) {
    if (resource.cleanupTimer) window.clearTimeout(resource.cleanupTimer)
    resource = null
  }
  if (!resource) resource = createResource(url)
  const entry = resource
  if (entry.cleanupTimer) {
    window.clearTimeout(entry.cleanupTimer)
    entry.cleanupTimer = null
  }
  entry.refs += 1
  if (onProgress) entry.subscribers.add(onProgress)
  if (entry.asset && onProgress) onProgress(100)

  let released = false
  return {
    promise: entry.promise,
    release() {
      if (released) return
      released = true
      if (onProgress) entry.subscribers.delete(onProgress)
      entry.refs = Math.max(0, entry.refs - 1)
      scheduleResourceCleanup(entry)
    },
  }
}

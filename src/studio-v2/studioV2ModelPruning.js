import {
  STUDIO_V2_REMOVED_DINING_GROUPS,
  STUDIO_V2_REMOVED_WINDOW_DECORATION_GROUPS,
} from './studioV2Config'

function removeGroups(root, groups, label) {
  const targets = new Map(groups.map((entry) => [entry.name, entry]))
  const removed = []

  root.traverse((object) => {
    const target = targets.get(object.name)
    if (!target) return

    let meshCount = 0
    object.traverse((descendant) => {
      descendant.visible = false
      if (!descendant.isMesh) return
      descendant.castShadow = false
      descendant.receiveShadow = false
      meshCount += 1
    })

    removed.push({
      name: target.name,
      role: target.role,
      meshCount,
    })
  })

  const removedNames = new Set(removed.map((entry) => entry.name))
  const missing = groups
    .filter((entry) => !removedNames.has(entry.name))
    .map((entry) => entry.name)

  if (missing.length > 0) {
    throw new Error(`${label} removal targets were not found: ${missing.join(', ')}`)
  }

  return {
    removed,
    removedGroups: removed.length,
    removedMeshes: removed.reduce((total, entry) => total + entry.meshCount, 0),
  }
}

export function removeStudioV2DiningSet(root) {
  return removeGroups(root, STUDIO_V2_REMOVED_DINING_GROUPS, 'Dining-set')
}

export function removeStudioV2WindowDecoration(root) {
  return removeGroups(root, STUDIO_V2_REMOVED_WINDOW_DECORATION_GROUPS, 'Window decoration')
}

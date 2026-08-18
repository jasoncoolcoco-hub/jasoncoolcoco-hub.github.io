import { STUDIO_V2_TIER1_GLB_PATHS } from './studioV2AssetPaths.js'
import { studioV2AssetUrl } from './studioV2AssetUrl.js'

export function studioV2Tier1PreloadDescriptors(resolveUrl = studioV2AssetUrl) {
  return STUDIO_V2_TIER1_GLB_PATHS.map((path, index) => ({
    as: 'fetch',
    crossOrigin: 'anonymous',
    fetchPriority: index === 0 ? 'high' : 'auto',
    href: resolveUrl(path),
    id: `studio-v2-tier1-preload-${index}`,
    rel: 'preload',
    type: 'model/gltf-binary',
  }))
}

export function preloadStudioV2Tier1Assets(documentRef = globalThis.document) {
  if (!documentRef?.head) return []
  return studioV2Tier1PreloadDescriptors().map((descriptor) => {
    const existing = documentRef.getElementById(descriptor.id)
    if (existing) return existing
    const link = documentRef.createElement('link')
    Object.assign(link, descriptor)
    link.dataset.studioV2Tier1 = 'true'
    documentRef.head.append(link)
    return link
  })
}

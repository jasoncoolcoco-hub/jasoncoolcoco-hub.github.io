export const STUDIO_V2_ASSET_PATHS = Object.freeze({
  room: 'models/fred-studio-v2/optimised/meshopt/room_meshopt.glb',
  macbook: 'models/fred-studio-v2/optimised/meshopt/macbook_pro_2021_meshopt.glb',
  photoBoard: 'models/fred-studio-v2/objects/cork_board_clean.glb',
  photoManifest: 'studio-v2/photo-wall/manifest.json',
  polaroidCamera: 'models/fred-studio-v2/objects/polaroid_camera.glb',
  speaker: 'models/fred-studio-v2/objects/marshall_stanmore_iii.glb',
})

export const STUDIO_V2_TIER1_GLB_PATHS = Object.freeze([
  STUDIO_V2_ASSET_PATHS.room,
  STUDIO_V2_ASSET_PATHS.macbook,
])

export const STUDIO_V2_VISUAL_READY_GLB_PATHS = Object.freeze([
  STUDIO_V2_ASSET_PATHS.polaroidCamera,
])

export const STUDIO_V2_CDN_ASSET_PATHS = Object.freeze([
  ...STUDIO_V2_TIER1_GLB_PATHS,
  ...STUDIO_V2_VISUAL_READY_GLB_PATHS,
  STUDIO_V2_ASSET_PATHS.photoBoard,
  STUDIO_V2_ASSET_PATHS.photoManifest,
])

const studioV2CdnAssetPathSet = new Set(STUDIO_V2_CDN_ASSET_PATHS)

export function isStudioV2CdnAssetPath(path) {
  return studioV2CdnAssetPathSet.has(String(path ?? '').replace(/^\/+/, ''))
}

function trailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}

export function joinStudioV2AssetUrl(path, baseUrl = '/') {
  const normalizedPath = String(path ?? '').replace(/^\/+/, '')
  const normalizedBase = trailingSlash(String(baseUrl || '/').trim() || '/')
  return `${normalizedBase}${normalizedPath}`
}

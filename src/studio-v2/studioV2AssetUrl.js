import {
  isStudioV2CdnAssetPath,
  joinStudioV2AssetUrl,
} from './studioV2AssetPaths.js'

const viteEnvironment = import.meta.env ?? {}

export function studioV2AssetBaseUrl({
  assetBaseUrl = viteEnvironment.VITE_STUDIO_ASSET_BASE_URL,
  siteBaseUrl = viteEnvironment.BASE_URL,
} = {}) {
  return String(assetBaseUrl || siteBaseUrl || '/').trim() || '/'
}

function studioV2AssetCacheKey(options) {
  return String(
    options?.assetCacheKey ?? viteEnvironment.VITE_STUDIO_ASSET_CACHE_KEY ?? '',
  ).trim()
}

export function studioV2AssetUrl(path, options) {
  const siteBaseUrl = String(options?.siteBaseUrl || viteEnvironment.BASE_URL || '/').trim() || '/'
  const cdnAsset = isStudioV2CdnAssetPath(path)
  const baseUrl = cdnAsset
    ? studioV2AssetBaseUrl(options)
    : siteBaseUrl
  const url = joinStudioV2AssetUrl(path, baseUrl)
  const cacheKey = cdnAsset ? studioV2AssetCacheKey(options) : ''
  return cacheKey ? `${url}?stage5g2=${encodeURIComponent(cacheKey)}` : url
}

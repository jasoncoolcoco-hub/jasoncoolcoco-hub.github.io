import { STUDIO_V2_ASSET_PATHS } from './studioV2AssetPaths.js'
import { studioV2AssetUrl as assetUrl } from './studioV2AssetUrl.js'

export const STUDIO_V2_SOURCE_DELIVERY = Object.freeze({
  textures: 'source',
  meshCompression: 'off',
  loading: 'eager',
  selectiveShadows: false,
})

export const STUDIO_V2_OFFICIAL_DELIVERY = Object.freeze({
  textures: 'source',
  meshCompression: 'meshopt',
  loading: 'lazy',
  selectiveShadows: false,
})

export const STUDIO_V2_DERIVATIVE_OPTIONS = Object.freeze({
  textures: Object.freeze(['source', 'ktx2']),
  meshCompression: Object.freeze(['off', 'meshopt']),
  loading: Object.freeze(['eager', 'lazy']),
})

function validated(value, values, fallback) {
  return values.includes(value) ? value : fallback
}

export function createStudioV2DeliveryConfig(requested = {}, allowDerivatives = false) {
  const activeRequest = allowDerivatives ? requested : {}
  const textures = validated(
    activeRequest.textures,
    STUDIO_V2_DERIVATIVE_OPTIONS.textures,
    STUDIO_V2_OFFICIAL_DELIVERY.textures,
  )
  const meshCompression = validated(
    activeRequest.meshCompression,
    STUDIO_V2_DERIVATIVE_OPTIONS.meshCompression,
    STUDIO_V2_OFFICIAL_DELIVERY.meshCompression,
  )
  const loading = validated(
    activeRequest.loading,
    STUDIO_V2_DERIVATIVE_OPTIONS.loading,
    STUDIO_V2_OFFICIAL_DELIVERY.loading,
  )
  const selectiveShadows = allowDerivatives && Boolean(activeRequest.selectiveShadows)
  const officialDefault = textures === STUDIO_V2_OFFICIAL_DELIVERY.textures
    && meshCompression === STUDIO_V2_OFFICIAL_DELIVERY.meshCompression
    && loading === STUDIO_V2_OFFICIAL_DELIVERY.loading
    && !selectiveShadows

  const roomBase = textures === 'ktx2' ? 'room_ktx2' : 'room'
  const macbookBase = textures === 'ktx2' ? 'macbook_pro_2021_ktx2' : 'macbook_pro_2021'
  const roomUrl = meshCompression === 'meshopt'
    ? assetUrl(`models/fred-studio-v2/optimised/${textures === 'ktx2' ? 'ktx2-meshopt' : 'meshopt'}/${roomBase}_meshopt.glb`)
    : textures === 'ktx2'
      ? assetUrl('models/fred-studio-v2/optimised/ktx2/room_ktx2.glb')
      : assetUrl('models/fred-studio-v2/loft_interior_6_for_free.glb')
  const macbookUrl = meshCompression === 'meshopt'
    ? assetUrl(`models/fred-studio-v2/optimised/${textures === 'ktx2' ? 'ktx2-meshopt' : 'meshopt'}/${macbookBase}_meshopt.glb`)
    : textures === 'ktx2'
      ? assetUrl('models/fred-studio-v2/optimised/ktx2/macbook_pro_2021_ktx2.glb')
      : assetUrl('models/fred-studio-v2/objects/macbook_pro_2021.glb')

  return Object.freeze({
    textures,
    meshCompression,
    loading,
    selectiveShadows,
    officialDefault,
    officialSourceDefault: false,
    roomUrl,
    macbookUrl,
    photoBoardUrl: assetUrl(STUDIO_V2_ASSET_PATHS.photoBoard),
    photoManifestUrl: assetUrl(STUDIO_V2_ASSET_PATHS.photoManifest),
    polaroidCameraUrl: assetUrl(STUDIO_V2_ASSET_PATHS.polaroidCamera),
    speakerUrl: assetUrl(STUDIO_V2_ASSET_PATHS.speaker),
    requiresKtx2: textures === 'ktx2',
    requiresMeshopt: meshCompression === 'meshopt',
  })
}

export function deliveryRequestFromSearch(searchParams) {
  return {
    textures: searchParams.get('textures') ?? undefined,
    meshCompression: searchParams.get('mesh') ?? undefined,
    loading: searchParams.get('loading') ?? undefined,
    selectiveShadows: searchParams.get('microShadows') === 'off',
  }
}

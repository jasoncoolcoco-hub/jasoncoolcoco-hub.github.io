const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

export const STUDIO_V2_SOURCE_DELIVERY = Object.freeze({
  guitar: 'source',
  marshall: 'source',
  textures: 'source',
  meshCompression: 'off',
  loading: 'eager',
  selectiveShadows: false,
})

export const STUDIO_V2_OFFICIAL_DELIVERY = Object.freeze({
  guitar: 'conservative',
  marshall: 'conservative',
  textures: 'source',
  meshCompression: 'meshopt',
  loading: 'lazy',
  selectiveShadows: false,
})

export const STUDIO_V2_DERIVATIVE_OPTIONS = Object.freeze({
  guitar: Object.freeze(['source', 'conservative', 'light', 'moderate']),
  marshall: Object.freeze(['source', 'conservative', 'light']),
  textures: Object.freeze(['source', 'ktx2']),
  meshCompression: Object.freeze(['off', 'meshopt']),
  loading: Object.freeze(['eager', 'lazy']),
})

const MUSIC_NORMALISATION = Object.freeze({
  offset: Object.freeze([0.26844841, 0.01856808, -0.00986576]),
  scale: 1,
  sourceCombinedBounds: Object.freeze({
    min: Object.freeze([-0.70913038, -0.00446808, -0.36767019]),
    max: Object.freeze([0.17223356, 0.98504885, 0.38740171]),
  }),
})

function validated(value, values, fallback) {
  return values.includes(value) ? value : fallback
}

function derivativeName(asset, level) {
  if (asset === 'marshall') return level === 'source' ? 'marshall_amp_optimised' : `marshall_amp_${level}`
  return level === 'source' ? 'gibson_guitar_optimised' : `gibson_guitar_${level}`
}

function derivativeUrl(baseName, textures, meshCompression) {
  if (textures === 'ktx2' && meshCompression === 'meshopt') {
    return assetUrl(`models/fred-studio-v2/optimised/ktx2-meshopt/${baseName}_ktx2_meshopt.glb`)
  }
  if (textures === 'ktx2') {
    return assetUrl(`models/fred-studio-v2/optimised/ktx2/${baseName}_ktx2.glb`)
  }
  if (meshCompression === 'meshopt') {
    return assetUrl(`models/fred-studio-v2/optimised/meshopt/${baseName}_meshopt.glb`)
  }
  return assetUrl(`models/fred-studio-v2/optimised/${baseName}.glb`)
}

export function createStudioV2DeliveryConfig(requested = {}, allowDerivatives = false) {
  const activeRequest = allowDerivatives ? requested : {}
  const guitar = validated(
    activeRequest.guitar,
    STUDIO_V2_DERIVATIVE_OPTIONS.guitar,
    STUDIO_V2_OFFICIAL_DELIVERY.guitar,
  )
  const marshall = validated(
    activeRequest.marshall,
    STUDIO_V2_DERIVATIVE_OPTIONS.marshall,
    STUDIO_V2_OFFICIAL_DELIVERY.marshall,
  )
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
  const sourceOnly = guitar === 'source'
    && marshall === 'source'
    && textures === 'source'
    && meshCompression === 'off'
    && loading === 'eager'
    && !selectiveShadows
  const officialDefault = guitar === STUDIO_V2_OFFICIAL_DELIVERY.guitar
    && marshall === STUDIO_V2_OFFICIAL_DELIVERY.marshall
    && textures === STUDIO_V2_OFFICIAL_DELIVERY.textures
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
    guitar,
    marshall,
    textures,
    meshCompression,
    loading,
    selectiveShadows,
    officialDefault,
    officialSourceDefault: false,
    usesCombinedSource: sourceOnly,
    roomUrl,
    macbookUrl,
    musicUrl: sourceOnly ? assetUrl('models/fred-studio-v2/objects/marshall_amp.glb') : null,
    marshallUrl: sourceOnly ? null : derivativeUrl(derivativeName('marshall', marshall), textures, meshCompression),
    guitarUrl: sourceOnly ? null : derivativeUrl(derivativeName('guitar', guitar), textures, meshCompression),
    photoBoardUrl: assetUrl('models/fred-studio-v2/objects/cork_board_clean.glb'),
    polaroidCameraUrl: assetUrl('models/fred-studio-v2/objects/polaroid_camera.glb'),
    documentFolderUrl: assetUrl('models/fred-studio-v2/objects/document_file_folder.glb'),
    coffeeCupUrl: assetUrl('models/fred-studio-v2/objects/coffee_cup.glb'),
    requiresKtx2: textures === 'ktx2',
    requiresMeshopt: meshCompression === 'meshopt',
    musicNormalisation: MUSIC_NORMALISATION,
  })
}

export function deliveryRequestFromSearch(searchParams) {
  return {
    guitar: searchParams.get('guitar') ?? undefined,
    marshall: searchParams.get('marshall') ?? undefined,
    textures: searchParams.get('textures') ?? undefined,
    meshCompression: searchParams.get('mesh') ?? undefined,
    loading: searchParams.get('loading') ?? undefined,
    selectiveShadows: searchParams.get('microShadows') === 'off',
  }
}

const DEVELOPMENT_CATALOGUE_URL = '/audio/fred-studio/catalog.local.json'
const PRODUCTION_CATALOGUE_URL = '/audio/fred-studio/catalog.published.json'

export function resolveStudioV2AudioCatalogue({
  debug = false,
  override = null,
} = {}) {
  if (import.meta.env.DEV) {
    if (debug && override) {
      return Object.freeze({
        mode: 'development-override',
        url: override,
      })
    }
    return Object.freeze({
      mode: 'development',
      url: DEVELOPMENT_CATALOGUE_URL,
    })
  }
  return Object.freeze({
    mode: 'production',
    url: PRODUCTION_CATALOGUE_URL,
  })
}

export function resolveStudioV2AudioCatalogueForMode(production) {
  return Object.freeze({
    mode: production ? 'production' : 'development',
    url: production ? PRODUCTION_CATALOGUE_URL : DEVELOPMENT_CATALOGUE_URL,
  })
}

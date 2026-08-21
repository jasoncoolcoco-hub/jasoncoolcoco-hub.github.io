import * as THREE from 'three'
import {
  boardCoordinatesToStudioV2Position,
  createStudioV2PhotoBoardCoordinateOverlay,
  resolveStudioV2PhotoBoardCoordinates,
  STUDIO_V2_PHOTO_BOARD_COORDINATES,
  STUDIO_V2_PHOTO_BOARD_DEPTH,
  STUDIO_V2_PHOTO_BOARD_SURFACE,
} from './studioV2PhotoBoardLayout.js'
import { resolveStudioV2PhotoDepthRanks } from './studioV2PhotoStacking.js'

export const STUDIO_V2_PHOTO_STYLES = Object.freeze(['print', 'polaroid'])
export const STUDIO_V2_PHOTO_SIZES = Object.freeze(['small', 'medium', 'large', 'hero'])
export const STUDIO_V2_PHOTO_FIT_MODES = Object.freeze(['contain', 'cover', 'smart'])
export const STUDIO_V2_PHOTO_PACKAGING_MODES = Object.freeze(['mixed', 'all-polaroid'])
export const STUDIO_V2_PHOTO_TEXTURE_TIERS = Object.freeze(['room', 'focus', 'detail'])
export const STUDIO_V2_PHOTO_SCALE_PASS = 0.78
export const STUDIO_V2_PHOTO_CARD_SCALE = 0.702
export const STUDIO_V2_PHOTO_STACK_DEPTH_STEP_WORLD = 0.00075
export const STUDIO_V2_PHOTO_MATERIAL_PROFILE = Object.freeze({
  contactShadowBoardLift: 0.00036,
  contactShadowMargin: 0.0155,
  contactShadowOpacity: 0.5,
  imageEnvMapIntensity: 0.04,
  imageRoughness: 0.72,
  paperEdgeEnvMapIntensity: 0.045,
  paperEdgeRoughness: 0.96,
  paperEnvMapIntensity: 0.09,
  paperThickness: 0.0125,
  printBorderWidth: 0.0062,
})
export const STUDIO_V2_POLAROID_VARIANTS = Object.freeze([
  Object.freeze({
    id: 'classic',
    edgeWidth: 0.012,
    bottomWidth: 0.0425,
    edgeColor: '#e7ded1',
    paperColor: '#f5f1e8',
    roughness: 0.96,
  }),
  Object.freeze({
    id: 'soft-ivory',
    edgeWidth: 0.0126,
    bottomWidth: 0.046,
    edgeColor: '#e9e1d5',
    paperColor: '#f6f2e9',
    roughness: 0.97,
  }),
  Object.freeze({
    id: 'slim',
    edgeWidth: 0.0112,
    bottomWidth: 0.0395,
    edgeColor: '#e6ddd0',
    paperColor: '#f4f0e7',
    roughness: 0.95,
  }),
])

const SUPPORTED_SOURCE_PATTERN = /\.(?:jpe?g|png|webp)$/i
const POLAROID_WINDOW_AREA_SCALE = 0.78
export const STUDIO_V2_PHOTO_SIZE_AREAS = Object.freeze({
  small: 0.028,
  medium: 0.048,
  large: 0.085,
  hero: 0.145,
})
const DEFAULTS = Object.freeze({
  caption: null,
  enabled: true,
  fitMode: 'contain',
  rotation: 0,
  size: 'medium',
  style: 'polaroid',
  x: null,
  y: null,
  zOrder: 0,
})
const DEFAULT_QUALITY_TIERS = Object.freeze({
  room: Object.freeze({ directory: 'room', maxDimension: 320, jpegQuality: 72 }),
  focus: Object.freeze({ directory: 'focus', maxDimension: 960, jpegQuality: 86 }),
  detail: Object.freeze({ source: 'generated' }),
})

function assertChoice(value, choices, field, id) {
  if (!choices.includes(value)) throw new Error(`${id}: unsupported ${field} "${value}".`)
  return value
}

export function classifyStudioV2PhotoOrientation(width, height) {
  const aspect = width / height
  if (aspect >= 1.8) return 'wide-landscape'
  if (aspect > 1.08) return 'landscape'
  if (aspect <= 0.56) return 'tall-portrait'
  if (aspect < 0.92) return 'portrait'
  return 'square'
}

export function calculateStudioV2PrintDimensions(aspect, size = 'medium') {
  const area = STUDIO_V2_PHOTO_SIZE_AREAS[assertChoice(size, STUDIO_V2_PHOTO_SIZES, 'size', 'photo')]
  const width = Math.sqrt(area * aspect)
  return Object.freeze({ width, height: width / aspect })
}

function resolveManifestPhoto(
  entry,
  defaults,
  index,
  inferredSlotNumber,
  packagingMode,
  normalizedSize,
) {
  const resolved = { ...DEFAULTS, ...defaults, ...entry }
  resolved.id ??= `PHOTO_${String(index + 1).padStart(3, '0')}`
  if (!resolved.filename || !SUPPORTED_SOURCE_PATTERN.test(resolved.filename)) {
    throw new Error(`${resolved.id}: filename must be JPG, JPEG, PNG, or WEBP.`)
  }
  resolved.style = assertChoice(resolved.style, STUDIO_V2_PHOTO_STYLES, 'style', resolved.id)
  if (packagingMode === 'all-polaroid') resolved.style = 'polaroid'
  resolved.size = assertChoice(resolved.size, STUDIO_V2_PHOTO_SIZES, 'size', resolved.id)
  if (normalizedSize) resolved.size = normalizedSize
  resolved.fitMode = assertChoice(resolved.fitMode, STUDIO_V2_PHOTO_FIT_MODES, 'fitMode', resolved.id)
  if (!Number.isFinite(resolved.rotation)) throw new Error(`${resolved.id}: rotation must be finite.`)
  if (!Number.isFinite(resolved.zOrder)) throw new Error(`${resolved.id}: zOrder must be finite.`)
  if (typeof resolved.enabled !== 'boolean') throw new Error(`${resolved.id}: enabled must be boolean.`)
  const hasX = resolved.x !== null && resolved.x !== undefined
  const hasY = resolved.y !== null && resolved.y !== undefined
  if (hasX !== hasY) throw new Error(`${resolved.id}: x and y must both be set or both be null.`)
  if (hasX && (!Number.isFinite(resolved.x) || !Number.isFinite(resolved.y))) {
    throw new Error(`${resolved.id}: x and y must be finite numbers.`)
  }
  resolved.slotNumber = resolved.slot ?? inferredSlotNumber
  if (resolved.slotNumber !== null && (!Number.isInteger(resolved.slotNumber) || resolved.slotNumber < 1)) {
    throw new Error(`${resolved.id}: slot must be a positive integer.`)
  }
  return Object.freeze(resolved)
}

export function resolveStudioV2PhotoManifest(manifest) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.photos)) {
    throw new Error('Photo-wall manifest must use version 1 and contain a photos array.')
  }
  const seenIds = new Set()
  const seenSlots = new Set()
  const packagingMode = assertChoice(
    manifest.packagingMode ?? 'mixed',
    STUDIO_V2_PHOTO_PACKAGING_MODES,
    'packagingMode',
    'photo-wall',
  )
  const normalizedSize = manifest.normalizedSize == null
    ? null
    : assertChoice(
      manifest.normalizedSize,
      STUDIO_V2_PHOTO_SIZES,
      'normalizedSize',
      'photo-wall',
    )
  const qualityTiers = Object.freeze({
    room: Object.freeze({ ...DEFAULT_QUALITY_TIERS.room, ...manifest.qualityTiers?.room }),
    focus: Object.freeze({ ...DEFAULT_QUALITY_TIERS.focus, ...manifest.qualityTiers?.focus }),
    detail: Object.freeze({ ...DEFAULT_QUALITY_TIERS.detail, ...manifest.qualityTiers?.detail }),
  })
  for (const tier of ['room', 'focus']) {
    if (!qualityTiers[tier].directory || /[\\/]/.test(qualityTiers[tier].directory)) {
      throw new Error(`Photo-wall ${tier} quality tier must use one derivative directory.`)
    }
  }
  let inferredSlotNumber = 0
  const photos = manifest.photos.map((entry, index) => {
    const placed = Number.isFinite(entry.x) && Number.isFinite(entry.y)
    const photo = resolveManifestPhoto(
      entry,
      manifest.defaults,
      index,
      placed ? ++inferredSlotNumber : null,
      packagingMode,
      placed ? normalizedSize : null,
    )
    if (seenIds.has(photo.id)) throw new Error(`Duplicate photo id: ${photo.id}.`)
    seenIds.add(photo.id)
    if (photo.slotNumber !== null) {
      if (seenSlots.has(photo.slotNumber)) throw new Error(`Duplicate photo slot: ${photo.slotNumber}.`)
      seenSlots.add(photo.slotNumber)
    }
    return photo
  })
  return Object.freeze({
    packagingMode,
    normalizedSize,
    photos: Object.freeze(photos),
    previewIds: Object.freeze(Array.isArray(manifest.previewIds) ? [...manifest.previewIds] : []),
    qualityTiers,
    version: manifest.version,
  })
}

export function resolveStudioV2PhotoTierPath(entry, qualityTiers, tier) {
  if (!STUDIO_V2_PHOTO_TEXTURE_TIERS.includes(tier)) {
    throw new Error(`${entry.id}: unsupported photo texture tier "${tier}".`)
  }
  if (tier === 'detail') return entry.generatedFilename
  const generatedName = String(entry.generatedFilename ?? '').split('/').pop()
  if (!generatedName) throw new Error(`${entry.id}: generatedFilename is required for texture tiers.`)
  const stem = generatedName.replace(/\.[^.]+$/, '')
  return `${qualityTiers[tier].directory}/${stem}.jpg`
}

function configureDisplayTexture(texture, renderer) {
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16)
  texture.needsUpdate = true
  return texture
}

function imageDimensions(texture) {
  const image = texture.image
  const width = image?.naturalWidth ?? image?.videoWidth ?? image?.width
  const height = image?.naturalHeight ?? image?.videoHeight ?? image?.height
  if (!(width > 0 && height > 0)) throw new Error('Photo texture has no readable dimensions.')
  return { width, height }
}

export function resolveStudioV2PolaroidVariant(slotNumber = 1) {
  const index = Number.isInteger(slotNumber) && slotNumber > 0 ? slotNumber - 1 : 0
  return STUDIO_V2_POLAROID_VARIANTS[index % STUDIO_V2_POLAROID_VARIANTS.length]
}

export function calculateStudioV2PolaroidLayout(aspect, size = 'medium', slotNumber = 1) {
  const baseWindowDimensions = calculateStudioV2PrintDimensions(aspect, size)
  const variant = resolveStudioV2PolaroidVariant(slotNumber)
  const windowScale = Math.sqrt(POLAROID_WINDOW_AREA_SCALE)
  const windowDimensions = Object.freeze({
    width: baseWindowDimensions.width * windowScale,
    height: baseWindowDimensions.height * windowScale,
  })
  const side = variant.edgeWidth
  const top = variant.edgeWidth
  const bottom = variant.bottomWidth
  const dimensions = Object.freeze({
    width: windowDimensions.width + side * 2,
    height: windowDimensions.height + top + bottom,
  })
  return Object.freeze({
    bottom,
    dimensions,
    side,
    top,
    variant,
    windowDimensions,
    windowOffsetY: (bottom - top) / 2,
  })
}

function createStableCardMaterial(texture, imageRect, paperColor) {
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
    toneMapped: true,
  })
  material.userData.studioV2ImageRect = imageRect.clone()
  material.userData.studioV2PaperColor = new THREE.Color(paperColor)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.studioV2ImageRect = { value: material.userData.studioV2ImageRect }
    shader.uniforms.studioV2PaperColor = { value: material.userData.studioV2PaperColor }
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        `#include <map_pars_fragment>
uniform vec4 studioV2ImageRect;
uniform vec3 studioV2PaperColor;`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
  vec2 studioV2ImageSize = max(
    studioV2ImageRect.zw - studioV2ImageRect.xy,
    vec2(0.0001)
  );
  vec2 studioV2PhotoUv = clamp(
    (vMapUv - studioV2ImageRect.xy) / studioV2ImageSize,
    vec2(0.0),
    vec2(1.0)
  );
  vec2 studioV2InnerDistance = min(
    vMapUv - studioV2ImageRect.xy,
    studioV2ImageRect.zw - vMapUv
  );
  float studioV2EdgeDistance = min(studioV2InnerDistance.x, studioV2InnerDistance.y);
  float studioV2EdgeWidth = max(fwidth(vMapUv.x), fwidth(vMapUv.y));
  float studioV2PhotoCoverage = smoothstep(
    -studioV2EdgeWidth,
    studioV2EdgeWidth,
    studioV2EdgeDistance
  );
  vec4 studioV2PhotoColor = texture2D(map, studioV2PhotoUv);
  vec4 sampledDiffuseColor = mix(
    vec4(studioV2PaperColor, 1.0),
    studioV2PhotoColor,
    studioV2PhotoCoverage
  );
  diffuseColor *= sampledDiffuseColor;
#endif`,
      )
  }
  material.customProgramCacheKey = () => 'studio-v2-independent-stable-photo-card-v1'
  return material
}

function createStableCardSurface(texture, width, height, imageRect, paperColor, z, shared) {
  const material = createStableCardMaterial(texture, imageRect, paperColor)
  const mesh = new THREE.Mesh(shared.planeGeometry, material)
  mesh.name = 'PHOTO_IMAGE_SURFACE'
  mesh.position.z = z
  mesh.scale.set(width, height, 1)
  mesh.castShadow = false
  mesh.receiveShadow = false
  return mesh
}

function createContactShadow(width, height, shared) {
  const shadow = new THREE.Mesh(shared.planeGeometry, shared.contactShadowMaterial)
  shadow.name = 'PHOTO_CONTACT_SHADOW'
  shadow.position.set(
    0.002,
    -0.0028,
    -STUDIO_V2_PHOTO_BOARD_DEPTH.baseOffsetWorld
      + STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowBoardLift,
  )
  shadow.scale.set(
    width + STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowMargin,
    height + STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowMargin,
    1,
  )
  shadow.castShadow = false
  shadow.receiveShadow = false
  shadow.renderOrder = -1
  shadow.userData.studioV2BaseLocalZ = shadow.position.z
  return shadow
}

function createPrintCard(entry, texture, aspect, shared) {
  const dimensions = calculateStudioV2PrintDimensions(aspect, entry.size)
  const edge = STUDIO_V2_PHOTO_MATERIAL_PROFILE.printBorderWidth
  const group = new THREE.Group()
  const rigidCard = new THREE.Group()
  rigidCard.name = 'PHOTO_RIGID_CARD'
  const contactShadow = createContactShadow(dimensions.width, dimensions.height, shared)
  group.add(contactShadow)
  const surface = createStableCardSurface(
    texture,
    dimensions.width,
    dimensions.height,
    new THREE.Vector4(
      edge / dimensions.width,
      edge / dimensions.height,
      1 - edge / dimensions.width,
      1 - edge / dimensions.height,
    ),
    STUDIO_V2_POLAROID_VARIANTS[0].paperColor,
    shared.paperThickness + 0.00022,
    shared,
  )
  rigidCard.add(surface)
  group.add(rigidCard)
  return { contactShadow, dimensions, group, rigidCard, surface, windowAspect: aspect }
}

function createPolaroidCard(entry, texture, aspect, shared) {
  const layout = calculateStudioV2PolaroidLayout(aspect, entry.size, entry.slotNumber)
  const group = new THREE.Group()
  const rigidCard = new THREE.Group()
  rigidCard.name = 'PHOTO_RIGID_CARD'
  const contactShadow = createContactShadow(layout.dimensions.width, layout.dimensions.height, shared)
  group.add(contactShadow)
  const surface = createStableCardSurface(
    texture,
    layout.dimensions.width,
    layout.dimensions.height,
    new THREE.Vector4(
      layout.side / layout.dimensions.width,
      layout.bottom / layout.dimensions.height,
      1 - layout.side / layout.dimensions.width,
      1 - layout.top / layout.dimensions.height,
    ),
    layout.variant.paperColor,
    shared.paperThickness + 0.00022,
    shared,
  )
  rigidCard.add(surface)
  group.add(rigidCard)
  return {
    border: Object.freeze({ bottom: layout.bottom, side: layout.side, top: layout.top }),
    contactShadow,
    dimensions: layout.dimensions,
    group,
    rigidCard,
    surface,
    packagingVariant: layout.variant.id,
    windowAspect: aspect,
  }
}

export function applyStudioV2PhotoStableDepth(group, depthRank, boardScale = 2) {
  const baseZ = group.userData.studioV2PhotoBaseZ
  if (!Number.isFinite(baseZ) || !Number.isInteger(depthRank) || depthRank < 0) return false
  const stableDepthWorld = depthRank * STUDIO_V2_PHOTO_STACK_DEPTH_STEP_WORLD
  group.position.z = baseZ + stableDepthWorld / boardScale
  const contactShadow = group.getObjectByName('PHOTO_CONTACT_SHADOW')
  const baseShadowZ = contactShadow?.userData?.studioV2BaseLocalZ
  if (contactShadow && Number.isFinite(baseShadowZ)) {
    contactShadow.position.z = baseShadowZ - stableDepthWorld / STUDIO_V2_PHOTO_CARD_SCALE
  }
  return true
}

function configureProceduralTexture(canvas, renderer, { color = false, repeat = 1 } = {}) {
  const texture = new THREE.CanvasTexture(canvas)
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16)
  if (repeat !== 1) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(repeat, repeat)
  }
  texture.needsUpdate = true
  return texture
}

function createContactShadowTexture(renderer) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.shadowColor = 'rgba(48, 35, 23, 0.36)'
  context.shadowBlur = 27
  context.shadowOffsetX = 1.5
  context.shadowOffsetY = 2.5
  context.fillStyle = 'rgba(48, 35, 23, 0.22)'
  context.fillRect(24, 24, 208, 208)
  return configureProceduralTexture(canvas, renderer, { color: true })
}

function createSharedResources(renderer) {
  const contactShadowTexture = createContactShadowTexture(renderer)
  return {
    contactShadowMaterial: new THREE.MeshBasicMaterial({
      alphaTest: 0.004,
      depthWrite: false,
      map: contactShadowTexture,
      opacity: STUDIO_V2_PHOTO_MATERIAL_PROFILE.contactShadowOpacity,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      toneMapped: true,
      transparent: true,
    }),
    paperThickness: STUDIO_V2_PHOTO_MATERIAL_PROFILE.paperThickness,
    planeGeometry: new THREE.PlaneGeometry(1, 1),
  }
}

function createSlotMarker(slotNumber, dimensions, shared) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 84
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(24, 23, 20, 0.9)'
  context.fillRect(4, 4, 120, 76)
  context.strokeStyle = 'rgba(255, 248, 224, 0.95)'
  context.lineWidth = 5
  context.strokeRect(6.5, 6.5, 115, 71)
  context.font = '700 46px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff8e0'
  context.fillText(String(slotNumber).padStart(2, '0'), 64, 44)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  const material = new THREE.MeshBasicMaterial({
    depthTest: true,
    depthWrite: false,
    map: texture,
    toneMapped: false,
    transparent: true,
  })
  const markerWidth = Math.min(0.056, dimensions.width * 0.28)
  const markerHeight = markerWidth * 0.65625
  const marker = new THREE.Mesh(shared.planeGeometry, material)
  marker.name = `PHOTO_SLOT_${String(slotNumber).padStart(2, '0')}`
  marker.userData.studioV2PhotoSlot = slotNumber
  marker.position.set(
    -dimensions.width / 2 + markerWidth / 2 + 0.006,
    dimensions.height / 2 - markerHeight / 2 - 0.006,
    shared.paperThickness + 0.001,
  )
  marker.scale.set(markerWidth, markerHeight, 1)
  marker.renderOrder = 30
  return marker
}

async function loadDisplayTexture(entry, manifestUrl, qualityTiers, tier, textureLoader, renderer) {
  const resolvedManifestUrl = new URL(manifestUrl, window.location.href)
  const sourcePaths = tier === 'detail'
    ? [entry.generatedFilename, `source/${entry.filename}`]
    : [resolveStudioV2PhotoTierPath(entry, qualityTiers, tier)]
  const uniqueSourcePaths = sourcePaths.filter(
    (value, index, values) => value && values.indexOf(value) === index,
  )
  let lastError = null
  for (let index = 0; index < uniqueSourcePaths.length; index += 1) {
    const sourcePath = uniqueSourcePaths[index]
    const resolvedSourceUrl = new URL(sourcePath, resolvedManifestUrl)
    resolvedManifestUrl.searchParams.forEach((value, key) => {
      resolvedSourceUrl.searchParams.set(key, value)
    })
    const url = resolvedSourceUrl.toString()
    try {
      return {
        fallbackUsed: index > 0,
        sourcePath,
        tier,
        texture: configureDisplayTexture(await textureLoader.loadAsync(url), renderer),
      }
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`${entry.id}: ${tier} photo texture load failed.`, { cause: lastError })
}

function createPhotoTextureTierController({ cards, manifestUrl, qualityTiers, renderer, textureLoader }) {
  const focusTextures = new Map()
  let focusPromise = null
  let focusStatus = 'idle'
  let focusError = null
  let detailRecord = null
  let detailPromise = null
  let detailStatus = 'idle'
  let detailError = null
  let visibleTier = 'room'
  let activeDetailId = null
  let disposed = false

  function applyTexture(card, texture) {
    card.surface.material.map = texture
    card.surface.material.needsUpdate = true
  }

  function preloadFocusQuality() {
    if (disposed) return Promise.resolve(false)
    if (focusStatus === 'ready') return Promise.resolve(true)
    if (focusPromise) return focusPromise
    focusStatus = 'loading'
    const pendingFocusTextures = new Map()
    focusPromise = Promise.all([...cards.values()].map(async (card) => {
      const loaded = await loadDisplayTexture(
        card.entry,
        manifestUrl,
        qualityTiers,
        'focus',
        textureLoader,
        renderer,
      )
      pendingFocusTextures.set(card.entry.id, loaded.texture)
    })).then(() => {
      if (disposed) {
        pendingFocusTextures.forEach((texture) => texture.dispose())
        return false
      }
      pendingFocusTextures.forEach((texture, id) => focusTextures.set(id, texture))
      focusStatus = 'ready'
      return true
    }).catch((error) => {
      pendingFocusTextures.forEach((texture) => texture.dispose())
      focusError = error
      focusStatus = 'error'
      throw error
    })
    return focusPromise
  }

  function activateFocusQuality() {
    if (disposed || focusStatus !== 'ready') return false
    cards.forEach((card, id) => applyTexture(card, focusTextures.get(id)))
    activeDetailId = null
    visibleTier = 'focus'
    return true
  }

  function activateRoomQuality() {
    if (disposed) return false
    cards.forEach((card) => applyTexture(card, card.roomTexture))
    activeDetailId = null
    visibleTier = 'room'
    return true
  }

  function prepareDetailQuality(id) {
    if (disposed || !cards.has(id)) return Promise.resolve(false)
    if (detailRecord?.id === id && detailStatus === 'ready') return Promise.resolve(true)
    if (detailPromise && detailRecord?.id === id) return detailPromise
    const card = cards.get(id)
    detailRecord?.texture?.dispose()
    const requestRecord = { id, texture: null }
    detailRecord = requestRecord
    detailStatus = 'loading'
    detailPromise = loadDisplayTexture(
      card.entry,
      manifestUrl,
      qualityTiers,
      'detail',
      textureLoader,
      renderer,
    ).then((loaded) => {
      if (disposed || detailRecord !== requestRecord) {
        loaded.texture.dispose()
        return false
      }
      requestRecord.texture = loaded.texture
      detailStatus = 'ready'
      return true
    }).catch((error) => {
      if (detailRecord === requestRecord) {
        detailError = error
        detailStatus = 'error'
      }
      throw error
    }).finally(() => {
      if (detailRecord === requestRecord) detailPromise = null
    })
    return detailPromise
  }

  function activateDetailQuality(id) {
    if (disposed || detailStatus !== 'ready' || detailRecord?.id !== id) return false
    applyTexture(cards.get(id), detailRecord.texture)
    activeDetailId = id
    visibleTier = 'detail'
    return true
  }

  function restoreDetailQuality(id) {
    if (disposed || activeDetailId !== id || !cards.has(id)) return false
    const card = cards.get(id)
    const texture = focusTextures.get(id) ?? card.roomTexture
    applyTexture(card, texture)
    activeDetailId = null
    visibleTier = focusTextures.has(id) ? 'focus' : 'room'
    return true
  }

  return Object.freeze({
    activateDetailQuality,
    activateFocusQuality,
    activateRoomQuality,
    dispose() {
      if (disposed) return
      disposed = true
      focusTextures.forEach((texture) => texture.dispose())
      detailRecord?.texture?.dispose()
      cards.forEach((card) => card.roomTexture.dispose())
      focusTextures.clear()
      detailRecord = null
    },
    getState() {
      return Object.freeze({
        activeDetailId,
        detailError: detailError?.message ?? null,
        detailId: detailRecord?.id ?? null,
        detailStatus,
        focusError: focusError?.message ?? null,
        focusLoadedCount: focusTextures.size,
        focusStatus,
        idleAutoUpgrade: false,
        roomLoadedCount: cards.size,
        visibleTier,
      })
    },
    preloadFocusQuality,
    prepareDetailQuality,
    restoreDetailQuality,
  })
}

export async function createStudioV2PhotoPackagingPreview({
  manifestUrl,
  renderer,
  boardScale = 2,
  debugCoordinateOverlay = false,
  debugSlotOverlay = false,
}) {
  const response = await fetch(manifestUrl, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`Photo manifest request failed: ${response.status}.`)
  const manifest = resolveStudioV2PhotoManifest(await response.json())
  const positionedEntries = manifest.photos.filter((photo) => (
    photo.enabled
    && Number.isFinite(photo.x)
    && Number.isFinite(photo.y)
  ))
  const textureLoader = new THREE.TextureLoader()
  const shared = createSharedResources(renderer)
  const group = new THREE.Group()
  group.name = 'PHOTO_PACKAGING_PREVIEW'
  group.userData.studioV2Id = 'PHOTO_PACKAGING_PREVIEW'
  if (debugCoordinateOverlay) {
    group.add(createStudioV2PhotoBoardCoordinateOverlay({ boardScale }))
  }
  const records = []
  const cards = new Map()

  await Promise.all(positionedEntries.map(async (entry, index) => {
    const loadedTexture = await loadDisplayTexture(
      entry,
      manifestUrl,
      manifest.qualityTiers,
      'room',
      textureLoader,
      renderer,
    )
    const texture = loadedTexture.texture
    const { width: sourceWidth, height: sourceHeight } = imageDimensions(texture)
    const aspect = sourceWidth / sourceHeight
    const orientation = classifyStudioV2PhotoOrientation(sourceWidth, sourceHeight)
    const card = entry.style === 'polaroid'
      ? createPolaroidCard(entry, texture, aspect, shared)
      : createPrintCard(entry, texture, aspect, shared)
    if (debugSlotOverlay) card.rigidCard.add(createSlotMarker(entry.slotNumber, card.dimensions, shared))
    const coordinates = resolveStudioV2PhotoBoardCoordinates(entry)
    const localPosition = boardCoordinatesToStudioV2Position({
      boardScale,
      x: coordinates.x,
      y: coordinates.y,
      zOrder: 0,
    })
    card.group.name = entry.id
    card.group.userData.studioV2Id = entry.id
    card.group.userData.studioV2PhotoBaseZ = localPosition.z
    const packaging = {
      aspect,
      dimensions: card.dimensions,
      border: card.border ?? null,
      contactShadow: true,
      edgeMaterial: 'warm-paper-core',
      fitMode: entry.fitMode,
      orientation,
      packagingMode: manifest.packagingMode,
      packagingVariant: card.packagingVariant ?? null,
      paperThickness: shared.paperThickness,
      stableCardRepresentation: 'single-opaque-plane-with-analytic-border-aa',
      surfaceMaterial: 'low-gloss-satin-photo',
      boardCoordinates: coordinates,
      rotation: entry.rotation,
      size: entry.size,
      slotNumber: entry.slotNumber,
      sourceHeight,
      sourcePath: loadedTexture.sourcePath,
      sourceWidth,
      style: entry.style,
      textureFallbackUsed: loadedTexture.fallbackUsed,
      windowAspect: card.windowAspect,
    }
    card.group.position.copy(localPosition)
    card.group.rotation.z = THREE.MathUtils.degToRad(entry.rotation)
    card.group.scale.setScalar(STUDIO_V2_PHOTO_CARD_SCALE / boardScale)
    group.add(card.group)
    cards.set(entry.id, {
      contactShadow: card.contactShadow,
      dimensions: card.dimensions,
      entry,
      group: card.group,
      index,
      packaging,
      roomTexture: texture,
      surface: card.surface,
    })
  }))

  const depthPlan = resolveStudioV2PhotoDepthRanks(
    [...cards.values()].map(({ dimensions, entry }) => ({
      height: dimensions.height,
      id: entry.id,
      rotation: entry.rotation,
      slotNumber: entry.slotNumber,
      width: dimensions.width,
      x: entry.x,
      y: entry.y,
      zOrder: entry.zOrder,
    })),
    {
      boardHeight: STUDIO_V2_PHOTO_BOARD_SURFACE.worldHeight,
      boardWidth: STUDIO_V2_PHOTO_BOARD_SURFACE.worldWidth,
      cardScale: STUDIO_V2_PHOTO_CARD_SCALE,
    },
  )
  cards.forEach((card, id) => {
    const depthRank = depthPlan.ranks.get(id) ?? 0
    applyStudioV2PhotoStableDepth(card.group, depthRank, boardScale)
    const photoPackaging = Object.freeze({
      ...card.packaging,
      depthRank,
      localPosition: Object.freeze(
        card.group.position.toArray().map((value) => Number(value.toFixed(6))),
      ),
      stableDepthWorld: depthRank * STUDIO_V2_PHOTO_STACK_DEPTH_STEP_WORLD,
    })
    card.group.userData.photoPackaging = photoPackaging
    records[card.index] = Object.freeze({ id, ...photoPackaging })
  })

  const textureTiers = createPhotoTextureTierController({
    cards,
    manifestUrl,
    qualityTiers: manifest.qualityTiers,
    renderer,
    textureLoader,
  })

  return {
    group,
    manifestCount: manifest.photos.length,
    records: Object.freeze(records),
    textureTiers,
    report: Object.freeze({
      arbitraryCountSupported: true,
      boardCoordinates: STUDIO_V2_PHOTO_BOARD_COORDINATES,
      boardDepth: STUDIO_V2_PHOTO_BOARD_DEPTH,
      boardSurface: STUDIO_V2_PHOTO_BOARD_SURFACE,
      depthPlan: Object.freeze({
        maximumRank: depthPlan.maximumRank,
        overlappingPairs: depthPlan.overlappingPairs,
        stepWorld: STUDIO_V2_PHOTO_STACK_DEPTH_STEP_WORLD,
      }),
      defaultStyle: DEFAULTS.style,
      debugCoordinateOverlay,
      debugSlotOverlay,
      manifestCount: manifest.photos.length,
      materialProfile: STUDIO_V2_PHOTO_MATERIAL_PROFILE,
      photoCardRepresentation: 'independent-opaque-stable-plane',
      representationHandoff: false,
      packagingMode: manifest.packagingMode,
      photoCardScale: STUDIO_V2_PHOTO_CARD_SCALE,
      photoScalePass: STUDIO_V2_PHOTO_SCALE_PASS,
      normalizedSize: manifest.normalizedSize,
      positionedCount: positionedEntries.length,
      previewCount: positionedEntries.length,
      qualityTiers: manifest.qualityTiers,
      records: Object.freeze(records),
      supportedFitModes: STUDIO_V2_PHOTO_FIT_MODES,
      supportedSizes: STUDIO_V2_PHOTO_SIZES,
      supportedStyles: STUDIO_V2_PHOTO_STYLES,
    }),
  }
}

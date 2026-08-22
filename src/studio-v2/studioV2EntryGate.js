export const STUDIO_V2_ASSET_TIERS = Object.freeze({
  tier1: Object.freeze([
    'ROOM_ENVIRONMENT',
    'MACBOOK_ISLAND_01',
    'PHOTO_BOARD_01',
  ]),
  visualReady: Object.freeze([
    'POLAROID_CAMERA_01',
    'STANMORE_SPEAKER_01',
    'PHOTO_WALL_PHOTOS',
  ]),
  tier2: Object.freeze([]),
  tier3: Object.freeze([
    'MACBOOK_HOME_PAGE',
    'FOOTPRINTS_EARTH',
    'STUDIO_AUDIO_MEDIA',
  ]),
})

export const VISUAL_READY_ASSETS = Object.freeze([
  Object.freeze({
    id: 'POLAROID_CAMERA_01',
    kind: 'accepted-visible-desk-prop',
    resourceKey: 'polaroidCameraUrl',
  }),
  Object.freeze({
    id: 'STANMORE_SPEAKER_01',
    kind: 'accepted-visible-desk-prop',
    resourceKey: 'speakerUrl',
  }),
  Object.freeze({
    id: 'PHOTO_WALL_PHOTOS',
    kind: 'accepted-room-quality-photo-wall',
    resourceKey: 'photoManifestUrl',
  }),
])

export const ENTRY_CRITICAL_ASSETS = Object.freeze([
  Object.freeze({
    id: 'ROOM_ENVIRONMENT',
    kind: 'environment',
    resourceKey: 'roomUrl',
    semanticIds: Object.freeze(['ROOM_ENVIRONMENT']),
  }),
  Object.freeze({
    id: 'MACBOOK_ISLAND_01',
    kind: 'placement',
    resourceKey: 'macbookUrl',
    semanticIds: Object.freeze(['MACBOOK_ISLAND_01']),
  }),
  Object.freeze({
    id: 'PHOTO_BOARD_01',
    kind: 'photo-board-base',
    resourceKey: 'photoBoardUrl',
    semanticIds: Object.freeze(['PHOTO_BOARD_01', 'PHOTO_BOARD_SURFACE', 'PHOTO_BOARD_FRAME']),
  }),
])

export const ENTRY_READY_CONDITIONS = Object.freeze([
  'texturesReady',
  'materialsReady',
  'anchorsReady',
  'worldMatricesReady',
  'shadowsReady',
  'openingVisibleGroupsReady',
  'shaderReady',
  'warmupReady',
])

export const STUDIO_V2_ENTRY_PROGRESS_WEIGHTS = Object.freeze({
  assets: Object.freeze({
    ROOM_ENVIRONMENT: 49,
    MACBOOK_ISLAND_01: 7,
    PHOTO_BOARD_01: 1,
  }),
  visualAssets: Object.freeze({
    POLAROID_CAMERA_01: 26,
    STANMORE_SPEAKER_01: 8,
    PHOTO_WALL_PHOTOS: 3,
  }),
  conditions: Object.freeze(Object.fromEntries(
    ENTRY_READY_CONDITIONS.map((condition) => [condition, 0.75]),
  )),
})

export const ENTRY_FUTURE_ASSET_KINDS = Object.freeze([
  'photos',
  'map',
  'project-tray',
  'desktop-pet',
  'opening-visible-prop',
])

function assetUrl(definition, deliveryConfig) {
  return deliveryConfig[definition.resourceKey]
    ?? deliveryConfig[definition.fallbackResourceKey]
    ?? null
}

export function resolveStudioV2EntryManifest(deliveryConfig) {
  return ENTRY_CRITICAL_ASSETS.map((definition) => Object.freeze({
    ...definition,
    url: assetUrl(definition, deliveryConfig),
  }))
}

export function resolveStudioV2EntryRequests(deliveryConfig) {
  const requestsByUrl = new Map()
  resolveStudioV2EntryManifest(deliveryConfig).forEach(({ id, url }) => {
    if (!url) return
    if (!requestsByUrl.has(url)) requestsByUrl.set(url, [])
    requestsByUrl.get(url).push(id)
  })
  return [...requestsByUrl].map(([url, assetIds]) => Object.freeze({
    assetIds: Object.freeze(assetIds),
    url,
  }))
}

export function resolveStudioV2VisualReadyManifest(deliveryConfig) {
  return VISUAL_READY_ASSETS.map((definition) => Object.freeze({
    ...definition,
    url: assetUrl(definition, deliveryConfig),
  }))
}

function safeDelay(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(8000, Math.max(0, parsed)) : 0
}

export function studioV2EntryTestConfig(searchParams, enabled, attempt = 0) {
  if (!enabled) return Object.freeze({ delays: Object.freeze({}), failAsset: null })
  const delays = Object.freeze({
    ROOM_ENVIRONMENT: safeDelay(searchParams.get('entryDelayRoom')),
    MACBOOK_ISLAND_01: safeDelay(searchParams.get('entryDelayMacbook')),
  })
  const requestedFailure = searchParams.get('entryFail')
  const failAsset = attempt === 0
    && ENTRY_CRITICAL_ASSETS.some(({ id }) => id === requestedFailure)
    ? requestedFailure
    : null
  return Object.freeze({ delays, failAsset })
}

function statusMap(keys, initialValue) {
  return Object.fromEntries(keys.map((key) => [key, initialValue]))
}

function normalizedProgress(value) {
  const numericValue = typeof value === 'object' && value !== null
    ? Number(value.total) > 0
      ? Number(value.loaded) / Number(value.total) * 100
      : 0
    : Number(value)
  return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 0
}

function weightedEntryProgress(assetProgress, visualAssetProgress, conditions) {
  const weightedProgress = [
    ...Object.entries(STUDIO_V2_ENTRY_PROGRESS_WEIGHTS.assets).map(([id, weight]) => (
      weight * normalizedProgress(assetProgress[id]) / 100
    )),
    ...Object.entries(STUDIO_V2_ENTRY_PROGRESS_WEIGHTS.visualAssets).map(([id, weight]) => (
      weight * normalizedProgress(visualAssetProgress[id]) / 100
    )),
    ...Object.entries(STUDIO_V2_ENTRY_PROGRESS_WEIGHTS.conditions).map(([id, weight]) => (
      conditions[id] ? weight : 0
    )),
  ].reduce((total, value) => total + value, 0)
  return Number(Math.min(100, weightedProgress).toFixed(1))
}

export function createStudioV2EntryGate({
  deliveryConfig,
  onChange,
  startedAt = performance.now(),
  testConfig = { delays: {}, failAsset: null },
} = {}) {
  const manifest = resolveStudioV2EntryManifest(deliveryConfig)
  const assets = statusMap(manifest.map(({ id }) => id), 'pending')
  const assetProgress = statusMap(manifest.map(({ id }) => id), 0)
  const visualManifest = resolveStudioV2VisualReadyManifest(deliveryConfig)
  const visualAssets = statusMap(visualManifest.map(({ id }) => id), 'pending')
  const visualAssetProgress = statusMap(visualManifest.map(({ id }) => id), 0)
  const conditions = statusMap(ENTRY_READY_CONDITIONS, false)
  const timeline = []
  let error = null
  let phase = 'loading'
  let sceneReady = false
  let sceneReadyAtMs = null
  let visualReady = false
  let visualReadyAtMs = null
  let interactionsEnabled = false

  const elapsed = () => Number((performance.now() - startedAt).toFixed(1))
  const record = (event, detail = null) => {
    timeline.push({ atMs: elapsed(), detail, event })
  }

  const snapshot = () => {
    const completedVisualAssets = Object.values(visualAssets).filter((value) => value === 'ready').length
    return {
      anchorsReady: conditions.anchorsReady,
      assetProgress: { ...assetProgress },
      assets: { ...assets },
      completeReadyMs: sceneReadyAtMs,
      conditions: { ...conditions },
      error: error ? { assetId: error.assetId ?? null, message: error.message } : null,
      interactionsEnabled,
      macBookReady: assets.MACBOOK_ISLAND_01 === 'ready',
      photoBoardReady: assets.PHOTO_BOARD_01 === 'ready',
      photoWallReady: visualAssets.PHOTO_WALL_PHOTOS === 'ready',
      polaroidCameraReady: visualAssets.POLAROID_CAMERA_01 === 'ready',
      speakerReady: visualAssets.STANMORE_SPEAKER_01 === 'ready',
      manifest,
      materialsReady: conditions.materialsReady,
      phase,
      progress: weightedEntryProgress(assetProgress, visualAssetProgress, conditions),
      requests: resolveStudioV2EntryRequests(deliveryConfig),
      roomReady: assets.ROOM_ENVIRONMENT === 'ready',
      sceneReady,
      sceneReadyAtMs,
      shaderReady: conditions.shaderReady,
      testConfig,
      texturesReady: conditions.texturesReady,
      timeline: timeline.map((entry) => ({ ...entry })),
      visualAssets: { ...visualAssets },
      visualAssetProgress: { ...visualAssetProgress },
      visualManifest,
      visualProgress: visualManifest.length > 0
        ? Number((completedVisualAssets / visualManifest.length * 100).toFixed(1))
        : 100,
      visualReady,
      visualReadyAtMs,
      visualReadyDelayMs: visualReadyAtMs === null || sceneReadyAtMs === null
        ? null
        : Number((visualReadyAtMs - sceneReadyAtMs).toFixed(1)),
      warmupReady: conditions.warmupReady,
      worldMatricesReady: conditions.worldMatricesReady,
    }
  }

  const emit = () => onChange?.(snapshot())
  record('gate-created', { requests: resolveStudioV2EntryRequests(deliveryConfig).length })
  emit()

  return {
    fail(assetId, failure) {
      if (visualReady || error) return snapshot()
      error = failure instanceof Error ? failure : new Error(String(failure))
      error.assetId = assetId ?? error.assetId ?? null
      if (assetId && assetId in assets) assets[assetId] = 'error'
      if (assetId && assetId in visualAssets) visualAssets[assetId] = 'error'
      phase = 'error'
      record('critical-error', { assetId: error.assetId, message: error.message })
      emit()
      return snapshot()
    },
    markAssetReady(assetId, detail = null) {
      if (error || (!(assetId in assets) && !(assetId in visualAssets))) return snapshot()
      if (assetId in assets) {
        assets[assetId] = 'ready'
        assetProgress[assetId] = 100
      }
      if (assetId in visualAssets) {
        visualAssets[assetId] = 'ready'
        visualAssetProgress[assetId] = 100
      }
      record('asset-ready', { assetId, ...detail })
      emit()
      return snapshot()
    },
    markAssetProgress(assetId, progress) {
      if (error) return snapshot()
      const progressMap = assetId in assetProgress
        ? assetProgress
        : assetId in visualAssetProgress
          ? visualAssetProgress
          : null
      if (!progressMap) return snapshot()
      const nextProgress = normalizedProgress(progress)
      if (nextProgress <= progressMap[assetId]) return snapshot()
      progressMap[assetId] = nextProgress
      emit()
      return snapshot()
    },
    markCondition(condition, detail = null) {
      if (!(condition in conditions) || error) return snapshot()
      conditions[condition] = true
      record('condition-ready', { condition, ...detail })
      emit()
      return snapshot()
    },
    markSceneReady() {
      if (error) return snapshot()
      const missingAssets = Object.entries(assets).filter(([, status]) => status !== 'ready')
      const missingConditions = Object.entries(conditions).filter(([, ready]) => !ready)
      if (missingAssets.length || missingConditions.length) {
        return this.fail(null, new Error('Scene Ready Gate completed before all requirements were satisfied.'))
      }
      sceneReady = true
      sceneReadyAtMs = elapsed()
      phase = 'scene-ready'
      record('scene-ready')
      emit()
      return snapshot()
    },
    markVisualReady(detail = null) {
      if (error || !sceneReady) return snapshot()
      const missingAssets = Object.entries(visualAssets).filter(([, status]) => status !== 'ready')
      if (missingAssets.length) {
        return this.fail(null, new Error('Visual Ready completed before all accepted visible props were ready.'))
      }
      visualReady = true
      visualReadyAtMs = elapsed()
      interactionsEnabled = true
      phase = 'ready'
      record('visual-ready', detail)
      emit()
      return snapshot()
    },
    setPhase(nextPhase) {
      if (error || sceneReady) return snapshot()
      phase = nextPhase
      record('phase', { phase })
      emit()
      return snapshot()
    },
    snapshot,
  }
}

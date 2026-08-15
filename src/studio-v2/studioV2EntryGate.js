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
    id: 'MARSHALL_GUITAR_FLOOR_01',
    kind: 'placement',
    dependsOn: Object.freeze(['MARSHALL_AMP', 'GIBSON_GUITAR']),
    semanticIds: Object.freeze(['MARSHALL_GUITAR_FLOOR_01']),
  }),
  Object.freeze({
    id: 'MARSHALL_AMP',
    kind: 'prop',
    resourceKey: 'marshallUrl',
    fallbackResourceKey: 'musicUrl',
    semanticIds: Object.freeze(['MARSHALL_AMP']),
  }),
  Object.freeze({
    id: 'GIBSON_GUITAR',
    kind: 'prop',
    resourceKey: 'guitarUrl',
    fallbackResourceKey: 'musicUrl',
    semanticIds: Object.freeze(['GIBSON_GUITAR']),
  }),
  Object.freeze({
    id: 'MARSHALL_RADIO_PANEL_01',
    kind: 'opening-visible-world-ui',
    semanticIds: Object.freeze(['MARSHALL_RADIO_PANEL_01']),
  }),
  Object.freeze({
    id: 'PHOTO_BOARD_01',
    kind: 'photo-board-base',
    resourceKey: 'photoBoardUrl',
    semanticIds: Object.freeze(['PHOTO_BOARD_01', 'PHOTO_BOARD_SURFACE', 'PHOTO_BOARD_FRAME']),
  }),
  Object.freeze({
    id: 'POLAROID_CAMERA_01',
    kind: 'opening-visible-prop',
    resourceKey: 'polaroidCameraUrl',
    semanticIds: Object.freeze(['POLAROID_CAMERA_01']),
  }),
  Object.freeze({
    id: 'DOCUMENT_FOLDER_01',
    kind: 'opening-visible-prop',
    resourceKey: 'documentFolderUrl',
    semanticIds: Object.freeze(['DOCUMENT_FOLDER_01']),
  }),
  Object.freeze({
    id: 'COFFEE_CUP_01',
    kind: 'opening-visible-prop',
    resourceKey: 'coffeeCupUrl',
    semanticIds: Object.freeze(['COFFEE_CUP_01']),
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

function safeDelay(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(8000, Math.max(0, parsed)) : 0
}

export function studioV2EntryTestConfig(searchParams, enabled, attempt = 0) {
  if (!enabled) return Object.freeze({ delays: Object.freeze({}), failAsset: null })
  const musicDelay = safeDelay(searchParams.get('entryDelayMusic'))
  const delays = Object.freeze({
    ROOM_ENVIRONMENT: safeDelay(searchParams.get('entryDelayRoom')),
    MACBOOK_ISLAND_01: safeDelay(searchParams.get('entryDelayMacbook')),
    MARSHALL_AMP: safeDelay(searchParams.get('entryDelayMarshall') ?? musicDelay),
    GIBSON_GUITAR: safeDelay(searchParams.get('entryDelayGuitar') ?? musicDelay),
    MARSHALL_RADIO_PANEL_01: safeDelay(searchParams.get('entryDelayRadioPanel')),
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

export function createStudioV2EntryGate({
  deliveryConfig,
  onChange,
  startedAt = performance.now(),
  testConfig = { delays: {}, failAsset: null },
} = {}) {
  const manifest = resolveStudioV2EntryManifest(deliveryConfig)
  const assets = statusMap(manifest.map(({ id }) => id), 'pending')
  const conditions = statusMap(ENTRY_READY_CONDITIONS, false)
  const timeline = []
  let error = null
  let phase = 'loading'
  let sceneReady = false
  let sceneReadyAtMs = null
  let interactionsEnabled = false

  const elapsed = () => Number((performance.now() - startedAt).toFixed(1))
  const record = (event, detail = null) => {
    timeline.push({ atMs: elapsed(), detail, event })
  }

  const snapshot = () => {
    const completedAssets = Object.values(assets).filter((value) => value === 'ready').length
    const completedConditions = Object.values(conditions).filter(Boolean).length
    const total = Object.keys(assets).length + Object.keys(conditions).length
    const completed = completedAssets + completedConditions
    return {
      anchorsReady: conditions.anchorsReady,
      assets: { ...assets },
      completeReadyMs: sceneReadyAtMs,
      conditions: { ...conditions },
      error: error ? { assetId: error.assetId ?? null, message: error.message } : null,
      guitarReady: assets.GIBSON_GUITAR === 'ready',
      interactionsEnabled,
      macBookReady: assets.MACBOOK_ISLAND_01 === 'ready',
      photoBoardReady: assets.PHOTO_BOARD_01 === 'ready',
      polaroidCameraReady: assets.POLAROID_CAMERA_01 === 'ready',
      documentFolderReady: assets.DOCUMENT_FOLDER_01 === 'ready',
      coffeeCupReady: assets.COFFEE_CUP_01 === 'ready',
      manifest,
      marshallGroupReady: assets.MARSHALL_GUITAR_FLOOR_01 === 'ready',
      marshallReady: assets.MARSHALL_AMP === 'ready',
      radioPanelReady: assets.MARSHALL_RADIO_PANEL_01 === 'ready',
      materialsReady: conditions.materialsReady,
      phase,
      progress: total > 0 ? Number((completed / total * 100).toFixed(1)) : 0,
      requests: resolveStudioV2EntryRequests(deliveryConfig),
      roomReady: assets.ROOM_ENVIRONMENT === 'ready',
      sceneReady,
      shaderReady: conditions.shaderReady,
      testConfig,
      texturesReady: conditions.texturesReady,
      timeline: timeline.map((entry) => ({ ...entry })),
      warmupReady: conditions.warmupReady,
      worldMatricesReady: conditions.worldMatricesReady,
    }
  }

  const emit = () => onChange?.(snapshot())
  record('gate-created', { requests: resolveStudioV2EntryRequests(deliveryConfig).length })
  emit()

  return {
    fail(assetId, failure) {
      if (sceneReady || error) return snapshot()
      error = failure instanceof Error ? failure : new Error(String(failure))
      error.assetId = assetId ?? error.assetId ?? null
      if (assetId && assetId in assets) assets[assetId] = 'error'
      phase = 'error'
      record('critical-error', { assetId: error.assetId, message: error.message })
      emit()
      return snapshot()
    },
    markAssetReady(assetId, detail = null) {
      if (!(assetId in assets) || error) return snapshot()
      assets[assetId] = 'ready'
      record('asset-ready', { assetId, ...detail })
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
      interactionsEnabled = true
      phase = 'ready'
      record('scene-ready')
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

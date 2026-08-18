const DEFAULT_CATALOGUE_URL = '/audio/fred-studio/catalog.published.json'

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  catalogueStatus: 'idle',
  catalogueUrl: DEFAULT_CATALOGUE_URL,
  defaultTrackId: null,
  trackId: null,
  trackTitle: null,
  currentTime: 0,
  duration: null,
  volume: 1,
  paused: true,
  rampOwnerCount: 0,
  loop: false,
  error: null,
  errorCode: null,
  tracks: [],
  audioElementCount: 1,
  debugFixtureCount: null,
  entryStatus: 'idle',
  entryStartedAt: null,
  entryPlaybackStartedAt: null,
  entryFadeDurationMs: 4500,
  entryTargetVolume: 0.1,
  autoplayPolicy: 'untested',
  fallbackArmed: false,
  firstGestureFallbackUsed: false,
  fallbackConsumed: false,
  playAttemptState: 'idle',
  latestPlayPromiseResult: 'none',
  latestMediaError: null,
  manualIntentState: 'none',
})

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback
}

function validateTrack(track, index) {
  if (!track || typeof track !== 'object') {
    throw new Error(`Catalogue track ${index} must be an object.`)
  }
  const requiredStrings = ['id', 'title', 'version', 'artist', 'file']
  requiredStrings.forEach((field) => {
    if (typeof track[field] !== 'string' || !track[field].trim()) {
      throw new Error(`Catalogue track ${index} is missing ${field}.`)
    }
  })
  if (typeof track.enabled !== 'boolean') {
    throw new Error(`Catalogue track ${track.id} is missing enabled.`)
  }
  if (typeof track.loop !== 'boolean') {
    throw new Error(`Catalogue track ${track.id} is missing loop.`)
  }
  if (!Number.isFinite(track.volume) || track.volume < 0 || track.volume > 1) {
    throw new Error(`Catalogue track ${track.id} has an invalid volume.`)
  }
  if (track.cover !== null && track.cover !== undefined && typeof track.cover !== 'string') {
    throw new Error(`Catalogue track ${track.id} has an invalid cover.`)
  }
  return Object.freeze({ ...track })
}

function validateCatalogue(value) {
  if (!value || typeof value !== 'object') throw new Error('Catalogue must be an object.')
  if (!Number.isFinite(value.version)) throw new Error('Catalogue version is missing.')
  if (!Array.isArray(value.tracks)) throw new Error('Catalogue tracks must be an array.')
  const tracks = value.tracks.map(validateTrack)
  const ids = new Set(tracks.map(({ id }) => id))
  if (ids.size !== tracks.length) throw new Error('Catalogue track IDs must be unique.')
  if (tracks.length === 0 && value.defaultTrackId === null) {
    return Object.freeze({
      version: value.version,
      defaultTrackId: null,
      tracks: Object.freeze([]),
    })
  }
  if (typeof value.defaultTrackId !== 'string' || !value.defaultTrackId) {
    throw new Error('Catalogue defaultTrackId is missing.')
  }
  const defaultTrack = tracks.find(({ id }) => id === value.defaultTrackId)
  if (!defaultTrack) throw new Error(`Default track ${value.defaultTrackId} was not found.`)
  if (!defaultTrack.enabled) throw new Error(`Default track ${value.defaultTrackId} is disabled.`)
  return Object.freeze({
    version: value.version,
    defaultTrackId: value.defaultTrackId,
    tracks: Object.freeze(tracks),
  })
}

function mediaErrorMessage(mediaError) {
  const reasons = {
    1: 'Audio loading was aborted.',
    2: 'The audio file could not be loaded.',
    3: 'The audio file could not be decoded.',
    4: 'The audio codec or source is not supported.',
  }
  return reasons[mediaError?.code] ?? 'The audio element reported an unknown error.'
}

export function createStudioV2AudioController({
  catalogueUrl = DEFAULT_CATALOGUE_URL,
  fetchImpl = (...args) => globalThis.fetch(...args),
  createAudioElement = () => new globalThis.Audio(),
  gestureTarget = globalThis.window,
} = {}) {
  const audio = createAudioElement()
  audio.autoplay = false
  audio.preload = 'none'

  const listeners = new Set()
  let catalogue = null
  let cataloguePromise = null
  let catalogueAbortController = null
  let selectedTrack = null
  let togglePromise = null
  let destroyed = false
  let fadeFrame = null
  let fallbackArmed = false
  let trustedGesturePromise = null
  let lastFallbackGestureAt = -Infinity
  let manualIntentRevision = 0
  let state = {
    ...INITIAL_STATE,
    catalogueUrl,
  }

  const snapshot = () => Object.freeze({
    ...state,
    audioElementExists: Boolean(audio),
    src: audio.currentSrc || audio.src || '',
    readyState: audio.readyState,
    networkState: audio.networkState,
    paused: audio.paused,
    ended: audio.ended,
    muted: audio.muted,
    volume: audio.volume,
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    activeVolumeRamp: fadeFrame !== null,
    tracks: state.tracks.map((track) => ({ ...track })),
  })

  const publish = (patch) => {
    if (destroyed) return snapshot()
    state = { ...state, ...patch }
    const next = snapshot()
    listeners.forEach((listener) => listener(next))
    return next
  }

  const setError = (error, fallback = 'Audio operation failed.', errorCode = null) => publish({
    status: 'error',
    error: errorMessage(error, fallback),
    errorCode,
  })

  const syncTime = () => publish({
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
  })
  const handleLoadedMetadata = () => publish({
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    duration: Number.isFinite(audio.duration) ? audio.duration : null,
    status: state.status === 'track-loading' ? 'ready' : state.status,
  })
  const handlePlaying = () => publish({ status: 'playing', paused: false, error: null, errorCode: null })
  const handlePause = () => {
    if (!selectedTrack || state.status === 'ready' || state.status === 'error') return
    publish({ status: 'paused', paused: true, currentTime: audio.currentTime })
  }
  const handleEnded = () => publish({
    status: 'ready',
    paused: true,
    currentTime: Number.isFinite(audio.duration) ? audio.duration : audio.currentTime,
  })
  const handleAudioError = () => {
    const message = mediaErrorMessage(audio.error)
    publish({ latestMediaError: message })
    setError(new Error(message), 'Audio playback failed.', 'AUDIO_MEDIA_ERROR')
  }

  const audioEvents = {
    durationchange: syncTime,
    ended: handleEnded,
    error: handleAudioError,
    loadedmetadata: handleLoadedMetadata,
    pause: handlePause,
    playing: handlePlaying,
    timeupdate: syncTime,
  }
  Object.entries(audioEvents).forEach(([eventName, listener]) => {
    audio.addEventListener(eventName, listener)
  })

  async function loadCatalogue({ force = false, timeoutMs = null } = {}) {
    if (destroyed) return snapshot()
    if (catalogue && !force) return snapshot()
    if (cataloguePromise && !force) return cataloguePromise

    if (force && selectedTrack) {
      audio.pause()
      selectedTrack = null
      audio.removeAttribute('src')
      audio.load()
      publish({
        status: 'idle',
        trackId: null,
        trackTitle: null,
        defaultTrackId: null,
        currentTime: 0,
        duration: null,
        volume: 1,
        loop: false,
        error: null,
        errorCode: null,
      })
    }

    catalogueAbortController?.abort()
    catalogueAbortController = new AbortController()
    const requestAbortController = catalogueAbortController
    let timedOut = false
    const requestTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? globalThis.setTimeout(() => {
        timedOut = true
        requestAbortController.abort()
      }, timeoutMs)
      : null
    publish({
      catalogueStatus: 'loading',
      status: selectedTrack ? state.status : 'catalog-loading',
      error: null,
      errorCode: null,
    })
    cataloguePromise = (async () => {
      try {
        const response = await fetchImpl(catalogueUrl, {
          cache: 'no-store',
          signal: catalogueAbortController.signal,
        })
        if (!response.ok) {
          throw new Error(`Audio catalogue request failed with ${response.status}.`)
        }
        const nextCatalogue = validateCatalogue(await response.json())
        if (destroyed) return snapshot()
        catalogue = nextCatalogue
        if (catalogue.defaultTrackId === null) {
          return publish({
            catalogueStatus: 'empty',
            status: 'unavailable',
            defaultTrackId: null,
            tracks: [],
            error: 'NO_PUBLISHED_TRACK',
            errorCode: 'NO_PUBLISHED_TRACK',
          })
        }
        return publish({
          catalogueStatus: 'ready',
          status: selectedTrack ? state.status : 'idle',
          defaultTrackId: catalogue.defaultTrackId,
          tracks: catalogue.tracks.map(({ id, title, version, artist, cover, enabled }) => ({
            id,
            title,
            version,
            artist,
            cover: cover ?? null,
            enabled,
          })),
          error: null,
          errorCode: null,
        })
      } catch (error) {
        if (destroyed || (error?.name === 'AbortError' && !timedOut)) return snapshot()
        catalogue = null
        publish({ catalogueStatus: 'error' })
        if (timedOut) {
          return setError(
            new Error(`Audio catalogue request timed out after ${timeoutMs} ms.`),
            'Audio catalogue could not be loaded.',
            'CATALOGUE_TIMEOUT',
          )
        }
        return setError(error, 'Audio catalogue could not be loaded.')
      } finally {
        if (requestTimeout !== null) globalThis.clearTimeout(requestTimeout)
        cataloguePromise = null
      }
    })()
    return cataloguePromise
  }

  async function setTrack(trackId, { preload = true } = {}) {
    if (destroyed) return snapshot()
    if (!catalogue) await loadCatalogue()
    if (!catalogue) return snapshot()
    const nextTrack = catalogue.tracks.find(({ id }) => id === trackId)
    if (!nextTrack) return setError(new Error(`Track ${trackId} was not found.`))
    if (!nextTrack.enabled) return setError(new Error(`Track ${trackId} is disabled.`))
    if (selectedTrack?.id === nextTrack.id) return snapshot()

    audio.pause()
    selectedTrack = nextTrack
    audio.src = nextTrack.file
    audio.preload = preload ? 'auto' : 'none'
    audio.loop = nextTrack.loop
    audio.volume = 0
    audio.currentTime = 0
    publish({
      status: 'track-loading',
      trackId: nextTrack.id,
      trackTitle: nextTrack.title,
      currentTime: 0,
      duration: null,
      volume: 0,
      paused: true,
      loop: nextTrack.loop,
      error: null,
      errorCode: null,
    })
    if (preload) audio.load()
    return snapshot()
  }

  function setDebugCatalogueFixture(count) {
    if (destroyed || !catalogue || !Number.isInteger(count) || count < 1) return snapshot()
    const enabled = catalogue.tracks.filter(({ enabled }) => enabled)
    if (enabled.length === 0) return snapshot()
    const seed = enabled[0]
    const fixtureTracks = Array.from({ length: count }, (_, index) => Object.freeze({
      ...seed,
      id: index === 0 ? seed.id : `debug-fixture-${index + 1}`,
      title: index === 0 ? seed.title : `Studio Test Track ${String(index + 1).padStart(2, '0')}`,
      artist: index === 0 ? seed.artist : 'Debug catalogue fixture',
      debugFixture: index > 0,
    }))
    catalogue = Object.freeze({
      version: catalogue.version,
      defaultTrackId: fixtureTracks[0].id,
      tracks: Object.freeze(fixtureTracks),
    })
    return publish({
      catalogueStatus: 'ready',
      defaultTrackId: catalogue.defaultTrackId,
      debugFixtureCount: count,
      tracks: fixtureTracks.map(({
        id,
        title,
        version,
        artist,
        cover,
        enabled: trackEnabled,
        debugFixture,
      }) => ({
        id,
        title,
        version,
        artist,
        cover: cover ?? null,
        enabled: trackEnabled,
        debugFixture: Boolean(debugFixture),
      })),
    })
  }

  async function loadDefaultTrack() {
    if (!catalogue) await loadCatalogue()
    if (!catalogue) return snapshot()
    if (catalogue.defaultTrackId === null) {
      return publish({
        catalogueStatus: 'empty',
        status: 'unavailable',
        error: 'NO_PUBLISHED_TRACK',
        errorCode: 'NO_PUBLISHED_TRACK',
      })
    }
    return setTrack(catalogue.defaultTrackId)
  }

  async function play() {
    manualIntentRevision += 1
    publish({ manualIntentState: 'play', playAttemptState: 'attempting', latestPlayPromiseResult: 'pending' })
    disarmFallback()
    if (destroyed) return snapshot()
    if (!selectedTrack) await loadDefaultTrack()
    if (!selectedTrack || state.status === 'error') return snapshot()
    audio.preload = 'auto'
    try {
      await audio.play()
      if (audio.volume === 0) audio.volume = Math.min(0.1, selectedTrack?.volume ?? 0.1)
      return publish({
        status: 'playing', paused: false, error: null, errorCode: null,
        playAttemptState: 'playing', latestPlayPromiseResult: 'resolved',
      })
    } catch (error) {
      publish({ playAttemptState: 'failed', latestPlayPromiseResult: `rejected:${error?.name ?? 'Error'}` })
      return setError(error, 'Audio playback was rejected.', 'AUDIO_PLAYBACK_FAILED')
    }
  }

  function pause() {
    if (destroyed || !selectedTrack) return snapshot()
    manualIntentRevision += 1
    publish({ manualIntentState: 'pause' })
    disarmFallback()
    audio.pause()
    return publish({
      status: 'paused',
      paused: true,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    })
  }

  function stop() {
    if (destroyed || !selectedTrack) return snapshot()
    manualIntentRevision += 1
    publish({ manualIntentState: 'stop' })
    disarmFallback()
    audio.pause()
    try {
      audio.currentTime = 0
    } catch {
      // Some browsers reject currentTime changes before metadata exists.
    }
    return publish({ status: 'ready', paused: true, currentTime: 0 })
  }

  function toggle() {
    if (destroyed) return Promise.resolve(snapshot())
    if (togglePromise) return togglePromise
    togglePromise = (async () => {
      if (performance.now() - lastFallbackGestureAt < 300) return snapshot()
      if (state.status === 'playing' || !audio.paused) return pause()
      return play()
    })().finally(() => {
      togglePromise = null
    })
    return togglePromise
  }

  async function moveTrack(direction) {
    if (!catalogue) await loadCatalogue()
    if (!catalogue) return snapshot()
    const enabledTracks = catalogue.tracks.filter(({ enabled }) => enabled)
    if (!enabledTracks.length) return setError(new Error('No enabled audio tracks are available.'))
    const currentIndex = enabledTracks.findIndex(({ id }) => id === selectedTrack?.id)
    const origin = currentIndex < 0 ? 0 : currentIndex
    const nextIndex = (origin + direction + enabledTracks.length) % enabledTracks.length
    return setTrack(enabledTracks[nextIndex].id)
  }

  function destroy() {
    if (destroyed) return
    audio.pause()
    if (fadeFrame !== null) cancelAnimationFrame(fadeFrame)
    disarmFallback()
    destroyed = true
    catalogueAbortController?.abort()
    Object.entries(audioEvents).forEach(([eventName, listener]) => {
      audio.removeEventListener(eventName, listener)
    })
    audio.removeAttribute('src')
    audio.load()
    listeners.clear()
    catalogue = null
    selectedTrack = null
  }

  function fadeToEntryVolume(startedAt, durationMs = 4500) {
    if (fadeFrame !== null) {
      cancelAnimationFrame(fadeFrame)
      fadeFrame = null
    }
    const targetVolume = Math.min(0.1, selectedTrack?.volume ?? 0.1)
    const tick = (now) => {
      if (destroyed || audio.paused) {
        fadeFrame = null
        publish({ rampOwnerCount: 0 })
        return
      }
      const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs))
      const eased = 1 - (1 - progress) ** 3
      audio.volume = targetVolume * eased
      publish({ volume: audio.volume, rampOwnerCount: progress < 1 ? 1 : 0 })
      if (progress < 1) fadeFrame = requestAnimationFrame(tick)
      else fadeFrame = null
    }
    fadeFrame = requestAnimationFrame(tick)
    publish({ rampOwnerCount: 1 })
  }

  function disarmFallback() {
    if (!fallbackArmed) return
    fallbackArmed = false
    gestureTarget?.removeEventListener?.('click', handleFirstGesture, true)
    gestureTarget?.removeEventListener?.('touchend', handleFirstGesture, true)
    gestureTarget?.removeEventListener?.('keydown', handleFirstGesture, true)
    publish({ fallbackArmed: false })
  }

  function handleFirstGesture() {
    if (!fallbackArmed || destroyed || trustedGesturePromise) return trustedGesturePromise
    trustedGesturePromise = (async () => {
      lastFallbackGestureAt = performance.now()
      publish({ fallbackConsumed: true, playAttemptState: 'gesture-attempting', latestPlayPromiseResult: 'pending' })
      try {
        if (!selectedTrack) await prepareEntry()
        if (!selectedTrack) return snapshot()
        audio.preload = 'auto'
        await audio.play()
        disarmFallback()
        const playbackStartedAt = performance.now()
        fadeToEntryVolume(playbackStartedAt)
        return publish({
          status: 'playing', paused: false, entryStatus: 'playing-after-gesture',
          entryPlaybackStartedAt: playbackStartedAt, firstGestureFallbackUsed: true,
          autoplayPolicy: 'trusted-gesture', error: null, errorCode: null,
          playAttemptState: 'playing', latestPlayPromiseResult: 'resolved',
        })
      } catch (error) {
        if (error?.name === 'NotAllowedError') {
          publish({
            status: 'ready', paused: true, entryStatus: 'waiting-for-gesture',
            autoplayPolicy: 'gesture-retry', fallbackArmed: true,
            playAttemptState: 'policy-blocked',
            latestPlayPromiseResult: 'rejected:NotAllowedError',
            error: null, errorCode: 'AUTOPLAY_POLICY_BLOCKED',
          })
          return snapshot()
        }
        disarmFallback()
        publish({ playAttemptState: 'failed', latestPlayPromiseResult: `rejected:${error?.name ?? 'Error'}` })
        return setError(error, 'Audio playback failed after user interaction.', 'AUDIO_PLAYBACK_FAILED')
      } finally {
        trustedGesturePromise = null
      }
    })()
    return trustedGesturePromise
  }

  function armFallback() {
    if (fallbackArmed || destroyed) return
    fallbackArmed = true
    gestureTarget?.addEventListener?.('click', handleFirstGesture, true)
    gestureTarget?.addEventListener?.('touchend', handleFirstGesture, true)
    gestureTarget?.addEventListener?.('keydown', handleFirstGesture, true)
    publish({ fallbackArmed: true })
  }

  async function prepareEntry() {
    await loadCatalogue()
    if (!catalogue?.defaultTrackId) return snapshot()
    await setTrack(catalogue.defaultTrackId, { preload: false })
    audio.volume = 0
    return publish({ entryStatus: 'prepared', volume: 0 })
  }

  function startEntryExperience({ timestamp = performance.now() } = {}) {
    if (destroyed || state.status === 'playing' || !audio.paused) return snapshot()
    publish({
      entryStatus: selectedTrack ? 'waiting-for-gesture' : 'preparing-for-gesture',
      entryStartedAt: state.entryStartedAt ?? timestamp,
      autoplayPolicy: 'gesture-required',
    })
    armFallback()
    if (!selectedTrack) {
      void prepareEntry().then(() => {
        if (!destroyed && fallbackArmed && selectedTrack) publish({ entryStatus: 'waiting-for-gesture' })
      })
    }
    return snapshot()
  }

  return Object.freeze({
    destroy,
    getState: snapshot,
    loadCatalogue,
    loadDefaultTrack,
    prepareEntry,
    startEntryExperience,
    next: () => moveTrack(1),
    pause,
    play,
    previous: () => moveTrack(-1),
    setDebugCatalogueFixture,
    setTrack,
    stop,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
    toggle,
  })
}

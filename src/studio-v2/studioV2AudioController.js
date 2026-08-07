const DEFAULT_CATALOGUE_URL = '/audio/fred-studio/catalog.published.json'

const INITIAL_STATE = Object.freeze({
  status: 'idle',
  catalogueStatus: 'idle',
  catalogueUrl: DEFAULT_CATALOGUE_URL,
  trackId: null,
  trackTitle: null,
  currentTime: 0,
  duration: null,
  volume: 1,
  loop: false,
  error: null,
  errorCode: null,
  tracks: [],
  audioElementCount: 1,
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
  let state = {
    ...INITIAL_STATE,
    catalogueUrl,
  }

  const snapshot = () => Object.freeze({
    ...state,
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
  const handlePlaying = () => publish({ status: 'playing', error: null, errorCode: null })
  const handlePause = () => {
    if (!selectedTrack || state.status === 'ready' || state.status === 'error') return
    publish({ status: 'paused', currentTime: audio.currentTime })
  }
  const handleEnded = () => publish({
    status: 'ready',
    currentTime: Number.isFinite(audio.duration) ? audio.duration : audio.currentTime,
  })
  const handleAudioError = () => setError(new Error(mediaErrorMessage(audio.error)))

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

  async function loadCatalogue({ force = false } = {}) {
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
            tracks: [],
            error: 'NO_PUBLISHED_TRACK',
            errorCode: 'NO_PUBLISHED_TRACK',
          })
        }
        return publish({
          catalogueStatus: 'ready',
          status: selectedTrack ? state.status : 'idle',
          tracks: catalogue.tracks.map(({ id, title, artist, enabled }) => ({
            id,
            title,
            artist,
            enabled,
          })),
          error: null,
          errorCode: null,
        })
      } catch (error) {
        if (destroyed || error?.name === 'AbortError') return snapshot()
        catalogue = null
        publish({ catalogueStatus: 'error' })
        return setError(error, 'Audio catalogue could not be loaded.')
      } finally {
        cataloguePromise = null
      }
    })()
    return cataloguePromise
  }

  async function setTrack(trackId) {
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
    audio.loop = nextTrack.loop
    audio.volume = nextTrack.volume
    audio.currentTime = 0
    publish({
      status: 'track-loading',
      trackId: nextTrack.id,
      trackTitle: nextTrack.title,
      currentTime: 0,
      duration: null,
      volume: nextTrack.volume,
      loop: nextTrack.loop,
      error: null,
      errorCode: null,
    })
    audio.load()
    return snapshot()
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
    if (destroyed) return snapshot()
    if (!selectedTrack) await loadDefaultTrack()
    if (!selectedTrack || state.status === 'error') return snapshot()
    try {
      await audio.play()
      return publish({ status: 'playing', error: null, errorCode: null })
    } catch (error) {
      return setError(error, 'Audio playback was rejected.')
    }
  }

  function pause() {
    if (destroyed || !selectedTrack) return snapshot()
    audio.pause()
    return publish({
      status: 'paused',
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    })
  }

  function stop() {
    if (destroyed || !selectedTrack) return snapshot()
    audio.pause()
    try {
      audio.currentTime = 0
    } catch {
      // Some browsers reject currentTime changes before metadata exists.
    }
    return publish({ status: 'ready', currentTime: 0 })
  }

  function toggle() {
    if (destroyed) return Promise.resolve(snapshot())
    if (togglePromise) return togglePromise
    togglePromise = (async () => {
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

  return Object.freeze({
    destroy,
    getState: snapshot,
    loadCatalogue,
    loadDefaultTrack,
    next: () => moveTrack(1),
    pause,
    play,
    previous: () => moveTrack(-1),
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

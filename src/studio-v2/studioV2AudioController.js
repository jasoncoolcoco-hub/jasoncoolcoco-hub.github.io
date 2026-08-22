const DEFAULT_CATALOGUE_URL = '/audio/fred-studio/catalog.published.json'
const TAIL_FADE_WINDOW_SECONDS = 10
const TAIL_SILENCE_WINDOW_SECONDS = 2
const TAIL_FADE_RESUME_RAMP_MS = 300

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
  rampSource: null,
  rampTargetVolume: null,
  fadePausePending: false,
  tailFadeActive: false,
  tailFadeStarted: false,
  tailFadeStartedAtMediaTime: null,
  tailSilenceLocked: false,
  tailFadeWindowSeconds: TAIL_FADE_WINDOW_SECONDS,
  tailSilenceWindowSeconds: TAIL_SILENCE_WINDOW_SECONDS,
  loop: false,
  error: null,
  errorCode: null,
  tracks: [],
  audioElementCount: 1,
  debugFixtureCount: null,
  entryStatus: 'idle',
  entryStartedAt: null,
  entryPlaybackStartedAt: null,
  entryFadeDurationMs: 1200,
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
} = {}) {
  const audio = createAudioElement()
  audio.autoplay = false
  audio.preload = 'none'

  const listeners = new Set()
  let catalogue = null
  let cataloguePromise = null
  let catalogueAbortController = null
  let selectedTrack = null
  let destroyed = false
  let fadeFrame = null
  let fadeResolve = null
  let fadeRevision = 0
  let manualIntentRevision = 0
  let playbackRequested = false
  let tailFadeSequenceRevision = 0
  let tailFadeStartedForPass = false
  let tailResumeVolume = null
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

  const syncTime = () => {
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0
    const duration = Number.isFinite(audio.duration) ? audio.duration : null
    const next = publish({ currentTime, duration })
    if (
      duration !== null
      && currentTime < duration - TAIL_FADE_WINDOW_SECONDS
      && tailFadeStartedForPass
      && !audio.paused
    ) {
      resetTailFadePass({ cancelRamp: true })
    }
    maybeStartTailFade()
    return next
  }
  const handleLoadedMetadata = () => {
    const next = publish({
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : null,
      status: state.status === 'track-loading' ? 'ready' : state.status,
    })
    maybeStartTailFade()
    return next
  }
  const handlePlaying = () => publish({ status: 'playing', paused: false, error: null, errorCode: null })
  const handlePause = () => {
    if (!selectedTrack || state.status === 'ready' || state.status === 'error') return
    publish({ status: 'paused', paused: true, currentTime: audio.currentTime })
  }
  const handleEnded = () => {
    playbackRequested = false
    tailFadeSequenceRevision += 1
    tailFadeStartedForPass = true
    tailResumeVolume = null
    cancelVolumeRamp()
    audio.volume = 0
    return publish({
      status: 'ready',
      paused: true,
      volume: 0,
      currentTime: Number.isFinite(audio.duration) ? audio.duration : audio.currentTime,
      tailFadeActive: false,
      tailSilenceLocked: true,
    })
  }
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
      playbackRequested = false
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

  async function setTrack(trackId, { preload = true, preservePlaybackRequest = false } = {}) {
    if (destroyed) return snapshot()
    if (!catalogue) await loadCatalogue()
    if (!catalogue) return snapshot()
    const nextTrack = catalogue.tracks.find(({ id }) => id === trackId)
    if (!nextTrack) return setError(new Error(`Track ${trackId} was not found.`))
    if (!nextTrack.enabled) return setError(new Error(`Track ${trackId} is disabled.`))
    if (selectedTrack?.id === nextTrack.id) return snapshot()

    resetTailFadePass({ cancelRamp: true })
    audio.pause()
    if (!preservePlaybackRequest) playbackRequested = false
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

  async function loadDefaultTrack({ preservePlaybackRequest = false } = {}) {
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
    return setTrack(catalogue.defaultTrackId, { preservePlaybackRequest })
  }

  async function play({ durationMs = 1200, source = 'manual-control' } = {}) {
    if (destroyed) return snapshot()
    const intentRevision = ++manualIntentRevision
    playbackRequested = true
    cancelTailFadeSequence({ rememberVolume: true })
    cancelVolumeRamp()
    publish({
      manualIntentState: 'play',
      playAttemptState: 'attempting',
      latestPlayPromiseResult: 'pending',
      error: null,
      errorCode: null,
    })
    if (!selectedTrack) await loadDefaultTrack({ preservePlaybackRequest: true })
    if (!selectedTrack || intentRevision !== manualIntentRevision || !playbackRequested) {
      return snapshot()
    }
    audio.preload = 'auto'
    try {
      if (getTailFadeTiming()?.isSilenceZone) lockTailSilence()
      if (audio.paused) await audio.play()
      if (intentRevision !== manualIntentRevision || !playbackRequested) {
        if (!playbackRequested && !audio.paused) audio.pause()
        return snapshot()
      }
      const playbackStartedAt = performance.now()
      const targetVolume = Math.min(0.1, selectedTrack?.volume ?? 0.1)
      publish({
        status: 'playing', paused: false, error: null, errorCode: null,
        playAttemptState: 'playing', latestPlayPromiseResult: 'resolved',
        entryStatus: 'playing-by-control',
        entryPlaybackStartedAt: state.entryPlaybackStartedAt ?? playbackStartedAt,
        autoplayPolicy: 'explicit-control',
      })
      const tailTiming = getTailFadeTiming()
      if (tailTiming?.isSilenceZone) {
        lockTailSilence()
      } else if (tailTiming) {
        void startTailFade({ force: true, resumeTargetVolume: targetVolume })
      } else {
        resetTailFadePass()
        void rampVolume({
          durationMs,
          source,
          targetVolume,
        })
      }
      return snapshot()
    } catch (error) {
      if (intentRevision !== manualIntentRevision || !playbackRequested) return snapshot()
      playbackRequested = false
      return publish({
        status: 'paused',
        paused: true,
        entryStatus: 'control-ready',
        autoplayPolicy: 'explicit-control-retry',
        playAttemptState: 'failed',
        latestPlayPromiseResult: `rejected:${error?.name ?? 'Error'}`,
        error: errorMessage(error, 'Audio playback was rejected.'),
        errorCode: 'AUDIO_PLAYBACK_FAILED',
      })
    }
  }

  function pause() {
    if (destroyed || !selectedTrack) return snapshot()
    manualIntentRevision += 1
    playbackRequested = false
    publish({ manualIntentState: 'pause' })
    cancelTailFadeSequence({ rememberVolume: true })
    cancelVolumeRamp()
    audio.pause()
    return publish({
      status: 'paused',
      paused: true,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      entryStatus: 'paused-by-control',
    })
  }

  function fadePause({ durationMs = 850, source = 'manual-control' } = {}) {
    if (destroyed) return Promise.resolve(snapshot())
    manualIntentRevision += 1
    playbackRequested = false
    if (!selectedTrack) return Promise.resolve(snapshot())
    cancelTailFadeSequence({ rememberVolume: true })
    if (audio.paused) {
      cancelVolumeRamp()
      return Promise.resolve(publish({
        status: 'paused',
        paused: true,
        fadePausePending: false,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      }))
    }
    return rampVolume({
      durationMs,
      source,
      targetVolume: 0,
      startPatch: {
        status: 'fading-out',
        paused: false,
        fadePausePending: true,
        manualIntentState: source === 'macbook-site-opening'
          ? state.manualIntentState
          : 'pause',
      },
      completePatch: () => {
        audio.pause()
        return {
          status: 'paused',
          paused: true,
          fadePausePending: false,
          currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
          entryStatus: source === 'macbook-site-opening'
            ? 'paused-by-macbook-site'
            : 'paused-by-control',
        }
      },
    })
  }

  function stop() {
    if (destroyed || !selectedTrack) return snapshot()
    manualIntentRevision += 1
    playbackRequested = false
    publish({ manualIntentState: 'stop' })
    resetTailFadePass()
    cancelVolumeRamp()
    audio.pause()
    try {
      audio.currentTime = 0
    } catch {
      // Some browsers reject currentTime changes before metadata exists.
    }
    return publish({ status: 'ready', paused: true, currentTime: 0, entryStatus: 'control-ready' })
  }

  function toggle({ fadeInMs = 1200, fadeOutMs = 850, source = 'manual-control' } = {}) {
    if (destroyed) return Promise.resolve(snapshot())
    if (!playbackRequested) return play({ durationMs: fadeInMs, source })
    return fadePause({ durationMs: fadeOutMs, source })
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
    playbackRequested = false
    tailFadeSequenceRevision += 1
    audio.pause()
    cancelVolumeRamp()
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

  function getTailFadeTiming() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : null
    const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : null
    if (duration === null || duration <= 0 || currentTime === null) return null
    const remainingSeconds = duration - currentTime
    if (remainingSeconds <= 0 || remainingSeconds > TAIL_FADE_WINDOW_SECONDS) return null
    return {
      duration,
      currentTime,
      remainingSeconds,
      isSilenceZone: remainingSeconds <= TAIL_SILENCE_WINDOW_SECONDS,
      fadeDurationMs: Math.max(
        1,
        (remainingSeconds - TAIL_SILENCE_WINDOW_SECONDS) * 1000,
      ),
    }
  }

  function cancelTailFadeSequence({ rememberVolume = false } = {}) {
    if (rememberVolume && tailFadeStartedForPass && getTailFadeTiming()) {
      const currentVolume = Math.max(0, Math.min(1, audio.volume))
      if (currentVolume > 0 || tailResumeVolume === null) tailResumeVolume = currentVolume
    }
    tailFadeSequenceRevision += 1
    if (!state.tailFadeActive) return snapshot()
    return publish({ tailFadeActive: false })
  }

  function resetTailFadePass({ cancelRamp = false } = {}) {
    const wasTailRamp = state.rampSource === 'track-tail-fade'
      || state.rampSource === 'track-tail-resume'
    tailFadeSequenceRevision += 1
    tailFadeStartedForPass = false
    tailResumeVolume = null
    if (cancelRamp && wasTailRamp) cancelVolumeRamp()
    return publish({
      tailFadeActive: false,
      tailFadeStarted: false,
      tailFadeStartedAtMediaTime: null,
      tailSilenceLocked: false,
    })
  }

  function lockTailSilence() {
    const timing = getTailFadeTiming()
    if (!timing?.isSilenceZone) return snapshot()
    const shouldPause = state.fadePausePending || !playbackRequested
    tailFadeSequenceRevision += 1
    tailFadeStartedForPass = true
    tailResumeVolume = 0
    if (audio.loop) audio.loop = false
    cancelVolumeRamp()
    audio.volume = 0
    if (shouldPause && !audio.paused) audio.pause()
    return publish({
      loop: false,
      volume: 0,
      tailFadeActive: false,
      tailFadeStarted: true,
      tailFadeStartedAtMediaTime: state.tailFadeStartedAtMediaTime ?? timing.currentTime,
      tailSilenceLocked: true,
    })
  }

  function maybeStartTailFade() {
    const timing = getTailFadeTiming()
    if (timing?.isSilenceZone) {
      lockTailSilence()
      return
    }
    if (
      destroyed
      || audio.paused
      || !playbackRequested
      || tailFadeStartedForPass
      || !timing
    ) return
    void startTailFade()
  }

  async function startTailFade({ force = false, resumeTargetVolume = null } = {}) {
    const timing = getTailFadeTiming()
    if (destroyed || audio.paused || !playbackRequested || !timing) return snapshot()
    if (timing.isSilenceZone) return lockTailSilence()
    if (tailFadeStartedForPass && !force) return snapshot()

    tailFadeStartedForPass = true
    const sequenceRevision = ++tailFadeSequenceRevision
    const targetVolume = Math.min(0.1, resumeTargetVolume ?? selectedTrack?.volume ?? 0.1)
    const expectedEnvelopeVolume = targetVolume * Math.min(
      1,
      Math.max(0, (
        timing.remainingSeconds - TAIL_SILENCE_WINDOW_SECONDS
      ) / (
        TAIL_FADE_WINDOW_SECONDS - TAIL_SILENCE_WINDOW_SECONDS
      )),
    )
    const resumePeakVolume = Math.min(
      expectedEnvelopeVolume,
      tailResumeVolume ?? expectedEnvelopeVolume,
    )
    tailResumeVolume = null

    // A looping media element may never emit `ended`; disarm it before the bad
    // terminal sample so the controlled fade always resolves into silence.
    if (audio.loop) audio.loop = false
    publish({
      loop: false,
      tailFadeActive: true,
      tailFadeStarted: true,
      tailFadeStartedAtMediaTime: state.tailFadeStartedAtMediaTime ?? timing.currentTime,
    })

    if (audio.volume === 0 && resumePeakVolume > 0) {
      const resumeRampMs = Math.min(
        TAIL_FADE_RESUME_RAMP_MS,
        Math.max(80, timing.fadeDurationMs * 0.15),
      )
      await rampVolume({
        durationMs: resumeRampMs,
        source: 'track-tail-resume',
        targetVolume: resumePeakVolume,
      })
      if (
        destroyed
        || sequenceRevision !== tailFadeSequenceRevision
        || audio.paused
        || !playbackRequested
      ) return snapshot()
    }

    const remainingTiming = getTailFadeTiming()
    if (!remainingTiming) {
      publish({ tailFadeActive: false })
      return snapshot()
    }
    if (remainingTiming.isSilenceZone) return lockTailSilence()
    await rampVolume({
      durationMs: remainingTiming.fadeDurationMs,
      source: 'track-tail-fade',
      targetVolume: 0,
    })
    if (sequenceRevision === tailFadeSequenceRevision && !destroyed) {
      audio.volume = 0
      publish({
        tailFadeActive: false,
        tailSilenceLocked: true,
        volume: 0,
      })
    }
    return snapshot()
  }

  function cancelVolumeRamp() {
    fadeRevision += 1
    if (fadeFrame !== null) cancelAnimationFrame(fadeFrame)
    fadeFrame = null
    const resolve = fadeResolve
    fadeResolve = null
    publish({
      rampOwnerCount: 0,
      rampSource: null,
      rampTargetVolume: null,
      fadePausePending: false,
      volume: audio.volume,
    })
    resolve?.(snapshot())
  }

  function rampVolume({
    completePatch = null,
    durationMs,
    source,
    startPatch = null,
    targetVolume,
  }) {
    cancelVolumeRamp()
    const revision = ++fadeRevision
    const startedAt = performance.now()
    const startVolume = audio.volume
    const safeDuration = Math.max(0, Number(durationMs) || 0)
    publish({
      ...(startPatch ?? {}),
      rampOwnerCount: safeDuration > 0 && startVolume !== targetVolume ? 1 : 0,
      rampSource: source,
      rampTargetVolume: targetVolume,
      volume: startVolume,
    })
    return new Promise((resolve) => {
      fadeResolve = resolve
      const finish = () => {
        if (revision !== fadeRevision || destroyed) return
        audio.volume = targetVolume
        fadeFrame = null
        fadeResolve = null
        const patch = typeof completePatch === 'function' ? completePatch() : completePatch
        const next = publish({
          ...(patch ?? {}),
          volume: audio.volume,
          rampOwnerCount: 0,
          rampSource: null,
          rampTargetVolume: null,
        })
        resolve(next)
      }
      if (safeDuration === 0 || startVolume === targetVolume) {
        finish()
        return
      }
      const tick = (now) => {
        if (destroyed || revision !== fadeRevision) return
        const progress = Math.min(1, Math.max(0, (now - startedAt) / safeDuration))
        const eased = 1 - (1 - progress) ** 3
        audio.volume = startVolume + ((targetVolume - startVolume) * eased)
        publish({ volume: audio.volume, rampOwnerCount: 1 })
        if (progress < 1) fadeFrame = requestAnimationFrame(tick)
        else finish()
      }
      fadeFrame = requestAnimationFrame(tick)
    })
  }

  async function prepareEntry() {
    await loadCatalogue()
    if (!catalogue?.defaultTrackId) return snapshot()
    await setTrack(catalogue.defaultTrackId, { preload: false })
    audio.volume = 0
    return publish({ entryStatus: 'control-ready', volume: 0 })
  }

  function startEntryExperience({ timestamp = performance.now() } = {}) {
    if (destroyed || state.status === 'playing' || !audio.paused) return snapshot()
    publish({
      entryStatus: selectedTrack ? 'control-ready' : 'preparing-control',
      entryStartedAt: state.entryStartedAt ?? timestamp,
      autoplayPolicy: 'explicit-control',
    })
    if (!selectedTrack) {
      void prepareEntry().then(() => {
        if (!destroyed && selectedTrack) publish({ entryStatus: 'control-ready' })
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
    fadePause,
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

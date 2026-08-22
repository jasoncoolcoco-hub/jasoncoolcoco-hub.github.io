export const BACKGROUND_MUSIC_STATES = Object.freeze({
  PLAYING: 'PLAYING',
  PAUSED_BY_USER: 'PAUSED_BY_USER',
  SUSPENDED_BY_CONTENT: 'SUSPENDED_BY_CONTENT',
})

export const BACKGROUND_MUSIC_FADE = Object.freeze({
  playMs: 1200,
  pauseMs: 850,
  contentSuspendMs: 1050,
})

export function createBackgroundMusicManager(audioController) {
  const listeners = new Set()
  let disposed = false
  let requestRevision = 0
  let previousAudioState = audioController?.getState?.() ?? null
  let state = {
    status: BACKGROUND_MUSIC_STATES.PAUSED_BY_USER,
    lastUserIntent: 'PAUSED',
    contentSource: null,
    source: 'initial',
    audio: audioController?.getState?.() ?? null,
  }

  const snapshot = () => Object.freeze({
    ...state,
    audio: state.audio ? Object.freeze({ ...state.audio }) : null,
  })

  const publish = (patch = {}) => {
    if (disposed) return snapshot()
    state = { ...state, ...patch }
    const next = snapshot()
    listeners.forEach((listener) => listener(next))
    return next
  }

  const unsubscribeAudio = audioController?.subscribe?.((audioState) => {
    const playbackEnded = state.status === BACKGROUND_MUSIC_STATES.PLAYING
      && previousAudioState
      && !previousAudioState.paused
      && audioState.paused
      && !audioState.activeVolumeRamp
      && audioState.status === 'ready'
    previousAudioState = audioState
    publish({
      audio: audioState,
      ...(playbackEnded ? {
        status: BACKGROUND_MUSIC_STATES.PAUSED_BY_USER,
        lastUserIntent: 'PAUSED',
        source: 'track-ended',
      } : {}),
    })
  }) ?? (() => {})

  async function resumeByUser({
    durationMs = BACKGROUND_MUSIC_FADE.playMs,
    source = 'global-control',
  } = {}) {
    if (disposed) return snapshot()
    const revision = ++requestRevision
    publish({
      status: BACKGROUND_MUSIC_STATES.PLAYING,
      lastUserIntent: 'PLAYING',
      contentSource: null,
      source,
    })
    const audio = await audioController?.play?.({ durationMs, source })
    if (revision !== requestRevision || disposed) return snapshot()
    if (audio?.errorCode || audio?.status === 'unavailable') {
      return publish({
        status: BACKGROUND_MUSIC_STATES.PAUSED_BY_USER,
        lastUserIntent: 'PAUSED',
        source: `${source}:failed`,
      })
    }
    return publish({ audio: audio ?? state.audio })
  }

  async function pauseByUser({
    durationMs = BACKGROUND_MUSIC_FADE.pauseMs,
    source = 'global-control',
  } = {}) {
    if (disposed) return snapshot()
    const revision = ++requestRevision
    publish({
      status: BACKGROUND_MUSIC_STATES.PAUSED_BY_USER,
      lastUserIntent: 'PAUSED',
      contentSource: null,
      source,
    })
    const audio = await audioController?.fadePause?.({ durationMs, source })
    if (revision !== requestRevision || disposed) return snapshot()
    return publish({ audio: audio ?? state.audio })
  }

  function toggleByUser(options = {}) {
    return state.status === BACKGROUND_MUSIC_STATES.PLAYING
      ? pauseByUser(options)
      : resumeByUser(options)
  }

  async function suspendForContent({
    durationMs = BACKGROUND_MUSIC_FADE.contentSuspendMs,
    source = 'content-audio',
  } = {}) {
    if (disposed) return snapshot()
    if (state.status === BACKGROUND_MUSIC_STATES.PAUSED_BY_USER) return snapshot()
    const revision = ++requestRevision
    publish({
      status: BACKGROUND_MUSIC_STATES.SUSPENDED_BY_CONTENT,
      contentSource: source,
      source,
    })
    const audio = await audioController?.fadePause?.({ durationMs, source })
    if (revision !== requestRevision || disposed) return snapshot()
    return publish({ audio: audio ?? state.audio })
  }

  return Object.freeze({
    destroy() {
      if (disposed) return
      disposed = true
      requestRevision += 1
      unsubscribeAudio()
      listeners.clear()
    },
    getState: snapshot,
    pauseByUser,
    resumeByUser,
    subscribe(listener) {
      if (disposed) return () => {}
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
    suspendForContent,
    toggleByUser,
  })
}

import { useEffect, useState } from 'react'

function stopSceneEvent(event) {
  event.stopPropagation()
}

function controlState(audioState) {
  if (audioState?.status === 'playing' && !audioState?.paused) return 'playing'
  if (audioState?.manualIntentState !== 'none' || audioState?.errorCode) return 'paused'
  return 'initial'
}

export default function StudioV2MusicControl({ audioController }) {
  const [audioState, setAudioState] = useState(() => audioController?.getState?.() ?? {})
  const [pending, setPending] = useState(false)

  useEffect(() => (
    audioController?.subscribe?.(setAudioState) ?? undefined
  ), [audioController])

  const state = controlState(audioState)
  const playing = state === 'playing'
  const label = pending
    ? 'STARTING MUSIC'
    : playing
      ? 'NOW PLAYING'
      : state === 'paused'
        ? 'MUSIC PAUSED'
        : 'PLAY MUSIC'
  const accessibleLabel = playing
    ? 'Pause Fred Studio music'
    : state === 'paused'
      ? 'Resume Fred Studio music'
      : 'Play Fred Studio music'

  const toggleMusic = async (event) => {
    event.stopPropagation()
    if (!audioController || pending) return
    setPending(true)
    try {
      await audioController.toggle()
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="studio-v2__music-control"
      data-music-control-state={state}
      onClick={stopSceneEvent}
      onDoubleClick={stopSceneEvent}
      onPointerDown={stopSceneEvent}
      onPointerUp={stopSceneEvent}
    >
      <button
        type="button"
        className="studio-v2__music-capsule"
        aria-label={accessibleLabel}
        aria-pressed={playing}
        disabled={pending}
        onClick={toggleMusic}
        onKeyDown={stopSceneEvent}
        onKeyUp={stopSceneEvent}
      >
        <span className="studio-v2__music-glyph" aria-hidden="true">
          <span className="studio-v2__music-equalizer">
            <i />
            <i />
            <i />
          </span>
          <span className="studio-v2__music-play">▶</span>
        </span>
        <span className="studio-v2__music-copy" aria-live="polite">
          <strong>{label}</strong>
          {audioState?.trackTitle && state !== 'initial' && (
            <small>{audioState.trackTitle}</small>
          )}
        </span>
      </button>
    </div>
  )
}

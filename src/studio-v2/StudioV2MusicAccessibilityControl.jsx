import { useEffect, useState } from 'react'

import { BACKGROUND_MUSIC_STATES } from './backgroundMusicManager'

export default function StudioV2MusicAccessibilityControl({ manager }) {
  const [musicState, setMusicState] = useState(() => manager?.getState?.() ?? {})

  useEffect(() => (
    manager?.subscribe?.(setMusicState) ?? undefined
  ), [manager])

  const playingOrRequested = musicState?.status === BACKGROUND_MUSIC_STATES.PLAYING
  const label = playingOrRequested
    ? 'Pause Fred Studio music'
    : musicState?.audio?.currentTime > 0
      ? 'Resume Fred Studio music'
      : 'Play Fred Studio music'

  return (
    <button
      type="button"
      className="studio-v2__music-accessibility-control"
      aria-label={label}
      aria-pressed={playingOrRequested}
      onClick={(event) => {
        event.stopPropagation()
        void manager?.toggleByUser?.({
          source: 'accessible-control',
        })
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      {label}
    </button>
  )
}

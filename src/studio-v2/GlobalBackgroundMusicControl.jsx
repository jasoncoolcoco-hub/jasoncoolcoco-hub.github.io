import { useEffect, useState } from 'react'
import { BACKGROUND_MUSIC_STATES } from './backgroundMusicManager'
import { useBackgroundMusic } from './BackgroundMusicContext'

export default function GlobalBackgroundMusicControl({ active }) {
  const manager = useBackgroundMusic()
  const [musicState, setMusicState] = useState(() => manager?.getState?.() ?? {})

  useEffect(() => manager?.subscribe?.(setMusicState), [manager])

  const playing = musicState.status === BACKGROUND_MUSIC_STATES.PLAYING
  const label = playing ? 'Pause background music' : 'Resume background music'

  return (
    <button
      type="button"
      className="macbook-site-portal__music"
      data-music-state={musicState.status ?? BACKGROUND_MUSIC_STATES.PAUSED_BY_USER}
      aria-label={label}
      aria-pressed={playing}
      tabIndex={active ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation()
        void manager?.toggleByUser?.({ source: 'website-global-control' })
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <span className="macbook-site-portal__music-icon" aria-hidden="true">
        {playing ? <><i /><i /></> : <b />}
      </span>
    </button>
  )
}

import { createContext, useContext, useEffect } from 'react'

const BackgroundMusicContext = createContext(null)

export function BackgroundMusicProvider({ children, manager }) {
  return (
    <BackgroundMusicContext.Provider value={manager}>
      {children}
    </BackgroundMusicContext.Provider>
  )
}

export function useBackgroundMusic() {
  return useContext(BackgroundMusicContext)
}

export function useBackgroundMusicSuspension(active, {
  durationMs,
  source = 'content-audio',
} = {}) {
  const manager = useBackgroundMusic()

  useEffect(() => {
    if (!active) return
    void manager?.suspendForContent?.({ durationMs, source })
  }, [active, durationMs, manager, source])
}

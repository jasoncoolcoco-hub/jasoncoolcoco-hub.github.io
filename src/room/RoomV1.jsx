import { useEffect, useRef, useState } from 'react'
import { siteContent } from '../data/siteContent'
import { createRoomScene } from './createRoomScene'

export default function RoomV1() {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const [selectedId, setSelectedId] = useState(null)
  const { roomV1 } = siteContent

  useEffect(() => {
    if (!mountRef.current) return undefined

    const scene = createRoomScene({
      mount: mountRef.current,
      onSelect: setSelectedId,
      onOpenHome: () => window.location.assign('/'),
    })
    sceneRef.current = scene

    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  const selectedLabel = selectedId ? roomV1.objects[selectedId] : null

  return (
    <main className="room-v1">
      <div
        ref={mountRef}
        className="room-v1__canvas"
        role="img"
        aria-label="Interactive three-dimensional room with a desk, stool, MacBook, paper trays, wall map, photographs, and pegboard"
        aria-describedby="room-v1-instructions"
      />

      <header className="room-v1__header">
        <a className="room-v1__back" href="/" aria-label="Return to the original website home page">
          JASON LI
        </a>
        <p>{roomV1.eyebrow}</p>
      </header>

      <section className="room-v1__intro" aria-label="Room introduction">
        <h1>{roomV1.title}</h1>
        <p id="room-v1-instructions">{roomV1.instructions}</p>
      </section>

      <nav className="room-v1__index" aria-label="Room objects">
        {Object.entries(roomV1.objects).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={selectedId === id ? 'is-selected' : undefined}
            aria-pressed={selectedId === id}
            onClick={() => {
              sceneRef.current?.select(id)
              setSelectedId(id)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <p className={`room-v1__selection${selectedLabel ? ' is-visible' : ''}`} aria-live="polite">
        {selectedLabel || 'ROOM OBJECT'}
      </p>

      <div className="room-v1__desktop-notice">
        <p>{roomV1.desktopOnly}</p>
        <a href="/">RETURN TO HOME</a>
      </div>
    </main>
  )
}

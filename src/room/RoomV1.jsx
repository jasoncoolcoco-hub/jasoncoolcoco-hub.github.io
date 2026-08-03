import { useEffect, useRef } from 'react'
import { createRoomScene } from './createRoomScene'

export default function RoomV1() {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return undefined

    const scene = createRoomScene({ mount: mountRef.current })

    return () => scene.dispose()
  }, [])

  return (
    <main className="room-v1">
      <div
        ref={mountRef}
        className="room-v1__canvas"
        role="img"
        aria-label="Interactive three-dimensional room with a desk, stool, MacBook, paper trays, wall map, photographs, and pegboard"
      />
    </main>
  )
}

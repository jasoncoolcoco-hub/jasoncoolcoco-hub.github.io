import { lazy, Suspense, useEffect } from 'react'
import HomeTransitionShell from './components/HomeTransitionShell'
import { siteContent } from './data/siteContent'

const RoomV1 = lazy(() => import('./room/RoomV1'))

export default function App() {
  const isRoomV1 = window.location.pathname.replace(/\/+$/, '') === '/room-v1'

  useEffect(() => {
    document.title = isRoomV1
      ? siteContent.roomV1.metaTitle
      : siteContent.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        isRoomV1
          ? siteContent.roomV1.metaDescription
          : siteContent.meta.description,
      )
  }, [isRoomV1])

  return isRoomV1 ? (
    <Suspense fallback={<main className="room-v1 room-v1--loading" aria-label="Loading Room V1" />}>
      <RoomV1 />
    </Suspense>
  ) : (
    <main><HomeTransitionShell /></main>
  )
}

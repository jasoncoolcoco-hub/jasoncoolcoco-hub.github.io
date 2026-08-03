import { lazy, Suspense, useEffect } from 'react'
import HomeTransitionShell from './components/HomeTransitionShell'
import { siteContent } from './data/siteContent'

const RoomV1 = lazy(() => import('./room/RoomV1'))
const StudioV1 = lazy(() => import('./studio/StudioV1'))

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const isRoomV1 = pathname === '/room-v1'
  const isStudioV1 = pathname === '/studio-v1'

  useEffect(() => {
    document.title = isStudioV1
      ? siteContent.studioV1.metaTitle
      : isRoomV1
        ? siteContent.roomV1.metaTitle
        : siteContent.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        isStudioV1
          ? siteContent.studioV1.metaDescription
          : isRoomV1
            ? siteContent.roomV1.metaDescription
            : siteContent.meta.description,
      )
  }, [isRoomV1, isStudioV1])

  return isStudioV1 ? (
    <Suspense fallback={<main className="studio-v1" aria-label="Loading Studio V1" />}>
      <StudioV1 />
    </Suspense>
  ) : isRoomV1 ? (
    <Suspense fallback={<main className="room-v1 room-v1--loading" aria-label="Loading Room V1" />}>
      <RoomV1 />
    </Suspense>
  ) : (
    <main><HomeTransitionShell /></main>
  )
}

import { lazy, Suspense, useEffect } from 'react'
import { siteContent } from './data/siteContent'

const HomeTransitionShell = lazy(() => import('./components/HomeTransitionShell'))
const RoomV1 = lazy(() => import('./room/RoomV1'))
const StudioV1 = lazy(() => import('./studio/StudioV1'))
const StudioV2ImportPage = lazy(() => import('./studio-v2/StudioV2ImportPage'))

export default function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '')
  const isRoomV1 = pathname === '/room-v1'
  const isStudioV1 = pathname === '/studio-v1'
  const isStudioV2Import = pathname === '' || pathname === '/studio-v2-import-test'
  const isHome = !isRoomV1 && !isStudioV1 && !isStudioV2Import

  useEffect(() => {
    document.title = isStudioV2Import
      ? siteContent.studioV2.metaTitle
      : isStudioV1
        ? siteContent.studioV1.metaTitle
        : isRoomV1
          ? siteContent.roomV1.metaTitle
          : siteContent.meta.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        isStudioV2Import
          ? siteContent.studioV2.metaDescription
          : isStudioV1
            ? siteContent.studioV1.metaDescription
            : isRoomV1
              ? siteContent.roomV1.metaDescription
              : siteContent.meta.description,
      )
  }, [isRoomV1, isStudioV1, isStudioV2Import])

  useEffect(() => {
    if (!isHome) return undefined
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = window.matchMedia('(max-width: 700px)').matches
      ? '/images/hero/jason-li-hero-1440.jpg'
      : '/images/hero/jason-li-hero-2400.jpg'
    document.head.append(preload)
    return () => preload.remove()
  }, [isHome])

  return isStudioV2Import ? (
    <Suspense fallback={<main className="studio-v2" aria-label="Loading Fred Studio V2" />}>
      <StudioV2ImportPage />
    </Suspense>
  ) : isStudioV1 ? (
    <Suspense fallback={<main className="studio-v1" aria-label="Loading Studio V1" />}>
      <StudioV1 />
    </Suspense>
  ) : isRoomV1 ? (
    <Suspense fallback={<main className="room-v1 room-v1--loading" aria-label="Loading Room V1" />}>
      <RoomV1 />
    </Suspense>
  ) : (
    <Suspense fallback={<main aria-label="Loading home page" />}>
      <main><HomeTransitionShell /></main>
    </Suspense>
  )
}

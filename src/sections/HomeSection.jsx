import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react'
import AnimatedTitle from '../components/AnimatedTitle'
import ProfileDrawer from '../components/ProfileDrawer'
import ScrollIndicator from '../components/ScrollIndicator'
import SideNavigation from '../components/SideNavigation'
import { siteContent } from '../data/siteContent'

const desktopPointerQuery = '(min-width: 1024px) and (hover: hover) and (pointer: fine)'
const maxParallaxX = 6
const maxParallaxY = 4

export default function HomeSection() {
  const [pageReady, setPageReady] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [hasDesktopPointer, setHasDesktopPointer] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(desktopPointerQuery).matches,
  )
  const sectionRef = useRef(null)
  const profileTriggerRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const reducedMotion = Boolean(shouldReduceMotion)
  const { home, chapters, navigation, profile } = siteContent
  const parallaxX = useMotionValue(0)
  const parallaxY = useMotionValue(0)
  const smoothParallaxX = useSpring(parallaxX, {
    stiffness: 42,
    damping: 18,
    mass: 0.9,
  })
  const smoothParallaxY = useSpring(parallaxY, {
    stiffness: 42,
    damping: 18,
    mass: 0.9,
  })
  const supportsHeroParallax =
    home.hero.enableHeroParallax && hasDesktopPointer && !reducedMotion
  const isHeroParallaxActive =
    supportsHeroParallax && pageReady && !isProfileOpen

  useEffect(() => {
    const desktopPointer = window.matchMedia(desktopPointerQuery)
    const updatePointerCapability = () =>
      setHasDesktopPointer(desktopPointer.matches)

    updatePointerCapability()
    desktopPointer.addEventListener('change', updatePointerCapability)

    return () =>
      desktopPointer.removeEventListener('change', updatePointerCapability)
  }, [])

  useEffect(() => {
    if (!isHeroParallaxActive) {
      parallaxX.set(0)
      parallaxY.set(0)
    }
  }, [isHeroParallaxActive, parallaxX, parallaxY])

  const handleHeroPointerMove = (event) => {
    if (!isHeroParallaxActive || !sectionRef.current) return

    const bounds = sectionRef.current.getBoundingClientRect()
    const horizontalProgress = (event.clientX - bounds.left) / bounds.width
    const verticalProgress = (event.clientY - bounds.top) / bounds.height

    parallaxX.set((horizontalProgress * 2 - 1) * maxParallaxX)
    parallaxY.set((verticalProgress * 2 - 1) * maxParallaxY)
  }

  const resetHeroPosition = () => {
    parallaxX.set(0)
    parallaxY.set(0)
  }

  const handleHeroLoad = async (event) => {
    const heroImage = event.currentTarget
    const readyTasks = []

    if (heroImage.decode) readyTasks.push(heroImage.decode())
    if (document.fonts?.load) {
      readyTasks.push(
        document.fonts.load('700 52px "Barlow Condensed"', home.title),
      )
    }

    await Promise.allSettled(readyTasks)
    setPageReady(true)
  }

  return (
    <section
      ref={sectionRef}
      id="home"
      className="home-section"
      aria-labelledby="home-title"
      aria-busy={!pageReady}
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={resetHeroPosition}
      onPointerCancel={resetHeroPosition}
    >
      <motion.picture
        className="home-hero"
        style={{
          x: smoothParallaxX,
          y: smoothParallaxY,
          scale: supportsHeroParallax ? 1.03 : 1,
        }}
      >
        <source media="(max-width: 700px)" srcSet={home.hero.mobileSrc} />
        <motion.img
          src={home.hero.desktopSrc}
          alt={home.hero.alt}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
          animate={{
            opacity: pageReady ? 1 : 0,
            scale: pageReady ? 1 : reducedMotion ? 1 : 1.02,
          }}
          transition={{
            duration: reducedMotion ? 0.01 : 1.1,
            ease: [0.22, 1, 0.36, 1],
          }}
          onLoad={handleHeroLoad}
          onError={() => setPageReady(true)}
        />
      </motion.picture>

      <div className="home-shade" aria-hidden="true" />

      {pageReady && (
        <>
          <SideNavigation
            chapters={chapters}
            navigation={navigation}
            reducedMotion={reducedMotion}
          />

          <div className="home-content">
            <h1 id="home-title" className="sr-only">
              {home.title}
            </h1>
            <AnimatedTitle
              title={home.title}
              openLabel={profile.openLabel}
              onOpen={() => setIsProfileOpen(true)}
              triggerRef={profileTriggerRef}
              reducedMotion={reducedMotion}
            />
          </div>

          <ScrollIndicator
            label={home.scrollLabel}
            reducedMotion={reducedMotion}
          />
        </>
      )}

      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        reducedMotion={reducedMotion}
        triggerRef={profileTriggerRef}
      />
    </section>
  )
}

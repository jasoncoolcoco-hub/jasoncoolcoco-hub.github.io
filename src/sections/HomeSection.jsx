import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import HomeContactReveal from '../components/HomeContactReveal'
import SideNavigation from '../components/SideNavigation'
import { siteContent } from '../data/siteContent'

export default function HomeSection() {
  const [pageReady, setPageReady] = useState(false)
  const reducedMotion = Boolean(useReducedMotion())
  const { home, chapters, navigation, profile } = siteContent
  const lateEntrance = {
    delay: pageReady && !reducedMotion ? 0.58 : 0,
    duration: reducedMotion ? 0.01 : 0.58,
    ease: [0.22, 1, 0.36, 1],
  }

  const handleHeroLoad = async (event) => {
    const heroImage = event.currentTarget
    if (heroImage.decode) await Promise.allSettled([heroImage.decode()])
    setPageReady(true)
  }

  return (
    <section
      id="home"
      className="home-section"
      aria-labelledby="home-site-name"
      aria-busy={!pageReady}
    >
      <motion.header
        className="home-topbar"
        initial={{ opacity: 0, y: reducedMotion ? 0 : -5 }}
        animate={{ opacity: pageReady ? 1 : 0, y: pageReady ? 0 : reducedMotion ? 0 : -5 }}
        transition={lateEntrance}
      >
        <h1 id="home-site-name" className="home-site-name">
          {home.siteName}
        </h1>
        <span className="home-topbar__chapter">HOME</span>
        <HomeContactReveal contacts={profile.contacts} reducedMotion={reducedMotion} />
      </motion.header>

      <div className="home-content-frame">
        <motion.div
          className="home-hero-frame"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }}
          animate={{ opacity: pageReady ? 1 : 0, y: pageReady ? 0 : reducedMotion ? 0 : 10 }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.95,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <picture className="home-hero">
            <source media="(max-width: 700px)" srcSet={home.hero.mobileSrc} />
            <img
              src={home.hero.desktopSrc}
              alt={home.hero.alt}
              onLoad={handleHeroLoad}
              onError={() => setPageReady(true)}
            />
          </picture>
        </motion.div>

        <motion.p
          className="home-introduction"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
          animate={{ opacity: pageReady ? 1 : 0, y: pageReady ? 0 : reducedMotion ? 0 : 6 }}
          transition={{ ...lateEntrance, delay: pageReady && !reducedMotion ? 0.72 : 0 }}
        >
          {home.introduction}
        </motion.p>
      </div>

      {pageReady && (
        <SideNavigation
          chapters={chapters}
          navigation={navigation}
          reducedMotion={reducedMotion}
          entranceDelay={0.62}
          entranceDuration={0.42}
          entranceEase={[0.22, 1, 0.36, 1]}
          entranceStagger={0.05}
          entranceY={5}
          markAsHomeDirectory
          numericOnly
        />
      )}
    </section>
  )
}

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import HomeSection from '../sections/HomeSection'

export default function HomeTransitionShell() {
  const shellRef = useRef(null)
  const reducedMotion = Boolean(useReducedMotion())
  const { scrollYProgress } = useScroll({
    target: shellRef,
    offset: ['start start', 'end end'],
  })
  const veilOpacity = useTransform(
    scrollYProgress,
    reducedMotion ? [0, 1] : [0, 0.28, 1],
    reducedMotion ? [0, 1] : [0, 0.04, 1],
  )

  return (
    <div ref={shellRef} className="home-transition-shell">
      <div className="home-transition-shell__sticky">
        <HomeSection />
        <motion.div
          className="home-transition-shell__veil"
          style={{ opacity: veilOpacity }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

import { motion } from 'motion/react'

export default function ScrollIndicator({ label, reducedMotion }) {
  return (
    <motion.div
      className="scroll-indicator"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: reducedMotion ? 0 : 3.9,
        duration: reducedMotion ? 0.01 : 0.75,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <span>{label}</span>
      <span className="scroll-indicator__line" />
    </motion.div>
  )
}

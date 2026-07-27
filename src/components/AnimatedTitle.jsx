import { motion } from 'motion/react'

export default function AnimatedTitle({
  title,
  openLabel,
  onOpen,
  triggerRef,
  reducedMotion,
}) {
  return (
    <motion.div
      className="animated-title"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{
        delay: reducedMotion ? 0 : 2.5,
        duration: reducedMotion ? 0.01 : 1.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="animated-title__button"
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-label={openLabel}
      >
        {title}
      </button>
    </motion.div>
  )
}

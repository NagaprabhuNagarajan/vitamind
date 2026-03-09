'use client'

import { useScroll, motion, useSpring } from 'framer-motion'

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[100]"
      style={{
        scaleX,
        transformOrigin: 'left',
        background: 'linear-gradient(90deg, #6366F1, #A855F7, #06B6D4)',
      }}
    />
  )
}

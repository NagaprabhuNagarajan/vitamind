'use client'

import { motion, cubicBezier, type Variants } from 'framer-motion'

interface TextRevealProps {
  text: string
  className?: string
  delay?: number
  once?: boolean
}

export function TextReveal({ text, className, delay = 0, once = true }: TextRevealProps) {
  const words = text.split(' ')

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.06,
        delayChildren: delay,
      },
    },
  }

  const word: Variants = {
    hidden: { y: '110%', opacity: 0 },
    show: {
      y: '0%',
      opacity: 1,
      transition: { duration: 0.5, ease: cubicBezier(0.33, 1, 0.68, 1) },
    },
  }

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden mr-[0.25em]">
          <motion.span className="inline-block" variants={word}>
            {w}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

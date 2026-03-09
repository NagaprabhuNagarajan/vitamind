'use client'

import { motion } from 'framer-motion'

interface MarqueeProps {
  items: string[]
  /** Pixels per second scroll speed */
  speed?: number
  direction?: 'left' | 'right'
}

export function Marquee({ items, speed = 40, direction = 'left' }: MarqueeProps) {
  const doubled = [...items, ...items]
  const duration = (items.length * 120) / speed

  return (
    <div className="overflow-hidden w-full">
      <motion.div
        className="flex gap-4 w-max"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-medium text-gray-400 border border-white/[0.08]"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { ListTodo, Compass, Zap, Puzzle, TrendingDown } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import React from 'react'

const PROBLEMS = [
  {
    icon: ListTodo,
    title: 'Too Many Tasks',
    description: 'Endless lists with no clarity on what actually matters.',
    color: 'text-red-400 bg-red-400/10',
  },
  {
    icon: Compass,
    title: 'No Direction',
    description: 'Tools that track, but never guide you forward.',
    color: 'text-orange-400 bg-orange-400/10',
  },
  {
    icon: Zap,
    title: 'Burnout',
    description: 'Pushing through without detecting warning signs early.',
    color: 'text-amber-400 bg-amber-400/10',
  },
  {
    icon: Puzzle,
    title: 'Scattered Tools',
    description: '10 apps, no unified picture of your life.',
    color: 'text-rose-400 bg-rose-400/10',
  },
  {
    icon: TrendingDown,
    title: 'No Life Progress',
    description: 'Years pass with no insight into your actual growth.',
    color: 'text-red-500 bg-red-500/10',
  },
]

const EASE_CURVE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

/** Update CSS custom properties for spotlight cursor tracking */
function onSpotlightMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
}

export function Problem() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: EASE_CURVE }}
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Modern life is complex.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-400">
            Most productivity apps only track tasks. They don&apos;t help you
            understand your life.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {PROBLEMS.map((problem, index) => {
            const Icon = problem.icon
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  ease: EASE_CURVE,
                }}
                whileHover={{
                  scale: 1.02,
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
                onMouseMove={onSpotlightMouseMove}
                className="spotlight rounded-2xl"
              >
                <GlassCard className="relative z-[1] flex items-start gap-4 hover:shadow-card-hover transition-shadow duration-300">
                  <div
                    className={`flex-shrink-0 rounded-lg p-2.5 ${problem.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      {problem.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {problem.description}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

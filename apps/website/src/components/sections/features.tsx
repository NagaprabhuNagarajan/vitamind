'use client'

import { motion } from 'framer-motion'
import {
  Navigation,
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  MessageCircle,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { TiltCard } from '@/components/ui/tilt-card'
import React from 'react'

const FEATURES = [
  {
    icon: Navigation,
    title: 'AI Life GPS',
    description:
      'Directional velocity per life domain. Know if you are improving or declining across Health, Career, Relationships, and more.',
    color: 'text-primary-400',
    bg: 'bg-primary/10',
    borderHover: 'hover:border-primary/30',
    glowColor: '#6366F1',
  },
  {
    icon: Activity,
    title: 'Momentum Score',
    description:
      'A daily score measuring whether your life is improving. Track 7-day trend with a glanceable number.',
    color: 'text-secondary-400',
    bg: 'bg-secondary/10',
    borderHover: 'hover:border-secondary/30',
    glowColor: '#A855F7',
  },
  {
    icon: AlertTriangle,
    title: 'Burnout Radar',
    description:
      'Detect burnout signals before they become serious. Get early warnings when your energy is depleting.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    borderHover: 'hover:border-orange-400/30',
    glowColor: '#F97316',
  },
  {
    icon: Brain,
    title: 'Pattern Oracle',
    description:
      'Discover hidden correlations between habits and productivity that you would never find on your own.',
    color: 'text-accent-400',
    bg: 'bg-accent/10',
    borderHover: 'hover:border-accent/30',
    glowColor: '#06B6D4',
  },
  {
    icon: Clock,
    title: 'Life Timeline',
    description:
      'A searchable timeline of your life events, achievements, habits, and milestones.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    borderHover: 'hover:border-green-400/30',
    glowColor: '#22C55E',
  },
  {
    icon: MessageCircle,
    title: 'AI Life Coach',
    description:
      'Daily personalized guidance based on your behavioral data and life trajectory.',
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    borderHover: 'hover:border-pink-400/30',
    glowColor: '#EC4899',
  },
]

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

/** Update CSS custom properties for spotlight cursor tracking */
function onSpotlightMouseMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
}

export function Features() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything you need to navigate life.
          </h2>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                }}
                className="group"
              >
                <TiltCard className="h-full relative">
                  <div
                    onMouseMove={onSpotlightMouseMove}
                    className="spotlight animated-border rounded-2xl h-full"
                  >
                    <GlassCard
                      className={`relative z-[1] transition-all duration-300 ${feature.borderHover} hover:shadow-card-hover h-full`}
                    >
                      {/* Pulsing glow dot in top-right corner */}
                      <motion.div
                        className="absolute top-4 right-4 w-2 h-2 rounded-full"
                        style={{ background: feature.glowColor }}
                        animate={{
                          boxShadow: [
                            `0 0 0px ${feature.glowColor}00`,
                            `0 0 8px ${feature.glowColor}80`,
                            `0 0 0px ${feature.glowColor}00`,
                          ],
                          scale: [1, 1.3, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        className={`inline-flex rounded-lg p-2.5 ${feature.bg} mb-4`}
                        whileHover={{ rotate: 10, scale: 1.15 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      >
                        <Icon className={`h-5 w-5 ${feature.color}`} />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {feature.description}
                      </p>
                    </GlassCard>
                  </div>
                </TiltCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

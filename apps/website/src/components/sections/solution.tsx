'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'

const CAPABILITIES = [
  'Analyzes your habits and daily patterns',
  'Understands your goals and life direction',
  'Detects productivity trends and correlations',
  'Predicts your life trajectory and guides you',
]

export function Solution() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-12">
          <motion.p
            className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            The Solution
          </motion.p>
          <motion.h2
            className="text-4xl md:text-5xl font-bold text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Meet your AI life navigator.
          </motion.h2>
        </div>

        <motion.div
          className="mx-auto max-w-2xl mb-12 relative"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
        >
          {/* Animated left border glow */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
            animate={{
              boxShadow: [
                '0 0 0px rgba(99,102,241,0)',
                '0 0 20px rgba(99,102,241,0.5)',
                '0 0 0px rgba(99,102,241,0)',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <GlassCard className="border-l-4 border-l-primary">
            <p className="text-xl md:text-2xl font-medium text-white leading-relaxed">
              &ldquo;Think of VitaMind as{' '}
              <span className="gradient-text">Google Maps for your life.</span>
              &rdquo;
            </p>
          </GlassCard>
        </motion.div>

        <div className="mx-auto max-w-lg space-y-4">
          {CAPABILITIES.map((capability, index) => (
            <motion.div
              key={capability}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{
                duration: 0.4,
                delay: 0.2 + index * 0.1,
                ease: 'easeOut',
              }}
            >
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-1.5">
                <Check className="h-4 w-4 text-primary-400" />
              </div>
              <p className="text-gray-300">{capability}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

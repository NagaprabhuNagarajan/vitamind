'use client'

import { motion } from 'framer-motion'
import { Marquee } from '@/components/ui/marquee'

const MARQUEE_ROW_1 = [
  '\u2726 AI Life GPS',
  '\u2726 Momentum Score',
  '\u2726 Burnout Radar',
  '\u2726 Pattern Oracle',
  '\u2726 Life Timeline',
  '\u2726 AI Life Coach',
  '\u2726 Daily Insights',
  '\u2726 Life Intelligence',
]

const MARQUEE_ROW_2 = [
  '\u2726 Private Beta',
  '\u2726 1,000 Early Spots',
  '\u2726 Zero Fluff',
  '\u2726 Real Intelligence',
  '\u2726 Built for Humans',
  '\u2726 AI-Powered',
  '\u2726 Life Optimization',
  '\u2726 Your Life, Understood',
]

export function SocialProof() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <motion.h2
          className="text-4xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          Shaping the future of AI life intelligence.
        </motion.h2>
        <motion.p
          className="mx-auto max-w-xl text-lg text-gray-400 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Early adopters are helping us build the AI operating system for human
          life.
        </motion.p>

        {/* Marquee rows with edge fade masks */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="py-10"
        >
          <div className="relative">
            {/* Left fade mask */}
            <div
              className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to right, #060810, transparent)' }}
            />
            {/* Right fade mask */}
            <div
              className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #060810, transparent)' }}
            />
            <div className="space-y-4">
              <Marquee items={MARQUEE_ROW_1} speed={35} direction="left" />
              <Marquee items={MARQUEE_ROW_2} speed={25} direction="right" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

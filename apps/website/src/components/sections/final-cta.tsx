'use client'

import { motion } from 'framer-motion'
import { WaitlistForm } from '@/components/ui/waitlist-form'
import { TextReveal } from '@/components/ui/text-reveal'

export function FinalCta() {
  return (
    <section id="waitlist" className="relative py-32 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, #6366F1, #A855F7, transparent)',
        }}
      />

      {/* Animated floating orbs */}
      <div
        className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full opacity-10 blur-[100px] pointer-events-none animate-orb-float"
        style={{ background: '#6366F1' }}
      />
      <div
        className="absolute bottom-[15%] right-[10%] w-[250px] h-[250px] rounded-full opacity-10 blur-[90px] pointer-events-none animate-orb-float"
        style={{ background: '#A855F7', animationDelay: '5s' }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <TextReveal text="Start building a better life today." />
          </h2>
        </motion.div>
        <motion.p
          className="mx-auto max-w-lg text-lg text-gray-400 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Join the VitaMind beta. Get early access when we launch.
        </motion.p>

        <motion.div
          className="mx-auto max-w-md animated-border rounded-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <WaitlistForm />
        </motion.div>

        <motion.p
          className="mt-6 text-xs text-gray-600"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          No spam. Unsubscribe anytime.
        </motion.p>
      </div>
    </section>
  )
}

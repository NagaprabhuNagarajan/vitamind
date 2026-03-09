'use client'

import { motion } from 'framer-motion'

const STEPS = [
  {
    step: 1,
    title: 'Track Your Life',
    description:
      'Add tasks, goals, habits, or voice logs. VitaMind captures your daily life data effortlessly.',
  },
  {
    step: 2,
    title: 'AI Analyzes Patterns',
    description:
      'VitaMind discovers behavioral patterns, productivity trends, and hidden correlations.',
  },
  {
    step: 3,
    title: 'Improve Your Life',
    description:
      'Receive daily guidance, life trajectory insights, and personalized AI coaching.',
  },
]

export function HowItWorks() {
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
          <h2 className="text-4xl font-bold text-white">
            How VitaMind works.
          </h2>
        </motion.div>

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-center gap-8 md:gap-0">
          {STEPS.map((item, index) => (
            <div
              key={item.step}
              className="relative flex-1 flex flex-col items-center text-center px-6"
            >
              {/* SVG connector line that draws itself between steps */}
              {index < STEPS.length - 1 && (
                <div className="hidden md:flex items-center absolute top-6 left-[calc(50%+32px)] w-[calc(100%-64px)] -mt-0.5">
                  <svg width="100%" height="4" className="overflow-visible">
                    <defs>
                      <linearGradient id={`lineGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#A855F7" />
                      </linearGradient>
                    </defs>
                    <motion.line
                      x1="0"
                      y1="2"
                      x2="100%"
                      y2="2"
                      stroke={`url(#lineGrad-${index})`}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 1.2,
                        delay: index * 0.2 + 0.3,
                        ease: 'easeInOut',
                      }}
                    />
                  </svg>
                </div>
              )}

              {/* Animated step circle with flip/scale-in entrance */}
              <motion.div
                className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg mb-5"
                initial={{ scale: 0, opacity: 0, rotateY: -180 }}
                whileInView={{ scale: [0, 1.2, 1], opacity: 1, rotateY: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  type: 'spring',
                  duration: 0.8,
                  delay: index * 0.2,
                }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {item.step}
              </motion.div>

              <motion.h3
                className="text-lg font-semibold text-white mb-2"
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.2 + 0.15,
                }}
              >
                {item.title}
              </motion.h3>
              <motion.p
                className="text-sm text-gray-400 max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.2 + 0.25,
                }}
              >
                {item.description}
              </motion.p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

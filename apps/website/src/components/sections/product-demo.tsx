'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/glass-card'

const TABS = ['Dashboard', 'Life Map', 'Mobile'] as const
type Tab = (typeof TABS)[number]

const WEEKLY_DATA = [
  { day: 'M', height: 65 },
  { day: 'T', height: 80 },
  { day: 'W', height: 55 },
  { day: 'T', height: 90 },
  { day: 'F', height: 75 },
  { day: 'S', height: 40 },
  { day: 'S', height: 85, active: true },
]

function AnimatedWeeklyBar({
  day,
  height,
  active,
  index,
}: {
  day: string
  height: number
  active?: boolean
  index: number
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-6 h-24 rounded-full bg-white/5 relative overflow-hidden">
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          initial={{ height: 0 }}
          animate={{ height: `${height}%` }}
          transition={{
            duration: 0.8,
            delay: index * 0.08,
            ease: 'easeOut',
          }}
          style={{
            background: active
              ? 'linear-gradient(to top, #6366F1, #A855F7)'
              : 'rgba(99,102,241,0.3)',
          }}
        />
      </div>
      <span className="text-xs text-gray-500">{day}</span>
    </div>
  )
}

function DashboardView() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-medium text-white">Weekly Overview</p>
        <span className="text-xs text-gray-500">Mar 3 - Mar 9</span>
      </div>

      <div className="flex items-end justify-between mb-8 px-2">
        {WEEKLY_DATA.map((bar, index) => (
          <AnimatedWeeklyBar
            key={`${bar.day}-${index}`}
            day={bar.day}
            height={bar.height}
            active={bar.active}
            index={index}
          />
        ))}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">AI Insight</p>
        <p className="text-sm text-gray-300">
          Your productivity peaks on Thursdays. Schedule deep work sessions on Thursday mornings for maximum output.
        </p>
      </div>
    </GlassCard>
  )
}

function LifeMapView() {
  const center = 100
  const maxRadius = 70
  const axes = [
    { label: 'Health', value: 0.72 },
    { label: 'Career', value: 0.85 },
    { label: 'Growth', value: 0.68 },
    { label: 'Social', value: 0.55 },
    { label: 'Finance', value: 0.78 },
    { label: 'Mind', value: 0.62 },
  ]

  function getPoint(index: number, value: number) {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2
    return {
      x: center + Math.cos(angle) * maxRadius * value,
      y: center + Math.sin(angle) * maxRadius * value,
    }
  }

  // Points at center (for initial animation state)
  const centerPoints = axes
    .map(() => `${center},${center}`)
    .join(' ')

  // Final data points
  const finalPoints = axes
    .map((a, i) => {
      const p = getPoint(i, a.value)
      return `${p.x},${p.y}`
    })
    .join(' ')

  const dataPoints = axes.map((a, i) => getPoint(i, a.value))

  // Grid rings
  const rings = [0.33, 0.66, 1.0]

  return (
    <GlassCard>
      <p className="text-sm font-medium text-white mb-4">Life Domain Map</p>
      <div className="flex justify-center">
        <svg viewBox="0 0 200 200" className="w-64 h-64">
          {/* Grid rings */}
          {rings.map((ring) => {
            const ringPoints = axes
              .map((_, i) => {
                const p = getPoint(i, ring)
                return `${p.x},${p.y}`
              })
              .join(' ')
            return (
              <polygon
                key={ring}
                points={ringPoints}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            )
          })}

          {/* Axis lines */}
          {axes.map((_, i) => {
            const p = getPoint(i, 1)
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            )
          })}

          {/* Animated data polygon */}
          <motion.polygon
            fill="rgba(99,102,241,0.15)"
            stroke="#6366F1"
            strokeWidth="2"
            initial={{ points: centerPoints }}
            animate={{ points: finalPoints }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Data points */}
          {dataPoints.map((p, i) => (
            <motion.circle
              key={i}
              r="3"
              fill="#6366F1"
              stroke="#A855F7"
              strokeWidth="1"
              initial={{ cx: center, cy: center, opacity: 0 }}
              animate={{ cx: p.x, cy: p.y, opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            />
          ))}

          {/* Labels */}
          {axes.map((axis, i) => {
            const p = getPoint(i, 1.22)
            return (
              <text
                key={axis.label}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#94A3B8"
                fontSize="8"
              >
                {axis.label}
              </text>
            )
          })}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {axes.map((axis) => (
          <div key={axis.label} className="text-center">
            <p className="text-xs text-gray-500">{axis.label}</p>
            <p className="text-sm font-semibold text-white">
              {Math.round(axis.value * 100)}%
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function MobileView() {
  return (
    <div className="flex justify-center">
      <motion.div
        className="w-64 rounded-[2rem] border-2 border-white/10 bg-surface-secondary p-3"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="rounded-[1.5rem] bg-surface overflow-hidden">
          {/* Status bar mock */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <span className="text-[10px] text-gray-500">9:41</span>
            <div className="w-20 h-5 rounded-full bg-black" />
            <span className="text-[10px] text-gray-500">100%</span>
          </div>

          {/* Content */}
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500 mb-1">Good morning</p>
            <p className="text-sm font-semibold text-white mb-4">
              Your day at a glance
            </p>

            <div className="rounded-xl bg-white/5 border border-white/[0.06] p-3 mb-3">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-white">87</span>
                <span className="text-[10px] text-green-400 mb-1">+12</span>
              </div>
              <p className="text-[10px] text-gray-500">Momentum Score</p>
            </div>

            <div className="space-y-2 mb-3">
              {[
                { label: 'Workout', time: '7:00 AM', done: true },
                { label: 'Deep work', time: '9:00 AM', done: false },
                { label: 'Read 20 pages', time: '8:00 PM', done: false },
              ].map((task) => (
                <div
                  key={task.label}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                >
                  <div
                    className={`h-3.5 w-3.5 rounded-full border ${
                      task.done
                        ? 'bg-primary border-primary'
                        : 'border-gray-600'
                    }`}
                  />
                  <span
                    className={`text-xs flex-1 ${
                      task.done
                        ? 'text-gray-500 line-through'
                        : 'text-gray-300'
                    }`}
                  >
                    {task.label}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {task.time}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
              <p className="text-[10px] text-primary-300">
                Focus: Complete morning workout for +5 momentum
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function ProductDemo() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')

  return (
    <section id="demo" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            See VitaMind in action.
          </h2>
        </motion.div>

        {/* Tab bar */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-xl bg-white/5 border border-white/[0.06] p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="active-tab"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'Dashboard' && <DashboardView />}
              {activeTab === 'Life Map' && <LifeMapView />}
              {activeTab === 'Mobile' && <MobileView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

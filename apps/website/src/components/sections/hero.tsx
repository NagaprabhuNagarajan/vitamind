'use client'

import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  animate,
  useMotionTemplate,
} from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

const DOMAINS = [
  { label: 'Health',  value: 72, color: '#22C55E' },
  { label: 'Career',  value: 85, color: '#6366F1' },
  { label: 'Growth',  value: 68, color: '#A855F7' },
  { label: 'Finance', value: 77, color: '#06B6D4' },
]

const FLOATING_CHIPS = [
  { text: '🔥 Burnout Risk: Low',      x: '-62%', y: '10%',  delay: 0 },
  { text: '⚡ +12 Momentum',           x: '62%',  y: '5%',   delay: 0.1 },
  { text: '🧠 Sleep → Focus Pattern',  x: '-60%', y: '60%',  delay: 0.2 },
  { text: '🎯 Highest Impact Action',  x: '58%',  y: '65%',  delay: 0.3 },
  { text: '📈 Trajectory: Improving',  x: '5%',   y: '-22%', delay: 0.15 },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnimatedScore() {
  const mv = useMotionValue(0)
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const c = animate(mv, 87, { duration: 1.8, ease: 'easeOut', delay: 0.3 })
    const u = mv.on('change', (v) => setDisplay(Math.round(v)))
    return () => { c.stop(); u() }
  }, [mv])
  return <span className="text-6xl font-bold text-white tabular-nums">{display}</span>
}

function DomainBar({ label, value, color, delayMs }: { label: string; value: number; color: string; delayMs: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 text-gray-400 text-xs">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-gray-400 text-xs">{value}%</span>
    </div>
  )
}

function Particles() {
  const pts = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      delay: Math.random() * 5,
      driftX: (Math.random() - 0.5) * 90,
      driftY: -(Math.random() * 140 + 30),
    }))
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pts.current.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white particle"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, opacity: 0.25,
            '--delay': `${p.delay}s`,
            '--drift-x': `${p.driftX}px`,
            '--drift-y': `${p.driftY}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ─── Main Hero ────────────────────────────────────────────────────────────────

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll progress across the full 500vh container
  const { scrollYProgress } = useScroll({ target: containerRef })
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20, restDelta: 0.0005 })

  // ── Phase 1: Intro text (0 → 0.22) ────────────────────────────────────────
  const textOpacity   = useTransform(smooth, [0, 0.06, 0.18, 0.26], [0, 1, 1, 0])
  const textY         = useTransform(smooth, [0, 0.06, 0.26],        [60, 0, -80])
  const textScale     = useTransform(smooth, [0, 0.06, 0.26],        [0.94, 1, 1.04])
  const badgeOpacity  = useTransform(smooth, [0, 0.04, 0.18, 0.24],  [0, 1, 1, 0])

  // ── Phase 2: Dashboard rise (0.22 → 0.50) ─────────────────────────────────
  const dashOpacity   = useTransform(smooth, [0.18, 0.30, 0.70, 0.82], [0, 1, 1, 0])
  const dashScale     = useTransform(smooth, [0.18, 0.32, 0.52, 0.70, 0.82], [0.72, 1, 1.06, 1.0, 0.88])
  const dashY         = useTransform(smooth, [0.18, 0.32, 0.82], [80, 0, -40])
  const dashBlur      = useTransform(smooth, [0.18, 0.30, 0.70, 0.82], [12, 0, 0, 10])
  const dashFilter    = useMotionTemplate`blur(${dashBlur}px)`

  // ── Phase 3: Floating chips (0.46 → 0.72) ─────────────────────────────────
  const chipsOpacity  = useTransform(smooth, [0.42, 0.52, 0.68, 0.78], [0, 1, 1, 0])
  const chipsScale    = useTransform(smooth, [0.42, 0.52, 0.78],        [0.7, 1, 0.8])

  // ── Phase 4: Big word reveal (0.60 → 0.80) ────────────────────────────────
  const wordOpacity   = useTransform(smooth, [0.58, 0.65, 0.74, 0.82], [0, 1, 1, 0])
  const wordScale     = useTransform(smooth, [0.58, 0.65, 0.82],        [0.6, 1, 1.1])
  const wordBlurVal   = useTransform(smooth, [0.58, 0.65, 0.82],        [20, 0, 8])
  const wordFilter    = useMotionTemplate`blur(${wordBlurVal}px)`

  // ── Phase 5: Outro vignette (0.80 → 1.0) ─────────────────────────────────
  const vignetteOp   = useTransform(smooth, [0.80, 1.0], [0, 0.85])

  // ── Background orb parallax ────────────────────────────────────────────────
  const orb1Y  = useTransform(smooth, [0, 1], ['0%',  '-30%'])
  const orb2Y  = useTransform(smooth, [0, 1], ['0%',  '-20%'])
  const orb3Y  = useTransform(smooth, [0, 1], ['0%',  '-40%'])

  return (
    // Tall scroll container — 500vh gives ~5 scroll lengths of room
    <div ref={containerRef} className="relative" style={{ height: '500vh' }}>

      {/* ── Sticky viewport ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* Background: gradient mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `
                radial-gradient(ellipse 80% 55% at 20% 40%, rgba(99,102,241,0.35) 0%, transparent 65%),
                radial-gradient(ellipse 65% 45% at 80% 60%, rgba(168,85,247,0.28) 0%, transparent 65%),
                radial-gradient(ellipse 55% 40% at 50% 15%, rgba(6,182,212,0.18) 0%, transparent 65%)
              `,
              animation: 'mesh-shift 14s ease-in-out infinite',
            }}
          />
        </div>

        {/* Floating orbs with parallax */}
        <motion.div style={{ y: orb1Y }} className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20">
          <div className="w-full h-full rounded-full animate-orb-float" style={{ background: '#6366F1' }} />
        </motion.div>
        <motion.div style={{ y: orb2Y }} className="absolute top-[35%] right-[10%] w-[420px] h-[420px] rounded-full blur-[120px] pointer-events-none opacity-15">
          <div className="w-full h-full rounded-full animate-orb-float" style={{ background: '#A855F7', animationDelay: '4s' }} />
        </motion.div>
        <motion.div style={{ y: orb3Y }} className="absolute bottom-[10%] left-[38%] w-[360px] h-[360px] rounded-full blur-[110px] pointer-events-none opacity-12">
          <div className="w-full h-full rounded-full animate-orb-float" style={{ background: '#06B6D4', animationDelay: '8s' }} />
        </motion.div>

        {/* Particles */}
        <Particles />

        {/* ── Phase 1: Intro text ─────────────────────────────────────────── */}
        <motion.div
          style={{ opacity: textOpacity, y: textY, scale: textScale }}
          className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6 text-center"
        >
          {/* Badge */}
          <motion.div style={{ opacity: badgeOpacity }} className="mb-8">
            <span className="shimmer-card inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-5 py-2 text-sm text-indigo-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Introducing AI Life GPS
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-none">
            <span className="gradient-text-animated block">Navigate your life</span>
            <span className="text-white block mt-2">with AI.</span>
          </h1>

          {/* Subheadline */}
          <p className="max-w-xl text-lg text-gray-400 mb-10 leading-relaxed">
            VitaMind analyzes your habits, goals, and daily actions to guide you toward a better life.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href="#waitlist"
              className="animate-glow-pulse rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white"
            >
              Join the Private Beta
            </a>
            <a
              href="#demo"
              className="rounded-xl border border-white/10 px-8 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
            >
              Watch Demo
            </a>
          </div>

          {/* Mini metrics preview */}
          <motion.div
            className="mt-14 w-full max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
          >
            {/* Label */}
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-4 font-medium">
              Your life at a glance
            </p>

            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Momentum',  value: '87',   unit: 'pts', delta: '+12', color: '#6366F1', delay: 0 },
                { label: 'Sleep',     value: '7.5',  unit: 'hrs', delta: '+0.5h', color: '#A855F7', delay: 0.07 },
                { label: 'Focus',     value: '94',   unit: '%',   delta: '▲ High', color: '#06B6D4', delay: 0.14 },
                { label: 'Goals',     value: '3/5',  unit: '',    delta: 'on track', color: '#22C55E', delay: 0.21 },
              ].map((m) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, scale: 0.88, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + m.delay, ease: 'easeOut' }}
                  className="relative rounded-xl px-4 py-3.5 text-left overflow-hidden"
                  style={{
                    background: 'rgba(15,17,23,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${m.color}22`,
                    boxShadow: `0 0 20px ${m.color}10`,
                  }}
                >
                  {/* Top glow line */}
                  <div
                    className="absolute top-0 left-4 right-4 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${m.color}60, transparent)` }}
                  />
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">{m.label}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-bold text-white leading-none">{m.value}</span>
                    {m.unit && <span className="text-xs text-gray-500 mb-0.5">{m.unit}</span>}
                  </div>
                  <p className="mt-1.5 text-[10px] font-medium" style={{ color: m.color }}>{m.delta}</p>
                </motion.div>
              ))}
            </div>

            {/* Divider hint */}
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/[0.04]" />
              <span className="text-[10px] text-gray-700 uppercase tracking-widest">AI-powered life intelligence</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            className="absolute bottom-10 flex flex-col items-center gap-2 text-gray-600 text-xs"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span>Scroll to explore</span>
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <rect x="6.5" y="0.5" width="3" height="5" rx="1.5" fill="currentColor" opacity="0.5" />
              <path d="M8 9 L8 17 M5 14 L8 17 L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        </motion.div>

        {/* ── Phase 4: Big word watermark (behind dashboard) ──────────────── */}
        <motion.div
          style={{ opacity: wordOpacity, scale: wordScale, filter: wordFilter }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
        >
          <span
            className="text-[22vw] font-black tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            VITAMIND
          </span>
        </motion.div>

        {/* ── Phase 2: Dashboard card ──────────────────────────────────────── */}
        <motion.div
          style={{ opacity: dashOpacity, scale: dashScale, y: dashY, filter: dashFilter }}
          className="absolute inset-0 flex items-center justify-center z-20 px-6"
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden shimmer-card"
            style={{
              background: 'rgba(15,17,23,0.85)',
              backdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(99,102,241,0.15)',
            }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-500 uppercase tracking-widest font-medium">Life Intelligence Report</span>
              </div>
              <span className="text-xs text-gray-600">VitaMind AI · Today</span>
            </div>

            <div className="p-6">
              {/* Score row */}
              <div className="flex items-end gap-4 mb-6">
                <AnimatedScore />
                <div className="mb-1 space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                    ▲ +12 pts
                  </span>
                  <p className="text-xs text-gray-500">Momentum Score</p>
                </div>
                {/* Mini sparkline */}
                <div className="ml-auto flex items-end gap-0.5 h-10">
                  {[40, 55, 48, 62, 58, 74, 87].map((v, i) => (
                    <div
                      key={i}
                      className="w-2 rounded-sm transition-all duration-700"
                      style={{
                        height: `${(v / 87) * 100}%`,
                        background: i === 6 ? '#6366F1' : 'rgba(99,102,241,0.3)',
                        transitionDelay: `${i * 80}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Domain bars */}
              <div className="space-y-2.5 mb-5">
                {DOMAINS.map((d, i) => (
                  <DomainBar key={d.label} {...d} delayMs={600 + i * 150} />
                ))}
              </div>

              {/* AI insight pill */}
              <div className="rounded-xl bg-indigo-500/8 border border-indigo-500/15 px-4 py-3">
                <p className="text-xs text-gray-300 leading-relaxed">
                  <span className="text-indigo-300 font-semibold">🤖 AI Insight — </span>
                  Completing your morning workout has a 34% correlation with high-focus days this month.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Phase 3: Floating metric chips ──────────────────────────────── */}
        <motion.div
          style={{ opacity: chipsOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
        >
          {FLOATING_CHIPS.map((chip, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                scale: chipsScale,
                left: `calc(50% + ${chip.x})`,
                top: `calc(50% + ${chip.y})`,
                x: '-50%',
                y: '-50%',
              }}
            >
              <div
                className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-medium text-white border"
                style={{
                  background: 'rgba(15,17,23,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(99,102,241,0.25)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.15)',
                }}
              >
                {chip.text}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Phase 5: Outro vignette ──────────────────────────────────────── */}
        <motion.div
          style={{ opacity: vignetteOp, background: 'radial-gradient(ellipse at center, transparent 20%, #060810 100%)' }}
          className="absolute inset-0 z-40 pointer-events-none"
        />

      </div>{/* end sticky */}
    </div>
  )
}

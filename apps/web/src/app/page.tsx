'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface-secondary">

      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-25" style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20" style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10" style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }} />
      </div>

      {/* Subtle grid overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg animate-fade-in-up">

        {/* Logo */}
        <div className="mb-8" style={{ filter: 'drop-shadow(0 0 40px rgba(99,102,241,0.6))' }}>
          <Image src="/logo.png" alt="VitaMind" width={96} height={96} className="rounded-3xl" />
        </div>

        {/* Brand name */}
        <div className="mb-3">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase" style={{
            background: 'linear-gradient(135deg, #A5B4FC, #C084FC)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            VitaMind
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight" style={{
          background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Intelligence for<br />your life.
        </h1>

        {/* Subtext */}
        <p className="text-base mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          The AI operating system that helps you manage tasks, goals, and habits — all in one calm, intelligent space.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {['Tasks', 'Goals', 'Habits', 'AI Planner'].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-xs font-medium" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
            }}>
              {f}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-3 w-full sm:w-auto">
          <Link
            href="/register"
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              boxShadow: '0 0 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.boxShadow = '0 0 36px rgba(99,102,241,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}

import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-secondary relative overflow-hidden">
      {/* Ambient orbs — subtle version of auth pages */}
      <div className="absolute pointer-events-none" style={{
        top: '-15%', left: '-5%',
        width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '-10%', right: '-5%',
        width: '35vw', height: '35vw',
        background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }} />

      {/* Navigation bar */}
      <nav className="relative z-10 max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>
        <span className="text-sm font-semibold tracking-wider uppercase" style={{
          background: 'linear-gradient(135deg, #A5B4FC, #C084FC)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          VitaMind
        </span>
      </nav>

      {/* Prose container */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        {children}
      </main>
    </div>
  )
}

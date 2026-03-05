import { Sidebar } from '@/components/layout/sidebar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface-secondary">
      {/* Skip navigation link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-white focus:rounded"
      >
        Skip to main content
      </a>

      {/* Background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 animate-float" style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '0s',
        }} />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full opacity-15 animate-float" style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '2s',
        }} />
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 rounded-full opacity-10 animate-float" style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animationDelay: '4s',
        }} />
      </div>

      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main id="main-content" className="flex-1 overflow-y-auto relative" role="main">
        <div className="max-w-5xl mx-auto p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}

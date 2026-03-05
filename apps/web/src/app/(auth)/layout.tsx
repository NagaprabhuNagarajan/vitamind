export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-secondary flex items-center justify-center relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute pointer-events-none" style={{
        top: '-20%', left: '-10%',
        width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        bottom: '-15%', right: '-5%',
        width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 60%)',
        filter: 'blur(80px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 60%)',
        filter: 'blur(60px)',
      }} />

      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 w-full max-w-sm px-4">
        {children}
      </div>
    </div>
  )
}

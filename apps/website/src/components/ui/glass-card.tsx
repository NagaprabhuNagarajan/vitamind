import { clsx } from 'clsx'

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={clsx('glass-card p-6', className)}>{children}</div>
}

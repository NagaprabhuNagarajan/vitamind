import { clsx } from 'clsx'

export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={clsx('gradient-text', className)}>{children}</span>
}

import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'error' | 'success' | 'info'
  message: string
  className?: string
}

const variants = {
  error:   'bg-red-50 text-red-700 border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
}

export function Alert({ variant = 'error', message, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded border px-4 py-3 text-sm',
        variants[variant],
        className
      )}
    >
      {message}
    </div>
  )
}

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { px: 24, text: 'text-sm' },
  md: { px: 32, text: 'text-base' },
  lg: { px: 40, text: 'text-lg' },
}

export function Logo({ size = 'md', className }: LogoProps) {
  const s = sizes[size]
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))', flexShrink: 0 }}>
        <Image src="/logo.png" alt="VitaMind" width={s.px} height={s.px} className="rounded-lg" />
      </div>
      <span className={cn('font-semibold', s.text)} style={{
        background: 'linear-gradient(135deg, #C7D2FE, #E9D5FF)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        VitaMind
      </span>
    </div>
  )
}

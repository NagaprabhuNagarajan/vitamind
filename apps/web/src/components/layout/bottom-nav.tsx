'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Repeat2,
  CalendarDays,
  MessageSquare,
} from 'lucide-react'
import { LogoutDialog } from './logout-dialog'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home',    icon: LayoutDashboard },
  { href: '/tasks',     label: 'Tasks',   icon: CheckSquare },
  { href: '/goals',     label: 'Goals',   icon: Target },
  { href: '/habits',    label: 'Habits',  icon: Repeat2 },
  { href: '/planner',   label: 'Planner', icon: CalendarDays },
  { href: '/ai',        label: 'AI',      icon: MessageSquare },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        background: 'rgba(6,8,16,0.85)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-all duration-150 relative',
              active ? 'text-white' : 'text-text-tertiary',
            )}
          >
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                style={{ background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
              />
            )}
            <Icon
              className="w-5 h-5"
              style={active ? {
                filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.7))',
                color: '#A5B4FC',
              } : {}}
            />
            <span>{label}</span>
          </Link>
        )
      })}

      {/* Logout */}
      <div className="flex flex-1">
        <LogoutDialog variant="bottom-nav" />
      </div>
    </nav>
  )
}

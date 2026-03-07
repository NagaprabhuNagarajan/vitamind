'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Repeat2,
  CalendarDays,
  MessageSquare,
  Settings,
  Sparkles,
  BookOpen,
  Crosshair,
  Shield,
  Clock,
  Hexagon,
  TrendingUp,
  Wallet,
  Heart,
  Zap,
} from 'lucide-react'
import { LogoutDialog } from './logout-dialog'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { href: '/goals',     label: 'Goals',     icon: Target },
  { href: '/habits',    label: 'Habits',    icon: Repeat2 },
  { href: '/planner',   label: 'Planner',   icon: CalendarDays },
  { href: '/ai',        label: 'AI Chat',   icon: MessageSquare },
  { href: '/patterns',  label: 'Patterns',  icon: Sparkles },
  { href: '/reviews',   label: 'Reviews',   icon: BookOpen },
  { href: '/focus',      label: 'Focus',     icon: Crosshair },
  { href: '/contracts',  label: 'Contracts', icon: Shield },
  { href: '/timeline',           label: 'Timeline',  icon: Clock },
  { href: '/life-map',           label: 'Life Map',  icon: Hexagon },
  { href: '/behavioral-trends',  label: 'Trends',       icon: TrendingUp },
  { href: '/finance',            label: 'Finance',      icon: Wallet },
  { href: '/health',             label: 'Health',       icon: Heart },
  { href: '/automations',        label: 'Automations',  icon: Zap },
  { href: '/settings',           label: 'Settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-col relative" style={{
      background: 'rgba(6,8,16,0.8)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-0 w-full h-48 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
      }} />

      {/* Logo */}
      <div className="flex h-14 items-center px-4 gap-2.5 relative" style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }}>
          <Image src="/logo.png" alt="VitaMind logo" width={28} height={28} className="rounded-lg" />
        </div>
        <span className="font-semibold text-sm tracking-tight" style={{
          background: 'linear-gradient(135deg, #C7D2FE, #E9D5FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          VitaMind
        </span>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-2 space-y-0.5 relative">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative group',
                active
                  ? 'text-white'
                  : 'text-text-tertiary hover:text-text-secondary',
              )}
              style={active ? {
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
              } : {}}
            >
              {active && (
                <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
                  background: 'radial-gradient(ellipse at 0% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)',
                }} />
              )}
              {!active && (
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{
                  background: 'rgba(255,255,255,0.04)',
                }} />
              )}
              <Icon aria-hidden="true" className={cn('w-4 h-4 flex-shrink-0 relative', active ? 'text-primary-300' : '')} />
              <span className="relative">{label}</span>
              {active && (
                <div className="ml-auto w-1 h-1 rounded-full bg-primary-400" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <LogoutDialog variant="sidebar" />
      </div>
    </aside>
  )
}

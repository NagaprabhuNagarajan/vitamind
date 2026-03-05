'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, AlertTriangle } from 'lucide-react'
import { logout } from '@/features/auth/actions'
import { cn } from '@/lib/utils'

interface LogoutDialogProps {
  variant?: 'sidebar' | 'bottom-nav'
}

export function LogoutDialog({ variant = 'sidebar' }: LogoutDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(() => logout())
  }

  return (
    <>
      {/* Trigger */}
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-tertiary hover:text-red-400 transition-all duration-150"
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-text-tertiary hover:text-red-400 transition-all duration-150"
        >
          <LogOut aria-hidden="true" className="w-5 h-5" />
          <span>Sign out</span>
        </button>
      )}

      {/* Backdrop + Dialog — rendered in document.body via portal */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
          onClick={() => setOpen(false)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden p-6 space-y-5 animate-scale-in"
            style={{
              background: 'rgba(15,17,23,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{
              background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)',
            }} />

            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <AlertTriangle aria-hidden="true" className="w-6 h-6 text-red-400" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h2 id="logout-dialog-title" className="text-base font-semibold text-text-primary">Sign out?</h2>
              <p className="text-sm text-text-tertiary">You'll need to sign in again to access your account.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className={cn(
                  'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-50',
                )}
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.8))',
                  border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: '0 0 16px rgba(239,68,68,0.2)',
                }}
              >
                {isPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

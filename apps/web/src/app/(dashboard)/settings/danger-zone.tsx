'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, AlertTriangle } from 'lucide-react'
import { logout } from '@/features/auth/actions'

export function DangerZone() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const confirmed = confirmText === 'DELETE'

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/user', { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to delete account.')
        setDeleting(false)
        return
      }

      // Account deleted — sign out and redirect to login
      startTransition(() => logout())
    } catch {
      setError('Network error. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <section
        className="card p-6 space-y-5"
        style={{ borderColor: 'rgba(239,68,68,0.2)' }}
      >
        {/* Section header */}
        <div className="flex items-center gap-3">
          <div className="icon-box" style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
            <p className="text-xs text-text-tertiary">Irreversible actions</p>
          </div>
        </div>

        <div className="divider" />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">Delete account</p>
            <p className="text-xs text-text-tertiary">
              Permanently remove your account and all associated data. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="btn text-sm px-4 py-2 text-red-400 flex-shrink-0"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            Delete account
          </button>
        </div>
      </section>

      {/* Confirmation dialog — portal to body to avoid sidebar z-index issues */}
      {dialogOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => { setDialogOpen(false); setConfirmText(''); setError(null) }}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden p-6 space-y-5 animate-scale-in"
            style={{
              background: 'rgba(15,17,23,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
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
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
              <h2 className="text-base font-semibold text-text-primary">Delete your account?</h2>
              <p className="text-sm text-text-tertiary">
                All your tasks, goals, habits, and data will be permanently removed. This action cannot be undone.
              </p>
            </div>

            {/* Confirm input */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-tertiary">
                Type <span className="font-mono font-semibold text-red-400">DELETE</span> to confirm
              </label>
              <input
                type="text"
                className="input text-center font-mono tracking-widest"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                autoComplete="off"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setDialogOpen(false); setConfirmText(''); setError(null) }}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: confirmed
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.8))'
                    : 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  boxShadow: confirmed ? '0 0 16px rgba(239,68,68,0.2)' : 'none',
                }}
              >
                {deleting ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

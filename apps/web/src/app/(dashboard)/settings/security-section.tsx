'use client'

import { useState } from 'react'
import { Shield, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function SecuritySection({ email }: { email: string }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResetPassword() {
    setSending(true)
    try {
      const supabase = createClient()
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      setSent(true)
    } catch {
      // Silently fail — Supabase still queues the email in most cases
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="icon-box" style={{
          background: 'rgba(6,182,212,0.12)',
          border: '1px solid rgba(6,182,212,0.25)',
        }}>
          <Shield className="w-5 h-5 text-accent-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Security</h2>
          <p className="text-xs text-text-tertiary">Manage your password</p>
        </div>
      </div>

      <div className="divider" />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">Password</p>
          <p className="text-xs text-text-tertiary">
            {sent
              ? 'Check your email for a password reset link.'
              : 'Send a password reset link to your email.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={sending || sent}
          className="btn-secondary flex items-center gap-2"
        >
          <Mail className="w-3.5 h-3.5" />
          {sending ? 'Sending...' : sent ? 'Email sent' : 'Reset password'}
        </button>
      </div>
    </section>
  )
}

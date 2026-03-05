'use client'

import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { resendConfirmationEmail } from '@/features/auth/actions'

interface ResendButtonProps {
  email: string
}

/**
 * Client component that calls the resend server action.
 * Includes a cooldown to prevent abuse and shows feedback on success/error.
 */
export function ResendButton({ email }: ResendButtonProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleResend() {
    if (!email || status === 'sending' || status === 'sent') return

    setStatus('sending')
    setErrorMessage('')

    try {
      const result = await resendConfirmationEmail(email)

      if (result.error) {
        setStatus('error')
        setErrorMessage(result.error)
      } else {
        setStatus('sent')
        // Reset to idle after cooldown so user can resend again
        setTimeout(() => setStatus('idle'), 60_000)
      }
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleResend}
        disabled={!email || status === 'sending' || status === 'sent'}
        className="btn-secondary w-full"
      >
        {status === 'sending' && <Spinner size="sm" />}
        {status === 'sending' && 'Sending...'}
        {status === 'sent' && 'Email sent — check your inbox'}
        {status === 'error' && 'Resend confirmation email'}
        {status === 'idle' && 'Resend confirmation email'}
      </button>

      {status === 'error' && errorMessage && (
        <p className="text-xs text-center" style={{ color: '#EF4444' }}>
          {errorMessage}
        </p>
      )}

      {status === 'sent' && (
        <p className="text-xs text-center" style={{ color: '#10B981' }}>
          A new confirmation email has been sent.
        </p>
      )}
    </div>
  )
}

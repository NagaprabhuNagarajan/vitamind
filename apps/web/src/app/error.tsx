'use client'

import { useEffect } from 'react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global error boundary for the Next.js app.
 * Catches unhandled errors and shows a branded recovery screen.
 * Logs to console now; will integrate with Sentry later.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error for debugging — Sentry integration point
    console.error('[VitaMind] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ background: '#060810' }}>
      <div className="flex max-w-md flex-col items-center text-center">
        {/* Icon */}
        <div
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(239, 68, 68, 0.8)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          className="mb-2 text-2xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Something went wrong
        </h1>

        {/* Description */}
        <p className="mb-8 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          An unexpected error occurred. You can try again, or head back to the dashboard.
        </p>

        {/* Error digest for support — only shown if available */}
        {error.digest && (
          <p
            className="mb-6 rounded-lg px-3 py-2 font-mono text-xs"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}

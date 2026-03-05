import type { Metadata } from 'next'
import Link from 'next/link'
import { ResendButton } from './resend-button'

export const metadata: Metadata = { title: 'Verify your email' }

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

/**
 * Post-registration page shown when email confirmation is required.
 * Displays the submitted email and offers a resend button powered by
 * Supabase's resend OTP flow.
 */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  const email = params.email ?? ''

  return (
    <div className="animate-scale-in">
      {/* Glass card */}
      <div className="relative rounded-2xl overflow-hidden p-8 space-y-6" style={{
        background: 'rgba(15,17,23,0.7)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(168,85,247,0.6), transparent)',
        }} />

        {/* Email icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            boxShadow: '0 0 24px rgba(99,102,241,0.35)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 4L12 13L2 4" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold gradient-text">Check your email</h1>
          <p className="text-sm text-text-tertiary leading-relaxed">
            We sent a confirmation link to
            {email ? (
              <>
                <br />
                <span className="text-text-secondary font-medium">{email}</span>
              </>
            ) : (
              ' your email address'
            )}
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-xl p-4 space-y-2" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <p className="text-xs text-text-tertiary leading-relaxed">
            Click the link in the email to verify your account. If you do not see
            the email, check your spam folder.
          </p>
        </div>

        {/* Resend button */}
        <ResendButton email={email} />

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Back to login */}
        <p className="text-center text-sm text-text-tertiary">
          <Link href="/login" className="text-primary-300 font-medium hover:text-primary-200 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

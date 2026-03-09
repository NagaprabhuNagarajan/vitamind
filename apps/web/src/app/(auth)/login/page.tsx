import Link from 'next/link'
import Image from 'next/image'
import { Alert } from '@/components/ui/alert'
import { login } from '@/features/auth/actions'
import { LoginForm } from './login-form'
import { GoogleButton } from './google-button'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; success?: string }>
}

export const metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams

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

        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div style={{ filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.6))' }}>
              <Image src="/logo.png" alt="VitaMind" width={64} height={64} className="rounded-2xl" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Welcome back</h1>
            <p className="text-sm text-text-tertiary mt-1">Sign in to VitaMind</p>
          </div>
        </div>

        {params.error && <Alert variant="error" message={params.error} />}
        {params.success && <Alert variant="success" message={params.success} />}

        {/* Google button */}
        <GoogleButton />

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          <span className="text-xs text-text-tertiary">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
        </div>

        <LoginForm action={login} />

        <p className="text-center text-sm text-text-tertiary">
          No account?{' '}
          <Link href="/register" className="text-primary-300 font-medium hover:text-primary-200 transition-colors">
            Sign up free
          </Link>
        </p>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/privacy" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            Privacy Policy
          </Link>
          <span className="text-text-tertiary text-xs">|</span>
          <Link href="/terms" className="text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}


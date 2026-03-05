import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Alert } from '@/components/ui/alert'
import { register, loginWithGoogle } from '@/features/auth/actions'
import { RegisterForm } from './register-form'

interface RegisterPageProps {
  searchParams: Promise<{ error?: string; success?: string }>
}

export const metadata = { title: 'Create account' }

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams

  return (
    <div className="w-full max-w-sm px-4">
      <div className="card p-8 space-y-6">
        <div className="text-center space-y-2">
          <Logo size="md" className="justify-center" />
          <h1 className="text-xl font-semibold text-text-primary">Create your account</h1>
          <p className="text-sm text-text-secondary">Start managing your life with AI</p>
        </div>

        {params.error && <Alert variant="error" message={params.error} />}
        {params.success && <Alert variant="success" message={params.success} />}

        <form action={loginWithGoogle}>
          <button type="submit" className="btn-secondary w-full gap-3">
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-text-tertiary">
            <span className="bg-surface px-2">or register with email</span>
          </div>
        </div>

        <RegisterForm action={register} />

        <p className="text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Alert } from '@/components/ui/alert'
import { register } from '@/features/auth/actions'
import { RegisterForm } from './register-form'
import { GoogleButton } from '@/app/(auth)/login/google-button'

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

        <GoogleButton />

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

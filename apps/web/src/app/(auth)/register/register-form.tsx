'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'

interface RegisterFormProps {
  action: (formData: FormData) => Promise<void>
}

export function RegisterForm({ action }: RegisterFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-text-primary">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Alex Johnson"
          className="input"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="input"
          disabled={isPending}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Minimum 8 characters"
          className="input"
          disabled={isPending}
        />
      </div>

      {/* Legal agreement notice */}
      <p className="text-xs text-text-tertiary leading-relaxed">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="text-primary-300 hover:text-primary-200 transition-colors">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-primary-300 hover:text-primary-200 transition-colors">
          Privacy Policy
        </Link>.
      </p>

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? <Spinner size="sm" /> : null}
        {isPending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}

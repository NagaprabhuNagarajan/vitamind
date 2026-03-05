'use client'

import { useTransition } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface LoginFormProps {
  action: (formData: FormData) => Promise<void>
}

export function LoginForm({ action }: LoginFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => action(formData))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="input"
          disabled={isPending}
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? <Spinner size="sm" /> : null}
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

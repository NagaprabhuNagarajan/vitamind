'use client'

import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type FormStatus = 'idle' | 'loading' | 'success' | 'error'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!EMAIL_REGEX.test(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage("You're on the list! We'll be in touch.")
      } else if (response.status === 409) {
        setStatus('success')
        setMessage("You're already on the list!")
      } else {
        const data = await response.json().catch(() => null)
        setStatus('error')
        setMessage(data?.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-6 py-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {/* Animated checkmark SVG */}
        <svg
          className="h-5 w-5 text-green-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          />
        </svg>
        <p className="text-green-300 text-sm">{message}</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Focus ring wrapper */}
        <motion.div
          className="flex-1 rounded-xl"
          animate={{
            boxShadow: isFocused
              ? '0 0 0 2px rgba(99,102,241,0.5)'
              : '0 0 0 0px rgba(99,102,241,0)',
          }}
          transition={{ duration: 0.2 }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter your email"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
            disabled={status === 'loading'}
            aria-label="Email address"
          />
        </motion.div>
        <motion.button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-sm font-semibold text-white transition-all hover:shadow-glow-md disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {status === 'loading' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </span>
          ) : (
            'Join Beta'
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {status === 'error' && (
          <motion.p
            className="mt-2 text-sm text-red-400"
            initial={{ opacity: 0, x: 0 }}
            animate={{ opacity: 1, x: [0, -8, 8, -8, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

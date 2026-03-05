// Environment variable validation — runs once on server cold start.
// Ensures all required vars exist and provides typed access to config values.

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const OPTIONAL_VARS = [
  'AI_PROVIDER',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const

type RequiredVar = (typeof REQUIRED_VARS)[number]
type OptionalVar = (typeof OPTIONAL_VARS)[number]

/** Validates that all required environment variables are present. */
export function validateEnv(): void {
  const missing: string[] = []

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[VitaMind] Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}\n\nAdd them to .env.local or your deployment environment.`,
    )
  }

  // Warn about missing optional vars (non-blocking)
  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      console.warn(`[VitaMind] Optional env var "${key}" is not set.`)
    }
  }
}

/**
 * Typed accessor for all environment variables.
 * Required vars are typed as `string`; optional vars as `string | undefined`.
 */
export const env: Record<RequiredVar, string> & Record<OptionalVar, string | undefined> = {
  // Required — guaranteed to exist after validateEnv()
  get NEXT_PUBLIC_SUPABASE_URL() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY!
  },

  // Optional — may be undefined
  get AI_PROVIDER() {
    return process.env.AI_PROVIDER
  },
  get OPENAI_API_KEY() {
    return process.env.OPENAI_API_KEY
  },
  get GROQ_API_KEY() {
    return process.env.GROQ_API_KEY
  },
  get NEXT_PUBLIC_APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL
  },
}

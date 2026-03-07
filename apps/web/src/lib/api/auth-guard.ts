import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { Errors } from './errors'
import type { User } from '@supabase/supabase-js'

// Validates session and returns the authenticated user — throws ApiError if not authenticated.
// Supports both cookie-based sessions (web) and Bearer token auth (mobile API clients).
export async function requireAuth(): Promise<User> {
  const headerStore = await headers()
  const authorization = headerStore.get('authorization')

  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7)
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) throw Errors.unauthorized()
    return user
  }

  // Fall back to cookie-based session (web dashboard)
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw Errors.unauthorized()
  }

  return user
}

import { createClient } from '@/lib/supabase/server'
import { Errors } from './errors'
import type { User } from '@supabase/supabase-js'

// Validates session and returns the authenticated user — throws ApiError if not authenticated
export async function requireAuth(): Promise<User> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw Errors.unauthorized()
  }

  return user
}

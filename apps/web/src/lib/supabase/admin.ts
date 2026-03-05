import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, used only in server-side API routes
// NEVER expose this to the client
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

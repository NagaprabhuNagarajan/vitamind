import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileForm } from './profile-form'
import { DangerZone } from './danger-zone'
import { SecuritySection } from './security-section'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the profile row — fall back to auth metadata if missing
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, timezone')
    .eq('id', user.id)
    .single()

  const userProfile = {
    id: user.id,
    email: user.email ?? '',
    name: profile?.name ?? user.user_metadata?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your profile and account preferences."
      />

      {/* Profile */}
      <ProfileForm profile={userProfile} />

      {/* Security */}
      <SecuritySection email={userProfile.email} />

      {/* Danger Zone */}
      <DangerZone />
    </div>
  )
}

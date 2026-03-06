import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileForm } from './profile-form'
import { NotificationSection } from './notification-section'
import { SecuritySection } from './security-section'
import { CalendarSection } from './calendar-section'
import { DangerZone } from './danger-zone'
import { TimeFingerprintSection } from './time-fingerprint-section'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile row including email notification preferences
  // Try with email pref columns first; fall back without them if migration 006 hasn't run
  let profile: Record<string, unknown> | null = null
  const { data: fullProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, timezone, email_weekly_report, email_daily_reminder')
    .eq('id', user.id)
    .single()

  if (profileError) {
    // Columns might not exist — retry with base columns only
    const { data: baseProfile } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, timezone')
      .eq('id', user.id)
      .single()
    profile = baseProfile as Record<string, unknown> | null
  } else {
    profile = fullProfile as Record<string, unknown> | null
  }

  const userProfile = {
    id: user.id,
    email: user.email ?? '',
    name: (profile?.name as string) ?? user.user_metadata?.full_name ?? '',
    avatarUrl: (profile?.avatar_url as string) ?? user.user_metadata?.avatar_url ?? null,
    timezone: (profile?.timezone as string) ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  const notificationPrefs = {
    emailWeeklyReport: (profile?.email_weekly_report as boolean) ?? true,
    emailDailyReminder: (profile?.email_daily_reminder as boolean) ?? false,
    timezone: userProfile.timezone,
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Settings"
        description="Manage your profile and account preferences."
      />

      {/* Profile */}
      <ProfileForm profile={userProfile} />

      {/* Notifications */}
      <NotificationSection prefs={notificationPrefs} />

      {/* Security */}
      <SecuritySection email={userProfile.email} />

      {/* Time Fingerprint */}
      <TimeFingerprintSection />

      {/* Calendar Integration */}
      <CalendarSection />

      {/* Danger Zone */}
      <DangerZone />
    </div>
  )
}

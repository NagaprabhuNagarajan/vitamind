import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileForm } from './profile-form'
import { NotificationSection } from './notification-section'
import { SecuritySection } from './security-section'
import { CalendarSection } from './calendar-section'
import { DangerZone } from './danger-zone'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch profile row including email notification preferences
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, avatar_url, timezone, email_weekly_report, email_daily_reminder')
    .eq('id', user.id)
    .single()

  const userProfile = {
    id: user.id,
    email: user.email ?? '',
    name: profile?.name ?? user.user_metadata?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
    timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  }

  const notificationPrefs = {
    emailWeeklyReport: profile?.email_weekly_report ?? true,
    emailDailyReminder: profile?.email_daily_reminder ?? false,
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

      {/* Calendar Integration */}
      <CalendarSection />

      {/* Danger Zone */}
      <DangerZone />
    </div>
  )
}

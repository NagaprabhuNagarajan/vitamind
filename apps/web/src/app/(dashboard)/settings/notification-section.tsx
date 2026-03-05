'use client'

import { useState } from 'react'
import { Bell, Mail, Clock } from 'lucide-react'

// Common timezones — same list used in ProfileForm for consistency
const TIMEZONE_OPTIONS = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US Eastern', value: 'America/New_York' },
  { label: 'US Central', value: 'America/Chicago' },
  { label: 'US Mountain', value: 'America/Denver' },
  { label: 'US Pacific', value: 'America/Los_Angeles' },
  { label: 'US Alaska', value: 'America/Anchorage' },
  { label: 'US Hawaii', value: 'Pacific/Honolulu' },
  { label: 'Canada Toronto', value: 'America/Toronto' },
  { label: 'Canada Vancouver', value: 'America/Vancouver' },
  { label: 'Mexico City', value: 'America/Mexico_City' },
  { label: 'Sao Paulo', value: 'America/Sao_Paulo' },
  { label: 'Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
  { label: 'London', value: 'Europe/London' },
  { label: 'Paris', value: 'Europe/Paris' },
  { label: 'Berlin', value: 'Europe/Berlin' },
  { label: 'Amsterdam', value: 'Europe/Amsterdam' },
  { label: 'Rome', value: 'Europe/Rome' },
  { label: 'Madrid', value: 'Europe/Madrid' },
  { label: 'Moscow', value: 'Europe/Moscow' },
  { label: 'Istanbul', value: 'Europe/Istanbul' },
  { label: 'Dubai', value: 'Asia/Dubai' },
  { label: 'Karachi', value: 'Asia/Karachi' },
  { label: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { label: 'Dhaka', value: 'Asia/Dhaka' },
  { label: 'Bangkok', value: 'Asia/Bangkok' },
  { label: 'Jakarta', value: 'Asia/Jakarta' },
  { label: 'Singapore', value: 'Asia/Singapore' },
  { label: 'Hong Kong', value: 'Asia/Hong_Kong' },
  { label: 'Shanghai', value: 'Asia/Shanghai' },
  { label: 'Seoul', value: 'Asia/Seoul' },
  { label: 'Tokyo', value: 'Asia/Tokyo' },
  { label: 'Sydney', value: 'Australia/Sydney' },
  { label: 'Melbourne', value: 'Australia/Melbourne' },
  { label: 'Perth', value: 'Australia/Perth' },
  { label: 'Auckland', value: 'Pacific/Auckland' },
  { label: 'Cairo', value: 'Africa/Cairo' },
  { label: 'Lagos', value: 'Africa/Lagos' },
  { label: 'Johannesburg', value: 'Africa/Johannesburg' },
]

interface NotificationPrefs {
  emailWeeklyReport: boolean
  emailDailyReminder: boolean
  timezone: string
}

export function NotificationSection({ prefs }: { prefs: NotificationPrefs }) {
  const [weeklyReport, setWeeklyReport] = useState(prefs.emailWeeklyReport)
  const [dailyReminder, setDailyReminder] = useState(prefs.emailDailyReminder)
  const [timezone, setTimezone] = useState(prefs.timezone)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasChanges =
    weeklyReport !== prefs.emailWeeklyReport ||
    dailyReminder !== prefs.emailDailyReminder ||
    timezone !== prefs.timezone

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/v1/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_weekly_report: weeklyReport,
          email_daily_reminder: dailyReminder,
          timezone,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error?.message ?? 'Failed to save preferences.' })
        return
      }

      setMessage({ type: 'success', text: 'Notification preferences updated.' })
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="icon-box" style={{
          background: 'rgba(168,85,247,0.12)',
          border: '1px solid rgba(168,85,247,0.25)',
        }}>
          <Bell className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
          <p className="text-xs text-text-tertiary">Email reports and reminders</p>
        </div>
      </div>

      <div className="divider" />

      {/* Weekly report toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-text-secondary" />
            <p className="text-sm font-medium text-text-primary">Weekly productivity report</p>
          </div>
          <p className="text-xs text-text-tertiary pl-5.5">
            Receive a summary of your tasks, habits, and goals every Sunday.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={weeklyReport}
          onClick={() => setWeeklyReport(!weeklyReport)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
          style={{
            background: weeklyReport
              ? 'linear-gradient(135deg, #6366F1, #A855F7)'
              : 'rgba(255,255,255,0.1)',
          }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
            style={{
              transform: weeklyReport ? 'translateX(20px) translateY(2px)' : 'translateX(2px) translateY(2px)',
            }}
          />
        </button>
      </div>

      {/* Daily reminder toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-text-secondary" />
            <p className="text-sm font-medium text-text-primary">Daily task reminder</p>
          </div>
          <p className="text-xs text-text-tertiary pl-5.5">
            Get a morning email with your tasks and priorities for the day.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dailyReminder}
          onClick={() => setDailyReminder(!dailyReminder)}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
          style={{
            background: dailyReminder
              ? 'linear-gradient(135deg, #6366F1, #A855F7)'
              : 'rgba(255,255,255,0.1)',
          }}
        >
          <span
            className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
            style={{
              transform: dailyReminder ? 'translateX(20px) translateY(2px)' : 'translateX(2px) translateY(2px)',
            }}
          />
        </button>
      </div>

      {/* Timezone selector */}
      <div className="space-y-1.5">
        <label htmlFor="notif-tz" className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Delivery timezone
        </label>
        <select
          id="notif-tz"
          className="input"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
          ))}
        </select>
        <p className="text-xs text-text-tertiary">
          Emails are sent at 8:00 AM in your selected timezone.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <p className={`text-xs font-medium ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { User, Globe } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  timezone: string
}

// Most-used timezone options grouped by region
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

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name)
  const [timezone, setTimezone] = useState(profile.timezone)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const hasChanges = name !== profile.name || timezone !== profile.timezone

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/v1/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), timezone }),
      })

      const json = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error?.message ?? 'Failed to save changes.' })
        return
      }

      setMessage({ type: 'success', text: 'Profile updated.' })
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
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.25)',
        }}>
          <User className="w-5 h-5 text-primary-300" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">Profile</h2>
          <p className="text-xs text-text-tertiary">Your personal information</p>
        </div>
      </div>

      <div className="divider" />

      {/* Avatar + initials */}
      <div className="flex items-center gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Avatar"
            className="w-14 h-14 rounded-full border border-white/10"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
            }}
          >
            {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-text-primary">{profile.name || 'No name set'}</p>
          <p className="text-xs text-text-tertiary">{profile.email}</p>
        </div>
      </div>

      {/* Name field */}
      <div className="space-y-1.5">
        <label htmlFor="settings-name" className="text-xs font-medium text-text-secondary">
          Display name
        </label>
        <input
          id="settings-name"
          type="text"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Your name"
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-text-secondary">
          Email
        </label>
        <input
          type="email"
          className="input opacity-60 cursor-not-allowed"
          value={profile.email}
          readOnly
          tabIndex={-1}
        />
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <label htmlFor="settings-tz" className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          Timezone
        </label>
        <select
          id="settings-tz"
          className="input"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
          ))}
        </select>
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
          disabled={saving || !hasChanges || name.trim().length === 0}
          className="btn-primary"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </section>
  )
}

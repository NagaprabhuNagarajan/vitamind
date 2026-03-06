'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Link2, Unlink, RefreshCw, Check, ExternalLink, Download } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface CalendarStatus {
  connected: boolean
  provider: string | null
  syncEnabled?: boolean
  lastSyncedAt?: string | null
  connectedAt?: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.events'

function buildGoogleOAuthUrl(redirectUri: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) return ''

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: 'google-calendar',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// ── Component ────────────────────────────────────────────────────────────────

export function CalendarSection() {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch calendar connection status on mount
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/calendar/status')
      const json = await res.json()
      if (res.ok) {
        setStatus(json.data)
      }
    } catch {
      // Non-critical — show disconnected state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Handle the OAuth callback — check URL for authorization code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code && state === 'google-calendar') {
      // Remove the code from the URL to prevent re-processing on refresh
      window.history.replaceState({}, '', window.location.pathname)
      handleOAuthCallback(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleOAuthCallback(code: string) {
    setLoading(true)
    setError(null)
    try {
      const redirectUri = `${window.location.origin}/settings`
      const res = await fetch('/api/v1/calendar/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          code,
          redirect_uri: redirectUri,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to connect calendar.')
      } else {
        await fetchStatus()
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    const redirectUri = `${window.location.origin}/settings`
    const url = buildGoogleOAuthUrl(redirectUri)
    if (!url) {
      setError('Google Calendar integration is not configured.')
      return
    }
    window.location.href = url
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const res = await fetch('/api/v1/calendar/sync', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Sync failed.')
      } else {
        const { synced, total, message } = json.data
        setSyncResult(message ?? `Synced ${synced} of ${total} tasks.`)
        await fetchStatus()
      }
    } catch {
      setError('Network error during sync.')
    } finally {
      setSyncing(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setSyncResult(null)
    setError(null)
    try {
      const res = await fetch('/api/v1/calendar/import', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Import failed.')
      } else {
        setSyncResult(json.data.message)
        await fetchStatus()
      }
    } catch {
      setError('Network error during import.')
    } finally {
      setImporting(false)
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/calendar/disconnect?provider=google', {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to disconnect.')
      } else {
        setStatus({ connected: false, provider: null })
        setSyncResult(null)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Formatting helpers ───────────────────────────────────────────────────

  function formatLastSynced(iso: string | null | undefined): string {
    if (!iso) return 'Never'
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60_000)

    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`

    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const connected = status?.connected ?? false

  return (
    <section className="card p-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div
          className="icon-box"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          <Calendar className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Calendar Integration
          </h2>
          <p className="text-xs text-text-tertiary">
            Sync tasks with Google Calendar
          </p>
        </div>
      </div>

      <div className="divider" />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : connected ? (
        /* Connected state */
        <div className="space-y-4">
          {/* Connection status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: '#22c55e' }}
              />
              <span className="text-sm font-medium text-text-primary">
                Google Calendar connected
              </span>
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Unlink className="w-3.5 h-3.5" />
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>

          {/* Last sync info */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-text-secondary">Last synced</p>
              <p className="text-xs text-text-tertiary">
                {formatLastSynced(status?.lastSyncedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                {importing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {importing ? 'Importing...' : 'Import events'}
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {syncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {syncing ? 'Syncing...' : 'Sync tasks'}
              </button>
            </div>
          </div>

          {/* Sync result feedback */}
          {syncResult && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Check className="w-4 h-4" />
              {syncResult}
            </div>
          )}
        </div>
      ) : (
        /* Disconnected state */
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              Google Calendar
            </p>
            <p className="text-xs text-text-tertiary">
              Automatically create calendar events for tasks with due dates.
            </p>
          </div>
          <button
            type="button"
            onClick={handleConnect}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Link2 className="w-3.5 h-3.5" />
            Connect
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </section>
  )
}

// Google Calendar API v3 helper functions.
// Uses raw fetch() to avoid adding a heavyweight SDK dependency.

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEventInput {
  summary: string
  description?: string
  /** ISO date string (YYYY-MM-DD) for all-day event start */
  start: string
  /** ISO date string (YYYY-MM-DD) for all-day event end */
  end: string
}

interface GoogleCalendarEventResponse {
  id: string
  status: string
  htmlLink: string
}

export interface CalendarEvent {
  id: string
  summary: string
  start: string   // ISO datetime or date
  end: string     // ISO datetime or date
  allDay: boolean
}

interface GoogleEventsListResponse {
  items: Array<{
    id: string
    summary?: string
    status: string
    start?: { dateTime?: string; date?: string }
    end?: { dateTime?: string; date?: string }
  }>
}

interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

// ── Error handling ───────────────────────────────────────────────────────────

class GoogleCalendarError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'GoogleCalendarError'
  }
}

async function handleGoogleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text()
    let message = `Google Calendar API error (${response.status})`
    try {
      const parsed = JSON.parse(body)
      message = parsed.error?.message ?? message
    } catch {
      // Use the default message if body is not JSON
    }
    throw new GoogleCalendarError(message, response.status)
  }
  return response.json() as Promise<T>
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates an all-day event on the user's Google Calendar.
 * Returns the Google Calendar event ID for tracking in our database.
 */
export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput,
  calendarId = 'primary',
): Promise<string> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? '',
        start: { date: event.start },
        end: { date: event.end },
      }),
    },
  )

  const data = await handleGoogleResponse<GoogleCalendarEventResponse>(response)
  return data.id
}

/**
 * Lists calendar events for a given date range.
 * Returns simplified event objects for use in AI context.
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarId = 'primary',
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '25',
  })

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  )

  const data = await handleGoogleResponse<GoogleEventsListResponse>(response)

  return (data.items ?? [])
    .filter((e) => e.status !== 'cancelled' && e.summary)
    .map((e) => {
      const allDay = !e.start?.dateTime
      return {
        id: e.id,
        summary: e.summary!,
        start: e.start?.dateTime ?? e.start?.date ?? '',
        end: e.end?.dateTime ?? e.end?.date ?? '',
        allDay,
      }
    })
}

/**
 * Deletes a calendar event by its Google event ID.
 * Silently succeeds if the event was already deleted (404/410).
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId = 'primary',
): Promise<void> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  // 204 = success, 404/410 = already deleted — both are acceptable
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    await handleGoogleResponse<never>(response)
  }
}

/**
 * Exchanges a refresh token for a new access token.
 * Returns the new access token and its TTL in seconds.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new GoogleCalendarError('Google OAuth credentials not configured', 500)
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await handleGoogleResponse<GoogleTokenResponse>(response)
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
  }
}

/**
 * Exchanges an authorization code for access and refresh tokens.
 * Used during the initial OAuth connect flow.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string
  refresh_token: string | null
  expires_in: number
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new GoogleCalendarError('Google OAuth credentials not configured', 500)
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  const data = await handleGoogleResponse<GoogleTokenResponse & { refresh_token?: string }>(response)
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_in: data.expires_in,
  }
}

/**
 * Returns a valid access token, refreshing it if expired.
 * Updates the token in the database if refreshed.
 */
export async function getValidAccessToken(connection: {
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
}): Promise<string> {
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : null

  // If token is still valid (with 5-minute buffer), return it directly
  if (expiresAt && expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return connection.access_token
  }

  // Token expired or expiry unknown — refresh it
  if (!connection.refresh_token) {
    throw new GoogleCalendarError(
      'Calendar connection expired. Please reconnect.',
      401,
    )
  }

  const refreshed = await refreshAccessToken(connection.refresh_token)
  return refreshed.access_token
}

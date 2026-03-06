/**
 * Shared FCM V1 push notification utility.
 * Uses Firebase Cloud Messaging API (V1) with service account credentials.
 * Used by send-reminder and compute-momentum edge functions.
 *
 * Env: FCM_SERVICE_ACCOUNT — JSON string of the Firebase service account key.
 */

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
}

/** Cached access token and its expiry time */
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Creates a JWT from the service account credentials and exchanges it
 * for a short-lived OAuth2 access token via Google's token endpoint.
 */
async function getAccessToken(serviceAccount: {
  client_email: string
  private_key: string
  token_uri: string
}): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsignedToken = `${encode(header)}.${encode(claims)}`

  // Import the private key and sign the JWT
  const keyData = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  )

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const jwt = `${unsignedToken}.${sig}`

  // Exchange JWT for access token
  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`)
  }

  const { access_token, expires_in } = await tokenRes.json()
  cachedToken = { token: access_token, expiresAt: Date.now() + expires_in * 1000 }
  return access_token
}

/**
 * Parses the FCM_SERVICE_ACCOUNT env var and returns the service account + project ID.
 * Returns null if not configured.
 */
function getServiceAccount(): {
  serviceAccount: { client_email: string; private_key: string; token_uri: string }
  projectId: string
} | null {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT')
  if (!raw) return null

  try {
    const sa = JSON.parse(raw)
    return {
      serviceAccount: {
        client_email: sa.client_email,
        private_key: sa.private_key,
        token_uri: sa.token_uri || 'https://oauth2.googleapis.com/token',
      },
      projectId: sa.project_id,
    }
  } catch {
    console.error('[send-notification] Failed to parse FCM_SERVICE_ACCOUNT')
    return null
  }
}

/**
 * Sends an FCM V1 push notification to a user.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendPushNotification(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  try {
    const config = getServiceAccount()
    if (!config) return false

    // Look up the user's FCM token
    const { data: user } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single()

    const token = user?.fcm_token
    if (!token) return false

    const accessToken = await getAccessToken(config.serviceAccount)

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: { type: 'momentum', ...payload.data },
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      },
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[send-notification] FCM V1 error for ${userId}: ${response.status} ${errText}`)
      return false
    }

    return true
  } catch (err) {
    console.error(`[send-notification] Failed for user ${userId}:`, err)
    return false
  }
}

/**
 * Sends push notifications to multiple users in batch.
 * Returns the count of successfully sent notifications.
 */
export async function sendBatchNotifications(
  supabase: { from: (table: string) => any },
  notifications: Array<{ userId: string; payload: NotificationPayload }>,
): Promise<number> {
  let sent = 0
  for (const { userId, payload } of notifications) {
    const ok = await sendPushNotification(supabase, userId, payload)
    if (ok) sent++
  }
  return sent
}

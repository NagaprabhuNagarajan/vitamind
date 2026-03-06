/**
 * Shared FCM push notification utility.
 * Used by send-reminder and compute-momentum edge functions.
 */

interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Sends an FCM push notification to a user.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendPushNotification(
  supabase: { from: (table: string) => any },
  userId: string,
  payload: NotificationPayload,
  fcmKey: string,
): Promise<boolean> {
  try {
    // Look up the user's FCM token
    const { data: user } = await supabase
      .from('users')
      .select('fcm_token')
      .eq('id', userId)
      .single()

    const token = user?.fcm_token
    if (!token) return false

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title: payload.title, body: payload.body },
        data: { type: 'momentum', ...payload.data },
      }),
    })

    return response.ok
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
  fcmKey: string,
): Promise<number> {
  let sent = 0
  for (const { userId, payload } of notifications) {
    const ok = await sendPushNotification(supabase, userId, payload, fcmKey)
    if (ok) sent++
  }
  return sent
}

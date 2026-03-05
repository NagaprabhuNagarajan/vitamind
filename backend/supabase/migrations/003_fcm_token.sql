-- Add FCM token column to users table for push notification targeting
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Index for quick lookup (not unique — one token per user)
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users (fcm_token)
  WHERE fcm_token IS NOT NULL;

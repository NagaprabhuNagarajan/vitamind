-- Calendar integration: store OAuth tokens and track synced events
-- Supports Google Calendar initially, extensible to Apple Calendar

-- Store OAuth tokens for calendar providers
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google', -- 'google' | 'apple'
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT, -- selected calendar ID
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS — users can only access their own calendar connections
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_connections" ON calendar_connections
  FOR ALL USING (auth.uid() = user_id);

-- Track which tasks have been synced to a calendar event
ALTER TABLE tasks
  ADD COLUMN calendar_event_id TEXT;

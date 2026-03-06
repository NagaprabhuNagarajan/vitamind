-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Time Fingerprint
-- Migration: 008_time_fingerprint.sql
-- Description: Adds JSONB productivity_profile column to users table for
--              storing computed productivity patterns derived from task
--              completion and habit check-in timestamps.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS productivity_profile JSONB DEFAULT '{}';

COMMENT ON COLUMN public.users.productivity_profile IS
  'AI-computed productivity profile: peak hours, best days, habit rates. Recomputed weekly.';

-- Index to efficiently find users with stale or missing profiles
-- (edge function queries users where profile needs recomputation)
-- Note: functional index on (productivity_profile->>'computed_at')::timestamptz
-- removed because the cast is not IMMUTABLE. The edge function that recomputes
-- profiles queries a small number of users so a seq-scan is acceptable.

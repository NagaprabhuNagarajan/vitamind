-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Email Notification Preferences
-- Migration: 006_email_preferences.sql
-- Description: Add columns for weekly report and daily reminder email prefs
-- ─────────────────────────────────────────────────────────────────────────────

-- Weekly report opt-in (default true — users can unsubscribe)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_weekly_report BOOLEAN NOT NULL DEFAULT true;

-- Daily task reminder opt-in (default false — explicit opt-in)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_daily_reminder BOOLEAN NOT NULL DEFAULT false;

-- Timezone already exists from 001_initial_schema.sql (default 'UTC'),
-- so no need to add it again. This migration only adds email preferences.

COMMENT ON COLUMN public.users.email_weekly_report IS 'Whether the user receives the weekly productivity email';
COMMENT ON COLUMN public.users.email_daily_reminder IS 'Whether the user receives the daily task reminder email';

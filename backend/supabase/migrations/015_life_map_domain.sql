-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Life Map Domain
-- Migration: 015_life_map_domain.sql
-- Description: Adds a `domain` column to the goals table so goals can be
--   categorised into life domains (health, career, relationships, finance,
--   learning, personal). The Life Map feature uses these domains to compute
--   per-domain scores and render a radar/hexagonal visualisation.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE life_domain AS ENUM (
    'health',
    'career',
    'relationships',
    'finance',
    'learning',
    'personal'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── ADD COLUMN ────────────────────────────────────────────────────────────
-- Default to 'personal' so existing goals don't break.
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS domain life_domain NOT NULL DEFAULT 'personal';

COMMENT ON COLUMN public.goals.domain IS 'Life domain category for Life Map visualisation';

-- ─── INDEX ─────────────────────────────────────────────────────────────────
-- Supports the Life Map query: fetch goals grouped by domain for a user.
CREATE INDEX IF NOT EXISTS idx_goals_user_domain
  ON public.goals(user_id, domain);

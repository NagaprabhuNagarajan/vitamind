-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Life Momentum Score
-- Migration: 007_momentum_score.sql
-- Description: Daily momentum snapshots computed from tasks, habits, goals
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.momentum_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  score              SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  task_velocity      SMALLINT NOT NULL CHECK (task_velocity BETWEEN 0 AND 100),
  habit_consistency  SMALLINT NOT NULL CHECK (habit_consistency BETWEEN 0 AND 100),
  goal_trajectory    SMALLINT NOT NULL CHECK (goal_trajectory BETWEEN 0 AND 100),
  overdue_pressure   SMALLINT NOT NULL CHECK (overdue_pressure BETWEEN 0 AND 100),
  burnout_risk       SMALLINT NOT NULL DEFAULT 0 CHECK (burnout_risk BETWEEN 0 AND 100),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, date)
);

COMMENT ON TABLE public.momentum_snapshots IS 'Daily Life Momentum Score snapshots — 0-100 composite of tasks, habits, goals';
COMMENT ON COLUMN public.momentum_snapshots.score IS 'Weighted composite: velocity*0.25 + consistency*0.30 + trajectory*0.25 + (100-pressure)*0.20';
COMMENT ON COLUMN public.momentum_snapshots.burnout_risk IS 'Derived from declining velocity, broken streaks, and growing backlog';

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_momentum_user_date ON public.momentum_snapshots(user_id, date DESC);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.momentum_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots via the anon/authenticated client
CREATE POLICY "Users can read own snapshots"
  ON public.momentum_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts are performed by the service role client (edge functions, API routes)
-- so we use a permissive policy — the service role bypasses RLS anyway,
-- but this allows the API route (which uses the user's session) to insert too
CREATE POLICY "Authenticated users can insert own snapshots"
  ON public.momentum_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

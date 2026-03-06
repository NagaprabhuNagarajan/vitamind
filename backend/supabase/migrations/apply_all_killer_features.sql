-- =============================================================================
-- VitaMind: All Killer Feature Migrations (007-013) Combined
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

-- ─── 007: Life Momentum Score ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.momentum_snapshots (
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

CREATE INDEX IF NOT EXISTS idx_momentum_user_date ON public.momentum_snapshots(user_id, date DESC);

ALTER TABLE public.momentum_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON public.momentum_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert own snapshots"
  ON public.momentum_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── 008: Time Fingerprint ──────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS productivity_profile JSONB DEFAULT '{}';

-- Note: functional index on (productivity_profile->>'computed_at')::timestamptz
-- removed because the cast is not IMMUTABLE. The edge function that recomputes
-- profiles queries a small number of users so a seq-scan is acceptable.

-- ─── 009: Burnout Radar + Smart Task Decomposition ──────────────────────────

CREATE TABLE IF NOT EXISTS burnout_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  risk_level  SMALLINT NOT NULL CHECK (risk_level BETWEEN 0 AND 100),
  signals     JSONB NOT NULL DEFAULT '{}',
  recovery_plan TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE burnout_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own burnout alerts"
  ON burnout_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own burnout alerts"
  ON burnout_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_burnout_alerts_user_date ON burnout_alerts(user_id, date DESC);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes SMALLINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN NOT NULL DEFAULT false;

-- ─── 010: Cascade Intelligence + Habit Stacking ────────────────────────────

CREATE TABLE IF NOT EXISTS habit_goal_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id    UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  impact_weight NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (impact_weight BETWEEN 0 AND 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, goal_id)
);

ALTER TABLE habit_goal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habit_goal_links"
  ON habit_goal_links FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habit_goal_links_user ON habit_goal_links(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_goal_links_habit ON habit_goal_links(habit_id);

CREATE TABLE IF NOT EXISTS habit_stacks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  habit_ids   UUID[] NOT NULL DEFAULT '{}',
  suggested_time TIME,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE habit_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habit_stacks"
  ON habit_stacks FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habit_stacks_user ON habit_stacks(user_id);

CREATE TABLE IF NOT EXISTS cascade_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id    UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  affected_goals JSONB NOT NULL DEFAULT '[]',
  suggestion  TEXT,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cascade_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cascade_events"
  ON cascade_events FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_cascade_events_user ON cascade_events(user_id, created_at DESC);

-- ─── 011: Goal Autopilot + Pattern Oracle ───────────────────────────────────

CREATE TABLE IF NOT EXISTS goal_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL DEFAULT 1,
  tasks_generated JSONB NOT NULL DEFAULT '[]',
  habits_suggested JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'adjusted', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(goal_id, week_number)
);

ALTER TABLE goal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goal_plans"
  ON goal_plans FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_plans_goal ON goal_plans(goal_id, week_number);

CREATE TABLE IF NOT EXISTS pattern_insights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('habit_task_correlation', 'habit_pair', 'keystone_habit', 'day_pattern', 'time_pattern')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  confidence  NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pattern_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pattern_insights"
  ON pattern_insights FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user ON pattern_insights(user_id, computed_at DESC);

ALTER TABLE goals ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT false;

-- ─── 012: Voice Life Log + Life Review ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS voice_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript  TEXT NOT NULL,
  actions     JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own voice_logs"
  ON voice_logs FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_voice_logs_user ON voice_logs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS life_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,
  report      TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE life_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own life_reviews"
  ON life_reviews FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON life_reviews(user_id, month DESC);

-- ─── 013: Focus Contracts + Accountability ──────────────────────────────────

CREATE TABLE IF NOT EXISTS focus_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_tasks UUID[] DEFAULT '{}',
  completed_tasks UUID[] DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT NOT NULL DEFAULT 25,
  focus_score INT,
  interruptions INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_blocks_user ON focus_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_started ON focus_blocks(user_id, started_at DESC);

ALTER TABLE focus_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own focus blocks"
  ON focus_blocks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('goal', 'habit', 'custom')),
  target_id UUID,
  commitment TEXT NOT NULL,
  stakes TEXT,
  stake_amount_cents INT,
  check_in_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (check_in_frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  progress INT NOT NULL DEFAULT 0,
  misses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(user_id, status);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contracts"
  ON contracts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS contract_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  met BOOLEAN NOT NULL,
  auto_tracked BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contract_id, date)
);

CREATE INDEX IF NOT EXISTS idx_contract_checkins_contract ON contract_checkins(contract_id);

ALTER TABLE contract_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own checkins"
  ON contract_checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

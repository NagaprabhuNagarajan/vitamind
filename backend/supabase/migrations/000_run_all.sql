-- =============================================================================
-- VitaMind: COMPLETE Schema — Run in Supabase SQL Editor (fresh or partial)
-- Fully idempotent — safe to re-run on an existing database.
-- =============================================================================


-- ═══════════════════════════════════════════════════════════════════════════════
-- 001: Initial Schema — Core tables, enums, indexes, triggers
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums (idempotent)
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'weekdays', 'weekends'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE habit_log_status AS ENUM ('completed', 'skipped', 'missed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE insight_type AS ENUM ('daily_plan', 'productivity', 'life_optimization'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goals (created before tasks — tasks reference goals)
CREATE TABLE IF NOT EXISTS public.goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  TEXT CHECK (char_length(description) <= 1000),
  target_date  DATE,
  progress     SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id      UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description  TEXT CHECK (char_length(description) <= 2000),
  priority     task_priority NOT NULL DEFAULT 'medium',
  status       task_status NOT NULL DEFAULT 'todo',
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT completed_at_valid CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

-- Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description   TEXT CHECK (char_length(description) <= 500),
  frequency     habit_frequency NOT NULL DEFAULT 'daily',
  target_days   SMALLINT[] CHECK (
    target_days IS NULL OR (
      array_length(target_days, 1) BETWEEN 1 AND 7 AND
      target_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
    )
  ),
  reminder_time TIME,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habit Logs
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id   UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     habit_log_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, date)
);

-- AI Insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       insight_type NOT NULL,
  content    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON public.tasks USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(user_id, target_date) WHERE target_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_title_search ON public.goals USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON public.habits(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON public.habit_logs(habit_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_type ON public.ai_insights(user_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created ON public.ai_insights(user_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_habits_updated_at ON public.habits;
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 002: RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Users policies
DO $$ BEGIN CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tasks policies
DO $$ BEGIN CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Goals policies
DO $$ BEGIN CREATE POLICY "goals_select_own" ON public.goals FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Habits policies
DO $$ BEGIN CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Habit logs policies
DO $$ BEGIN CREATE POLICY "habit_logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habit_logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habit_logs_update_own" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "habit_logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI insights policies
DO $$ BEGIN CREATE POLICY "ai_insights_select_own" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ai_insights_insert_own" ON public.ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ai_insights_delete_own" ON public.ai_insights FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper functions
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  log_status habit_log_status;
BEGIN
  LOOP
    SELECT status INTO log_status FROM public.habit_logs WHERE habit_id = p_habit_id AND date = check_date;
    IF log_status = 'completed' THEN
      streak := streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION recalculate_goal_progress(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress SMALLINT;
BEGIN
  SELECT COUNT(*) INTO total_tasks FROM public.tasks WHERE goal_id = p_goal_id;
  IF total_tasks = 0 THEN RETURN; END IF;
  SELECT COUNT(*) INTO completed_tasks FROM public.tasks WHERE goal_id = p_goal_id AND status = 'completed';
  new_progress := ROUND((completed_tasks::NUMERIC / total_tasks) * 100)::SMALLINT;
  UPDATE public.goals SET progress = new_progress, is_completed = (new_progress = 100) WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trg_task_update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM recalculate_goal_progress(NEW.goal_id);
  END IF;
  IF OLD.goal_id IS NOT NULL AND OLD.goal_id IS DISTINCT FROM NEW.goal_id THEN
    PERFORM recalculate_goal_progress(OLD.goal_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_goal_progress ON public.tasks;
CREATE TRIGGER trg_task_goal_progress
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_update_goal_progress();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 003: FCM Token
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users (fcm_token) WHERE fcm_token IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 004: Recurring Tasks
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_pattern recurrence_pattern;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_occurrence DATE;

CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks (next_occurrence) WHERE is_recurring = true AND next_occurrence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks (parent_task_id) WHERE parent_task_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 005: Calendar Integration
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "users_own_connections" ON calendar_connections FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 006: Email Preferences
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_weekly_report BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_daily_reminder BOOLEAN NOT NULL DEFAULT false;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 007: Life Momentum Score
-- ═══════════════════════════════════════════════════════════════════════════════

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

DO $$ BEGIN CREATE POLICY "Users can read own snapshots" ON public.momentum_snapshots FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can insert own snapshots" ON public.momentum_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 008: Time Fingerprint
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS productivity_profile JSONB DEFAULT '{}';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 009: Burnout Radar + Smart Task Decomposition
-- ═══════════════════════════════════════════════════════════════════════════════

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

DO $$ BEGIN CREATE POLICY "Users read own burnout alerts" ON burnout_alerts FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update own burnout alerts" ON burnout_alerts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_burnout_alerts_user_date ON burnout_alerts(user_id, date DESC);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_minutes SMALLINT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN NOT NULL DEFAULT false;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 010: Cascade Intelligence + Habit Stacking
-- ═══════════════════════════════════════════════════════════════════════════════

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
DO $$ BEGIN CREATE POLICY "Users manage own habit_goal_links" ON habit_goal_links FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE POLICY "Users manage own habit_stacks" ON habit_stacks FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE POLICY "Users manage own cascade_events" ON cascade_events FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_cascade_events_user ON cascade_events(user_id, created_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 011: Goal Autopilot + Pattern Oracle
-- ═══════════════════════════════════════════════════════════════════════════════

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
DO $$ BEGIN CREATE POLICY "Users manage own goal_plans" ON goal_plans FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE POLICY "Users manage own pattern_insights" ON pattern_insights FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_pattern_insights_user ON pattern_insights(user_id, computed_at DESC);

ALTER TABLE goals ADD COLUMN IF NOT EXISTS autopilot_enabled BOOLEAN NOT NULL DEFAULT false;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 012: Voice Life Log + Life Review
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transcript  TEXT NOT NULL,
  actions     JSONB NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE voice_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Users manage own voice_logs" ON voice_logs FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE POLICY "Users manage own life_reviews" ON life_reviews FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON life_reviews(user_id, month DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 013: Focus Contracts + Accountability
-- ═══════════════════════════════════════════════════════════════════════════════

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
DO $$ BEGIN CREATE POLICY "Users manage own focus blocks" ON focus_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
DO $$ BEGIN CREATE POLICY "Users manage own contracts" ON contracts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
DO $$ BEGIN CREATE POLICY "Users manage own checkins" ON contract_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

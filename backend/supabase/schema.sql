-- =============================================================================
-- VitaMind — Complete Database Schema
-- Single source of truth. Idempotent — safe to run on a fresh or existing DB.
-- Consolidates: migrations 001–016
-- =============================================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE task_priority      AS ENUM ('low', 'medium', 'high', 'urgent');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status        AS ENUM ('todo', 'in_progress', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE habit_frequency    AS ENUM ('daily', 'weekly', 'weekdays', 'weekends');   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE habit_log_status   AS ENUM ('completed', 'skipped', 'missed');            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE insight_type       AS ENUM ('daily_plan', 'productivity', 'life_optimization'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE life_event_type    AS ENUM ('task_completed', 'goal_achieved', 'habit_streak', 'milestone', 'note'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE life_domain        AS ENUM ('health', 'career', 'relationships', 'finance', 'learning', 'personal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                TEXT        NOT NULL UNIQUE,
  name                 TEXT        NOT NULL DEFAULT '',
  avatar_url           TEXT,
  timezone             TEXT        NOT NULL DEFAULT 'UTC',
  fcm_token            TEXT,
  email_weekly_report  BOOLEAN     NOT NULL DEFAULT true,
  email_daily_reminder BOOLEAN     NOT NULL DEFAULT false,
  productivity_profile JSONB       DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users IS 'App user profiles — extends auth.users';
COMMENT ON COLUMN public.users.email_weekly_report  IS 'Whether the user receives the weekly productivity email';
COMMENT ON COLUMN public.users.email_daily_reminder IS 'Whether the user receives the daily task reminder email';
COMMENT ON COLUMN public.users.productivity_profile IS 'AI-computed productivity profile: peak hours, best days, habit rates. Recomputed weekly.';

-- ─── GOALS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goals (
  id               UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title            TEXT     NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description      TEXT     CHECK (char_length(description) <= 1000),
  target_date      DATE,
  progress         SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_completed     BOOLEAN  NOT NULL DEFAULT FALSE,
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  domain           life_domain NOT NULL DEFAULT 'personal',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.goals IS 'Long-term user goals with progress tracking';
COMMENT ON COLUMN public.goals.progress IS 'Completion percentage 0–100';
COMMENT ON COLUMN public.goals.domain   IS 'Life domain category for Life Map visualisation';

-- ─── TASKS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id                   UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id              UUID             REFERENCES public.goals(id) ON DELETE SET NULL,
  title                TEXT             NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description          TEXT             CHECK (char_length(description) <= 2000),
  priority             task_priority    NOT NULL DEFAULT 'medium',
  status               task_status      NOT NULL DEFAULT 'todo',
  due_date             DATE,
  due_time             TIME,
  completed_at         TIMESTAMPTZ,
  is_recurring         BOOLEAN          NOT NULL DEFAULT false,
  recurrence_pattern   recurrence_pattern,
  recurrence_end_date  DATE,
  parent_task_id       UUID             REFERENCES public.tasks(id) ON DELETE SET NULL,
  next_occurrence      DATE,
  calendar_event_id    TEXT,
  estimated_minutes    SMALLINT,
  is_subtask           BOOLEAN          NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT completed_at_valid CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

COMMENT ON TABLE public.tasks IS 'User tasks with priority, status, optional goal linkage, and time scheduling';

-- ─── HABITS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.habits (
  id            UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT             NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description   TEXT             CHECK (char_length(description) <= 500),
  frequency     habit_frequency  NOT NULL DEFAULT 'daily',
  target_days   SMALLINT[]       CHECK (
    target_days IS NULL OR (
      array_length(target_days, 1) BETWEEN 1 AND 7 AND
      target_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
    )
  ),
  reminder_time TIME,
  is_active     BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.habits IS 'User habits with frequency and reminder configuration';
COMMENT ON COLUMN public.habits.target_days IS 'Weekday numbers for weekly habits: 0=Sun, 6=Sat';

-- ─── HABIT LOGS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id         UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id   UUID             NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    UUID             NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE             NOT NULL,
  status     habit_log_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  UNIQUE (habit_id, date)
);

COMMENT ON TABLE public.habit_logs IS 'Daily habit completion records — one per habit per day';

-- ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id         UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID         NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       insight_type NOT NULL,
  content    TEXT         NOT NULL,
  metadata   JSONB        DEFAULT '{}',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.ai_insights IS 'AI-generated insights, plans, and recommendations';
COMMENT ON COLUMN public.ai_insights.metadata IS 'Structured data: priorities, token usage, model, cached flag';

-- ─── MOMENTUM SNAPSHOTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.momentum_snapshots (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID     NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE     NOT NULL DEFAULT CURRENT_DATE,
  score             SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  task_velocity     SMALLINT NOT NULL CHECK (task_velocity BETWEEN 0 AND 100),
  habit_consistency SMALLINT NOT NULL CHECK (habit_consistency BETWEEN 0 AND 100),
  goal_trajectory   SMALLINT NOT NULL CHECK (goal_trajectory BETWEEN 0 AND 100),
  overdue_pressure  SMALLINT NOT NULL CHECK (overdue_pressure BETWEEN 0 AND 100),
  burnout_risk      SMALLINT NOT NULL DEFAULT 0 CHECK (burnout_risk BETWEEN 0 AND 100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

COMMENT ON TABLE  public.momentum_snapshots IS 'Daily Life Momentum Score snapshots — 0-100 composite';
COMMENT ON COLUMN public.momentum_snapshots.score IS 'Weighted composite: velocity*0.25 + consistency*0.30 + trajectory*0.25 + (100-pressure)*0.20';

-- ─── BURNOUT ALERTS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.burnout_alerts (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date          DATE     NOT NULL DEFAULT CURRENT_DATE,
  risk_level    SMALLINT NOT NULL CHECK (risk_level BETWEEN 0 AND 100),
  signals       JSONB    NOT NULL DEFAULT '{}',
  recovery_plan TEXT,
  acknowledged  BOOLEAN  NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── CALENDAR CONNECTIONS ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider         TEXT        NOT NULL DEFAULT 'google',
  access_token     TEXT        NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id      TEXT,
  sync_enabled     BOOLEAN     NOT NULL DEFAULT true,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- ─── HABIT-GOAL LINKS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.habit_goal_links (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id      UUID           NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  goal_id       UUID           NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  impact_weight NUMERIC(3,2)   NOT NULL DEFAULT 0.5 CHECK (impact_weight BETWEEN 0 AND 1),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, goal_id)
);

-- ─── HABIT STACKS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.habit_stacks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  habit_ids      UUID[]      NOT NULL DEFAULT '{}',
  suggested_time TIME,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CASCADE EVENTS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cascade_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id       UUID        NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  affected_goals JSONB       NOT NULL DEFAULT '[]',
  suggestion     TEXT,
  acknowledged   BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── GOAL PLANS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.goal_plans (
  id                UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_id           UUID     NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  week_number       SMALLINT NOT NULL DEFAULT 1,
  tasks_generated   JSONB    NOT NULL DEFAULT '[]',
  habits_suggested  JSONB    NOT NULL DEFAULT '[]',
  status            TEXT     NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'adjusted', 'completed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, week_number)
);

-- ─── PATTERN INSIGHTS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pattern_insights (
  id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID           NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         TEXT           NOT NULL CHECK (type IN ('habit_task_correlation', 'habit_pair', 'keystone_habit', 'day_pattern', 'time_pattern')),
  title        TEXT           NOT NULL,
  description  TEXT           NOT NULL,
  data         JSONB          NOT NULL DEFAULT '{}',
  confidence   NUMERIC(3,2)   NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  computed_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  is_dismissed BOOLEAN        NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── VOICE LOGS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.voice_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  transcript  TEXT        NOT NULL,
  actions     JSONB       NOT NULL DEFAULT '{}',
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LIFE REVIEWS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.life_reviews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month      TEXT        NOT NULL,  -- YYYY-MM
  report     TEXT        NOT NULL,
  data       JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- ─── FOCUS BLOCKS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.focus_blocks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planned_tasks    UUID[]      DEFAULT '{}',
  completed_tasks  UUID[]      DEFAULT '{}',
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_minutes INT         NOT NULL DEFAULT 25,
  focus_score      INT,
  interruptions    INT         DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CONTRACTS ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contracts (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT    NOT NULL,
  description         TEXT,
  type                TEXT    NOT NULL CHECK (type IN ('goal', 'habit', 'custom')),
  target_id           UUID,
  commitment          TEXT    NOT NULL,
  stakes              TEXT,
  stake_amount_cents  INT,
  check_in_frequency  TEXT    NOT NULL DEFAULT 'weekly' CHECK (check_in_frequency IN ('daily', 'weekly', 'monthly')),
  start_date          DATE    NOT NULL DEFAULT CURRENT_DATE,
  end_date            DATE    NOT NULL,
  status              TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  progress            INT     NOT NULL DEFAULT 0,
  misses              INT     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CONTRACT CHECK-INS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_checkins (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  UUID    NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE    NOT NULL,
  met          BOOLEAN NOT NULL,
  auto_tracked BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_id, date)
);

-- ─── LIFE EVENTS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.life_events (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  life_event_type  NOT NULL,
  title       TEXT             NOT NULL,
  description TEXT,
  metadata    JSONB            DEFAULT '{}',
  event_date  DATE             NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.life_events IS 'Chronological life timeline — auto-populated by triggers and user notes';
COMMENT ON COLUMN public.life_events.metadata IS 'Structured context: task_id, goal_id, streak_count, etc.';

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email     ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON public.users(fcm_token) WHERE fcm_token IS NOT NULL;

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id        ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id         ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status          ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date        ON public.tasks(user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_time        ON public.tasks(user_id, due_date, due_time) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_priority        ON public.tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_title_search    ON public.tasks USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON public.tasks(next_occurrence) WHERE is_recurring = true AND next_occurrence IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id  ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id      ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_target_date  ON public.goals(user_id, target_date) WHERE target_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_goals_title_search ON public.goals USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_goals_user_domain  ON public.goals(user_id, domain);

-- Habits
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active  ON public.habits(user_id, is_active) WHERE is_active = TRUE;

-- Habit logs
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id  ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date      ON public.habit_logs(habit_id, date DESC);

-- AI insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_type ON public.ai_insights(user_id, type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created   ON public.ai_insights(user_id, created_at DESC);

-- Momentum
CREATE INDEX IF NOT EXISTS idx_momentum_user_date ON public.momentum_snapshots(user_id, date DESC);

-- Burnout
CREATE INDEX IF NOT EXISTS idx_burnout_alerts_user_date ON public.burnout_alerts(user_id, date DESC);

-- Habit-goal links
CREATE INDEX IF NOT EXISTS idx_habit_goal_links_user  ON public.habit_goal_links(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_goal_links_habit ON public.habit_goal_links(habit_id);

-- Habit stacks
CREATE INDEX IF NOT EXISTS idx_habit_stacks_user ON public.habit_stacks(user_id);

-- Cascade events
CREATE INDEX IF NOT EXISTS idx_cascade_events_user ON public.cascade_events(user_id, created_at DESC);

-- Goal plans
CREATE INDEX IF NOT EXISTS idx_goal_plans_goal ON public.goal_plans(goal_id, week_number);

-- Pattern insights
CREATE INDEX IF NOT EXISTS idx_pattern_insights_user ON public.pattern_insights(user_id, computed_at DESC);

-- Voice logs
CREATE INDEX IF NOT EXISTS idx_voice_logs_user ON public.voice_logs(user_id, created_at DESC);

-- Life reviews
CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON public.life_reviews(user_id, month DESC);

-- Focus blocks
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user    ON public.focus_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_started ON public.focus_blocks(user_id, started_at DESC);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user   ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(user_id, status);

-- Contract check-ins
CREATE INDEX IF NOT EXISTS idx_contract_checkins_contract ON public.contract_checkins(contract_id);

-- Life events
CREATE INDEX IF NOT EXISTS idx_life_events_user_date    ON public.life_events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_life_events_user_type    ON public.life_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_life_events_title_search ON public.life_events USING gin(to_tsvector('english', title));

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.momentum_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.burnout_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_goal_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_stacks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cascade_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_insights    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_checkins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_events         ENABLE ROW LEVEL SECURITY;

-- Helper macro: drop-then-create makes policies idempotent
-- users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_delete_own" ON public.users FOR DELETE USING (auth.uid() = id);

-- tasks
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- goals
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own" ON public.goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- habits
DROP POLICY IF EXISTS "habits_select_own" ON public.habits;
CREATE POLICY "habits_select_own" ON public.habits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "habits_insert_own" ON public.habits;
CREATE POLICY "habits_insert_own" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "habits_update_own" ON public.habits;
CREATE POLICY "habits_update_own" ON public.habits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "habits_delete_own" ON public.habits;
CREATE POLICY "habits_delete_own" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- habit_logs
DROP POLICY IF EXISTS "habit_logs_select_own" ON public.habit_logs;
CREATE POLICY "habit_logs_select_own" ON public.habit_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "habit_logs_insert_own" ON public.habit_logs;
CREATE POLICY "habit_logs_insert_own" ON public.habit_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.habits WHERE id = habit_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "habit_logs_update_own" ON public.habit_logs;
CREATE POLICY "habit_logs_update_own" ON public.habit_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "habit_logs_delete_own" ON public.habit_logs;
CREATE POLICY "habit_logs_delete_own" ON public.habit_logs FOR DELETE USING (auth.uid() = user_id);

-- ai_insights
DROP POLICY IF EXISTS "ai_insights_select_own" ON public.ai_insights;
CREATE POLICY "ai_insights_select_own" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_insights_insert_own" ON public.ai_insights;
CREATE POLICY "ai_insights_insert_own" ON public.ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ai_insights_delete_own" ON public.ai_insights;
CREATE POLICY "ai_insights_delete_own" ON public.ai_insights FOR DELETE USING (auth.uid() = user_id);

-- momentum_snapshots
DROP POLICY IF EXISTS "Users can read own snapshots" ON public.momentum_snapshots;
CREATE POLICY "Users can read own snapshots" ON public.momentum_snapshots FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can insert own snapshots" ON public.momentum_snapshots;
CREATE POLICY "Authenticated users can insert own snapshots" ON public.momentum_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

-- burnout_alerts
DROP POLICY IF EXISTS "Users read own burnout alerts" ON public.burnout_alerts;
CREATE POLICY "Users read own burnout alerts" ON public.burnout_alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own burnout alerts" ON public.burnout_alerts;
CREATE POLICY "Users update own burnout alerts" ON public.burnout_alerts FOR UPDATE USING (auth.uid() = user_id);

-- calendar_connections
DROP POLICY IF EXISTS "users_own_connections" ON public.calendar_connections;
CREATE POLICY "users_own_connections" ON public.calendar_connections FOR ALL USING (auth.uid() = user_id);

-- habit_goal_links
DROP POLICY IF EXISTS "Users manage own habit_goal_links" ON public.habit_goal_links;
CREATE POLICY "Users manage own habit_goal_links" ON public.habit_goal_links FOR ALL USING (auth.uid() = user_id);

-- habit_stacks
DROP POLICY IF EXISTS "Users manage own habit_stacks" ON public.habit_stacks;
CREATE POLICY "Users manage own habit_stacks" ON public.habit_stacks FOR ALL USING (auth.uid() = user_id);

-- cascade_events
DROP POLICY IF EXISTS "Users manage own cascade_events" ON public.cascade_events;
CREATE POLICY "Users manage own cascade_events" ON public.cascade_events FOR ALL USING (auth.uid() = user_id);

-- goal_plans
DROP POLICY IF EXISTS "Users manage own goal_plans" ON public.goal_plans;
CREATE POLICY "Users manage own goal_plans" ON public.goal_plans FOR ALL USING (auth.uid() = user_id);

-- pattern_insights
DROP POLICY IF EXISTS "Users manage own pattern_insights" ON public.pattern_insights;
CREATE POLICY "Users manage own pattern_insights" ON public.pattern_insights FOR ALL USING (auth.uid() = user_id);

-- voice_logs
DROP POLICY IF EXISTS "Users manage own voice_logs" ON public.voice_logs;
CREATE POLICY "Users manage own voice_logs" ON public.voice_logs FOR ALL USING (auth.uid() = user_id);

-- life_reviews
DROP POLICY IF EXISTS "Users manage own life_reviews" ON public.life_reviews;
CREATE POLICY "Users manage own life_reviews" ON public.life_reviews FOR ALL USING (auth.uid() = user_id);

-- focus_blocks
DROP POLICY IF EXISTS "Users manage own focus blocks" ON public.focus_blocks;
CREATE POLICY "Users manage own focus blocks" ON public.focus_blocks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contracts
DROP POLICY IF EXISTS "Users manage own contracts" ON public.contracts;
CREATE POLICY "Users manage own contracts" ON public.contracts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- contract_checkins
DROP POLICY IF EXISTS "Users manage own checkins" ON public.contract_checkins;
CREATE POLICY "Users manage own checkins" ON public.contract_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- life_events
DROP POLICY IF EXISTS "Users can select own life events" ON public.life_events;
CREATE POLICY "Users can select own life events" ON public.life_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own life events" ON public.life_events;
CREATE POLICY "Users can insert own life events" ON public.life_events FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own manual life events" ON public.life_events;
CREATE POLICY "Users can delete own manual life events" ON public.life_events FOR DELETE USING (auth.uid() = user_id AND event_type IN ('note', 'milestone'));

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- ─── updated_at auto-stamp ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at  ON public.users;
CREATE TRIGGER trg_users_updated_at  BEFORE UPDATE ON public.users  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_tasks_updated_at  ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at  BEFORE UPDATE ON public.tasks  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_goals_updated_at  ON public.goals;
CREATE TRIGGER trg_goals_updated_at  BEFORE UPDATE ON public.goals  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS trg_habits_updated_at ON public.habits;
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Auto-create user profile on sign-up ─────────────────────────────────────

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

-- ─── Habit streak calculator ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak     INTEGER := 0;
  check_date DATE    := CURRENT_DATE;
  log_status habit_log_status;
BEGIN
  LOOP
    SELECT status INTO log_status
    FROM public.habit_logs
    WHERE habit_id = p_habit_id AND date = check_date;
    IF log_status = 'completed' THEN
      streak     := streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Goal progress recalculation ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_goal_progress(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  total_tasks     INTEGER;
  completed_tasks INTEGER;
  new_progress    SMALLINT;
BEGIN
  SELECT COUNT(*) INTO total_tasks     FROM public.tasks WHERE goal_id = p_goal_id;
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

-- ─── Life Timeline: task completed trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION create_life_event_on_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO life_events (user_id, event_type, title, description, metadata, event_date)
    VALUES (
      NEW.user_id, 'task_completed', 'Completed: ' || NEW.title, NEW.description,
      jsonb_build_object('task_id', NEW.id, 'priority', NEW.priority::text, 'goal_id', NEW.goal_id),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_life_event_task_completed ON public.tasks;
CREATE TRIGGER trg_life_event_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION create_life_event_on_task_completed();

-- ─── Life Timeline: goal achieved trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION create_life_event_on_goal_achieved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed IS DISTINCT FROM TRUE THEN
    INSERT INTO life_events (user_id, event_type, title, description, metadata, event_date)
    VALUES (
      NEW.user_id, 'goal_achieved', 'Goal achieved: ' || NEW.title, NEW.description,
      jsonb_build_object('goal_id', NEW.id, 'target_date', NEW.target_date, 'progress', NEW.progress),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_life_event_goal_achieved ON public.goals;
CREATE TRIGGER trg_life_event_goal_achieved
  AFTER UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION create_life_event_on_goal_achieved();

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase I: Life Ecosystem
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Financial Entries ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency     TEXT        NOT NULL DEFAULT 'INR',
  category     TEXT        NOT NULL,
  description  TEXT,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own financial_entries" ON public.financial_entries;
CREATE POLICY "Users manage own financial_entries" ON public.financial_entries
  FOR ALL USING (auth.uid() = user_id);

-- ── Health Entries ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.health_entries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date             DATE        NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours      NUMERIC(4,1),
  steps            INTEGER,
  water_ml         INTEGER,
  weight_kg        NUMERIC(5,1),
  exercise_minutes INTEGER,
  mood             SMALLINT    CHECK (mood BETWEEN 1 AND 5),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.health_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own health_entries" ON public.health_entries;
CREATE POLICY "Users manage own health_entries" ON public.health_entries
  FOR ALL USING (auth.uid() = user_id);

-- ── Automation Rules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  trigger_type     TEXT        NOT NULL CHECK (trigger_type IN (
                     'habit_streak_broken', 'task_overdue',
                     'goal_deadline_approaching', 'momentum_low', 'burnout_high'
                   )),
  trigger_config   JSONB       NOT NULL DEFAULT '{}',
  action_type      TEXT        NOT NULL CHECK (action_type IN (
                     'create_task', 'send_notification', 'webhook'
                   )),
  action_config    JSONB       NOT NULL DEFAULT '{}',
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own automation_rules" ON public.automation_rules;
CREATE POLICY "Users manage own automation_rules" ON public.automation_rules
  FOR ALL USING (auth.uid() = user_id);

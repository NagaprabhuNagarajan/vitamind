-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Core tables for users, tasks, goals, habits, habit_logs, ai_insights
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search on titles

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'weekdays', 'weekends');
CREATE TYPE habit_log_status AS ENUM ('completed', 'skipped', 'missed');
CREATE TYPE insight_type AS ENUM ('daily_plan', 'productivity', 'life_optimization');

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users — stores app-level profile data

CREATE TABLE public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'App user profiles — extends auth.users';

-- ─── GOALS ───────────────────────────────────────────────────────────────────
-- Goals are created before tasks (tasks reference goals)

CREATE TABLE public.goals (
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

COMMENT ON TABLE public.goals IS 'Long-term user goals with progress tracking';
COMMENT ON COLUMN public.goals.progress IS 'Completion percentage 0–100';

-- ─── TASKS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.tasks (
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

  -- Ensure completed_at is only set when status is completed
  CONSTRAINT completed_at_valid CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  )
);

COMMENT ON TABLE public.tasks IS 'User tasks with priority, status, and optional goal linkage';

-- ─── HABITS ──────────────────────────────────────────────────────────────────

CREATE TABLE public.habits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description   TEXT CHECK (char_length(description) <= 500),
  frequency     habit_frequency NOT NULL DEFAULT 'daily',
  -- For weekly habits: array of weekday numbers (0=Sun, 1=Mon, …, 6=Sat)
  target_days   SMALLINT[] CHECK (
    target_days IS NULL OR (
      array_length(target_days, 1) BETWEEN 1 AND 7 AND
      target_days <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
    )
  ),
  reminder_time TIME, -- local time for push notification
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.habits IS 'User habits with frequency and reminder configuration';
COMMENT ON COLUMN public.habits.target_days IS 'Weekday numbers for weekly habits: 0=Sun, 6=Sat';

-- ─── HABIT LOGS ──────────────────────────────────────────────────────────────

CREATE TABLE public.habit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id   UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     habit_log_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One log per habit per day
  UNIQUE (habit_id, date)
);

COMMENT ON TABLE public.habit_logs IS 'Daily habit completion records — one per habit per day';

-- ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

CREATE TABLE public.ai_insights (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       insight_type NOT NULL,
  content    TEXT NOT NULL,
  metadata   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_insights IS 'AI-generated insights, plans, and recommendations';
COMMENT ON COLUMN public.ai_insights.metadata IS 'Structured data: priorities, token usage, model, cached flag';

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users
CREATE INDEX idx_users_email ON public.users(email);

-- Tasks
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;
CREATE INDEX idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON public.tasks(user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_tasks_priority ON public.tasks(user_id, priority);
-- Full-text search on task title
CREATE INDEX idx_tasks_title_search ON public.tasks USING gin(title gin_trgm_ops);

-- Goals
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_target_date ON public.goals(user_id, target_date) WHERE target_date IS NOT NULL;
CREATE INDEX idx_goals_title_search ON public.goals USING gin(title gin_trgm_ops);

-- Habits
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_active ON public.habits(user_id, is_active) WHERE is_active = TRUE;

-- Habit logs
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, date);
CREATE INDEX idx_habit_logs_date ON public.habit_logs(habit_id, date DESC);

-- AI insights
CREATE INDEX idx_ai_insights_user_type ON public.ai_insights(user_id, type);
CREATE INDEX idx_ai_insights_created ON public.ai_insights(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────────────────────

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

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

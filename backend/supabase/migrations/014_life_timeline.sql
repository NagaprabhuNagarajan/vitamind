-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Life Timeline
-- Migration: 014_life_timeline.sql
-- Description: Unified life event timeline that aggregates milestones across
--   tasks, goals, habits, and user-created notes into a single chronological
--   feed. Triggers auto-populate events when tasks complete or goals are achieved.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUM ──────────────────────────────────────────────────────────────────
-- Idempotent: skip if the type already exists

DO $$ BEGIN
  CREATE TYPE life_event_type AS ENUM (
    'task_completed',
    'goal_achieved',
    'habit_streak',
    'milestone',
    'note'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── LIFE EVENTS TABLE ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS life_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  life_event_type NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  metadata    JSONB DEFAULT '{}',
  event_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE life_events IS 'Chronological life timeline — auto-populated by triggers and user notes';
COMMENT ON COLUMN life_events.metadata IS 'Structured context: task_id, goal_id, streak_count, etc.';

-- ─── INDEXES ───────────────────────────────────────────────────────────────
-- Primary query: fetch a user timeline page ordered by event_date DESC

CREATE INDEX IF NOT EXISTS idx_life_events_user_date
  ON life_events(user_id, event_date DESC);

-- Filter by event type (e.g., show only milestones)
CREATE INDEX IF NOT EXISTS idx_life_events_user_type
  ON life_events(user_id, event_type);

-- Full-text search on event titles
CREATE INDEX IF NOT EXISTS idx_life_events_title_search
  ON life_events USING gin(to_tsvector('english', title));

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────

ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;

-- Users can read only their own events
CREATE POLICY "Users can select own life events"
  ON life_events FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only events attributed to themselves
CREATE POLICY "Users can insert own life events"
  ON life_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own manual events (note, milestone)
CREATE POLICY "Users can delete own manual life events"
  ON life_events FOR DELETE
  USING (auth.uid() = user_id AND event_type IN ('note', 'milestone'));

-- ─── TRIGGER: task completed -> life event ─────────────────────────────────
-- Fires when tasks.status transitions to 'completed'. Captures task title and
-- id in metadata so the timeline card can deep-link back to the task.

CREATE OR REPLACE FUNCTION create_life_event_on_task_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes TO 'completed' (not on unrelated updates)
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    INSERT INTO life_events (user_id, event_type, title, description, metadata, event_date)
    VALUES (
      NEW.user_id,
      'task_completed',
      'Completed: ' || NEW.title,
      NEW.description,
      jsonb_build_object(
        'task_id', NEW.id,
        'priority', NEW.priority::text,
        'goal_id', NEW.goal_id
      ),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_life_event_task_completed ON tasks;
CREATE TRIGGER trg_life_event_task_completed
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_life_event_on_task_completed();

-- ─── TRIGGER: goal achieved -> life event ──────────────────────────────────
-- Fires when goals.is_completed flips to TRUE. Goal achievements are high-value
-- timeline events displayed with extra prominence in the UI.

CREATE OR REPLACE FUNCTION create_life_event_on_goal_achieved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed IS DISTINCT FROM TRUE THEN
    INSERT INTO life_events (user_id, event_type, title, description, metadata, event_date)
    VALUES (
      NEW.user_id,
      'goal_achieved',
      'Goal achieved: ' || NEW.title,
      NEW.description,
      jsonb_build_object(
        'goal_id', NEW.id,
        'target_date', NEW.target_date,
        'progress', NEW.progress
      ),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_life_event_goal_achieved ON goals;
CREATE TRIGGER trg_life_event_goal_achieved
  AFTER UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION create_life_event_on_goal_achieved();

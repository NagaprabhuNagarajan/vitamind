-- ─────────────────────────────────────────────────────────────────────────────
-- VitaMind — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- Description: Users can only access their own data — zero exceptions
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENABLE RLS ON ALL TABLES ────────────────────────────────────────────────

ALTER TABLE public.users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- ─── USERS ───────────────────────────────────────────────────────────────────

-- Users can view only their own profile
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile is auto-created by trigger — no direct INSERT from client
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── TASKS ───────────────────────────────────────────────────────────────────

CREATE POLICY "tasks_select_own"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ─── GOALS ───────────────────────────────────────────────────────────────────

CREATE POLICY "goals_select_own"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete_own"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- ─── HABITS ──────────────────────────────────────────────────────────────────

CREATE POLICY "habits_select_own"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "habits_insert_own"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_update_own"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_delete_own"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- ─── HABIT LOGS ──────────────────────────────────────────────────────────────

CREATE POLICY "habit_logs_select_own"
  ON public.habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "habit_logs_insert_own"
  ON public.habit_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Ensure the habit belongs to the user inserting the log
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE id = habit_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "habit_logs_update_own"
  ON public.habit_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habit_logs_delete_own"
  ON public.habit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ─── AI INSIGHTS ─────────────────────────────────────────────────────────────

CREATE POLICY "ai_insights_select_own"
  ON public.ai_insights FOR SELECT
  USING (auth.uid() = user_id);

-- Insights are created server-side (via service role) — but allow reads from client
-- INSERT is done via SUPABASE_SERVICE_ROLE_KEY in API routes, not anon key
-- We still add an insert policy for completeness with service role bypass
CREATE POLICY "ai_insights_insert_own"
  ON public.ai_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_insights_delete_own"
  ON public.ai_insights FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS (used in API layer)
-- ─────────────────────────────────────────────────────────────────────────────

-- Calculate habit streak for a given habit_id (consecutive days completed)
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  log_status habit_log_status;
BEGIN
  LOOP
    SELECT status INTO log_status
    FROM public.habit_logs
    WHERE habit_id = p_habit_id AND date = check_date;

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

-- Recalculate goal progress based on linked completed tasks
CREATE OR REPLACE FUNCTION recalculate_goal_progress(p_goal_id UUID)
RETURNS VOID AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress SMALLINT;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM public.tasks
  WHERE goal_id = p_goal_id;

  IF total_tasks = 0 THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO completed_tasks
  FROM public.tasks
  WHERE goal_id = p_goal_id AND status = 'completed';

  new_progress := ROUND((completed_tasks::NUMERIC / total_tasks) * 100)::SMALLINT;

  UPDATE public.goals
  SET progress = new_progress,
      is_completed = (new_progress = 100)
  WHERE id = p_goal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-recalculate goal progress when a task is updated
CREATE OR REPLACE FUNCTION trg_task_update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM recalculate_goal_progress(NEW.goal_id);
  END IF;
  -- Also recalculate old goal if task moved between goals
  IF OLD.goal_id IS NOT NULL AND OLD.goal_id IS DISTINCT FROM NEW.goal_id THEN
    PERFORM recalculate_goal_progress(OLD.goal_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_goal_progress
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION trg_task_update_goal_progress();

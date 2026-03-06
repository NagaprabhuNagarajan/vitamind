-- VitaMind Schema Verification Script
-- Run in Supabase SQL Editor to confirm all migrations have been applied.
-- Raises EXCEPTION if anything is missing, NOTICE if all good.

DO $$
DECLARE
  missing text[] := '{}';
  tbl text;
  col_check record;
  enum_name text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════
  -- 1. Required tables (17 + calendar_connections)
  -- ═══════════════════════════════════════════════════════════════════
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'tasks', 'goals', 'habits', 'habit_logs', 'ai_insights',
    'calendar_connections',
    'momentum_snapshots', 'burnout_alerts',
    'habit_goal_links', 'habit_stacks', 'cascade_events',
    'goal_plans', 'pattern_insights',
    'voice_logs', 'life_reviews',
    'focus_blocks', 'contracts', 'contract_checkins'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      missing := array_append(missing, 'table: ' || tbl);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════
  -- 2. Key columns added by killer-feature migrations
  -- ═══════════════════════════════════════════════════════════════════
  FOR col_check IN
    SELECT * FROM (VALUES
      ('users',  'fcm_token'),
      ('users',  'productivity_profile'),
      ('tasks',  'is_recurring'),
      ('tasks',  'recurrence_pattern'),
      ('tasks',  'parent_task_id'),
      ('tasks',  'next_occurrence'),
      ('tasks',  'estimated_minutes'),
      ('tasks',  'is_subtask'),
      ('goals',  'autopilot_enabled'),
      ('users',  'email_weekly_report'),
      ('users',  'email_daily_reminder')
    ) AS v(tname, cname)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = col_check.tname
        AND column_name = col_check.cname
    ) THEN
      missing := array_append(missing, 'column: ' || col_check.tname || '.' || col_check.cname);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════
  -- 3. Required enums
  -- ═══════════════════════════════════════════════════════════════════
  FOREACH enum_name IN ARRAY ARRAY[
    'task_status', 'task_priority', 'habit_frequency', 'habit_log_status'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = enum_name AND typtype = 'e'
    ) THEN
      missing := array_append(missing, 'enum: ' || enum_name);
    END IF;
  END LOOP;

  -- Also check recurrence_pattern enum (added in 004)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'recurrence_pattern' AND typtype = 'e'
  ) THEN
    missing := array_append(missing, 'enum: recurrence_pattern');
  END IF;

  -- ═══════════════════════════════════════════════════════════════════
  -- 4. RLS enabled on all public tables
  -- ═══════════════════════════════════════════════════════════════════
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'tasks', 'goals', 'habits', 'habit_logs', 'ai_insights',
    'calendar_connections',
    'momentum_snapshots', 'burnout_alerts',
    'habit_goal_links', 'habit_stacks', 'cascade_events',
    'goal_plans', 'pattern_insights',
    'voice_logs', 'life_reviews',
    'focus_blocks', 'contracts', 'contract_checkins'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl AND rowsecurity = true
    ) THEN
      missing := array_append(missing, 'RLS disabled: ' || tbl);
    END IF;
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════════
  -- Result
  -- ═══════════════════════════════════════════════════════════════════
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION E'Schema verification FAILED.\nMissing objects:\n  - %',
      array_to_string(missing, E'\n  - ');
  ELSE
    RAISE NOTICE 'Schema verification PASSED. All 19 tables, 11 columns, 5 enums, and RLS policies verified.';
  END IF;
END $$;

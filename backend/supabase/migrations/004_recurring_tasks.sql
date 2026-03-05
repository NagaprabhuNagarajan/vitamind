-- Recurring tasks support
-- Adds recurrence columns to the existing tasks table so users can create
-- tasks that automatically spawn new instances on a schedule.

-- Recurrence pattern enum
CREATE TYPE recurrence_pattern AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

-- Add recurrence columns to tasks table
ALTER TABLE tasks
  ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN recurrence_pattern recurrence_pattern,
  ADD COLUMN recurrence_end_date DATE,
  ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN next_occurrence DATE;

-- Index for efficiently finding tasks that need spawning by the cron function
CREATE INDEX idx_tasks_next_occurrence
  ON tasks (next_occurrence)
  WHERE is_recurring = true AND next_occurrence IS NOT NULL;

-- Allow users to query their own child tasks by parent
CREATE INDEX idx_tasks_parent_task_id
  ON tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;

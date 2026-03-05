# VitaMind Database Schema

> Last updated: 2026-03-05
> Source of truth: `backend/supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_fcm_token.sql`

## Overview

VitaMind uses Supabase (PostgreSQL) with Row-Level Security enforcing strict per-user data isolation. The schema consists of 6 tables, 5 enum types, and several helper functions for automatic goal progress tracking and habit streak calculation.

### PostgreSQL Extensions

| Extension  | Purpose                            |
| ---------- | ---------------------------------- |
| `uuid-ossp` | UUID v4 generation for primary keys |
| `pg_trgm`   | Trigram-based full-text search on titles |

---

## Enum Types

### task_priority

```sql
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
```

### task_status

```sql
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
```

Note: The default status for new tasks is `'todo'`, not `'pending'`.

### habit_frequency

```sql
CREATE TYPE habit_frequency AS ENUM ('daily', 'weekly', 'weekdays', 'weekends');
```

Note: There is no `'monthly'` value.

### habit_log_status

```sql
CREATE TYPE habit_log_status AS ENUM ('completed', 'skipped', 'missed');
```

### insight_type

```sql
CREATE TYPE insight_type AS ENUM ('daily_plan', 'productivity', 'life_optimization');
```

---

## Tables

### users

Extends Supabase `auth.users` with app-level profile data. Rows are auto-created on signup via the `handle_new_user` trigger.

| Column      | Type          | Nullable | Default     | Constraints                              |
| ----------- | ------------- | -------- | ----------- | ---------------------------------------- |
| `id`        | `UUID`        | NO       | --          | PK, FK -> `auth.users(id)` ON DELETE CASCADE |
| `email`     | `TEXT`        | NO       | --          | UNIQUE                                   |
| `name`      | `TEXT`        | NO       | `''`        | --                                       |
| `avatar_url`| `TEXT`        | YES      | `NULL`      | --                                       |
| `timezone`  | `TEXT`        | NO       | `'UTC'`     | --                                       |
| `fcm_token` | `TEXT`        | YES      | `NULL`      | Added in migration 003                   |
| `created_at`| `TIMESTAMPTZ` | NO       | `NOW()`     | --                                       |
| `updated_at`| `TIMESTAMPTZ` | NO       | `NOW()`     | Auto-updated by trigger                  |

### goals

Long-term user goals with percentage-based progress tracking. Created before tasks because tasks reference goals.

| Column         | Type          | Nullable | Default       | Constraints                              |
| -------------- | ------------- | -------- | ------------- | ---------------------------------------- |
| `id`           | `UUID`        | NO       | `uuid_generate_v4()` | PK                                |
| `user_id`      | `UUID`        | NO       | --            | FK -> `users(id)` ON DELETE CASCADE      |
| `title`        | `TEXT`        | NO       | --            | CHECK: length 1-200                      |
| `description`  | `TEXT`        | YES      | `NULL`        | CHECK: length <= 1000                    |
| `target_date`  | `DATE`        | YES      | `NULL`        | --                                       |
| `progress`     | `SMALLINT`    | NO       | `0`           | CHECK: 0-100                             |
| `is_completed` | `BOOLEAN`     | NO       | `FALSE`       | --                                       |
| `created_at`   | `TIMESTAMPTZ` | NO       | `NOW()`       | --                                       |
| `updated_at`   | `TIMESTAMPTZ` | NO       | `NOW()`       | Auto-updated by trigger                  |

### tasks

User tasks with priority, status, and optional linkage to a goal.

| Column         | Type            | Nullable | Default              | Constraints                              |
| -------------- | --------------- | -------- | -------------------- | ---------------------------------------- |
| `id`           | `UUID`          | NO       | `uuid_generate_v4()` | PK                                       |
| `user_id`      | `UUID`          | NO       | --                   | FK -> `users(id)` ON DELETE CASCADE      |
| `goal_id`      | `UUID`          | YES      | `NULL`               | FK -> `goals(id)` ON DELETE SET NULL     |
| `title`        | `TEXT`          | NO       | --                   | CHECK: length 1-300                      |
| `description`  | `TEXT`          | YES      | `NULL`               | CHECK: length <= 2000                    |
| `priority`     | `task_priority` | NO       | `'medium'`           | --                                       |
| `status`       | `task_status`   | NO       | `'todo'`             | --                                       |
| `due_date`     | `DATE`          | YES      | `NULL`               | --                                       |
| `completed_at` | `TIMESTAMPTZ`   | YES      | `NULL`               | --                                       |
| `created_at`   | `TIMESTAMPTZ`   | NO       | `NOW()`              | --                                       |
| `updated_at`   | `TIMESTAMPTZ`   | NO       | `NOW()`              | Auto-updated by trigger                  |

**Table constraint** -- `completed_at_valid`: Ensures `completed_at` is NOT NULL only when `status = 'completed'`, and NULL otherwise.

```sql
CONSTRAINT completed_at_valid CHECK (
  (status = 'completed' AND completed_at IS NOT NULL) OR
  (status != 'completed' AND completed_at IS NULL)
)
```

### habits

User habits with frequency configuration and optional push notification reminders.

| Column          | Type              | Nullable | Default              | Constraints                              |
| --------------- | ----------------- | -------- | -------------------- | ---------------------------------------- |
| `id`            | `UUID`            | NO       | `uuid_generate_v4()` | PK                                       |
| `user_id`       | `UUID`            | NO       | --                   | FK -> `users(id)` ON DELETE CASCADE      |
| `title`         | `TEXT`            | NO       | --                   | CHECK: length 1-200                      |
| `description`   | `TEXT`            | YES      | `NULL`               | CHECK: length <= 500                     |
| `frequency`     | `habit_frequency` | NO       | `'daily'`            | --                                       |
| `target_days`   | `SMALLINT[]`      | YES      | `NULL`               | CHECK: 1-7 elements, values in 0-6      |
| `reminder_time` | `TIME`            | YES      | `NULL`               | Local time for push notifications        |
| `is_active`     | `BOOLEAN`         | NO       | `TRUE`               | --                                       |
| `created_at`    | `TIMESTAMPTZ`     | NO       | `NOW()`              | --                                       |
| `updated_at`    | `TIMESTAMPTZ`     | NO       | `NOW()`              | Auto-updated by trigger                  |

**target_days encoding**: Array of weekday numbers where 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Validated to contain only values in the set `{0,1,2,3,4,5,6}` using the `<@` (contained-by) operator.

### habit_logs

Daily habit completion records. Enforces one log per habit per day via a unique constraint.

| Column      | Type               | Nullable | Default              | Constraints                              |
| ----------- | ------------------ | -------- | -------------------- | ---------------------------------------- |
| `id`        | `UUID`             | NO       | `uuid_generate_v4()` | PK                                       |
| `habit_id`  | `UUID`             | NO       | --                   | FK -> `habits(id)` ON DELETE CASCADE     |
| `user_id`   | `UUID`             | NO       | --                   | FK -> `users(id)` ON DELETE CASCADE      |
| `date`      | `DATE`             | NO       | --                   | --                                       |
| `status`    | `habit_log_status` | NO       | `'completed'`        | --                                       |
| `created_at`| `TIMESTAMPTZ`      | NO       | `NOW()`              | --                                       |

**Unique constraint**: `UNIQUE (habit_id, date)` -- one log entry per habit per calendar day.

### ai_insights

AI-generated insights, daily plans, and productivity recommendations. Typically inserted server-side using the service role key.

| Column      | Type           | Nullable | Default              | Constraints                              |
| ----------- | -------------- | -------- | -------------------- | ---------------------------------------- |
| `id`        | `UUID`         | NO       | `uuid_generate_v4()` | PK                                       |
| `user_id`   | `UUID`         | NO       | --                   | FK -> `users(id)` ON DELETE CASCADE      |
| `type`      | `insight_type` | NO       | --                   | --                                       |
| `content`   | `TEXT`         | NO       | --                   | --                                       |
| `metadata`  | `JSONB`        | YES      | `'{}'`               | Stores model info, token usage, cached flag |
| `created_at`| `TIMESTAMPTZ`  | NO       | `NOW()`              | --                                       |

---

## Indexes

### users

| Index Name            | Type  | Column(s)     | Partial Condition           |
| --------------------- | ----- | ------------- | --------------------------- |
| `idx_users_email`     | btree | `email`       | --                          |
| `idx_users_fcm_token` | btree | `fcm_token`   | `WHERE fcm_token IS NOT NULL` |

### tasks

| Index Name                 | Type  | Column(s)              | Partial Condition           |
| -------------------------- | ----- | ---------------------- | --------------------------- |
| `idx_tasks_user_id`        | btree | `user_id`              | --                          |
| `idx_tasks_goal_id`        | btree | `goal_id`              | `WHERE goal_id IS NOT NULL` |
| `idx_tasks_status`         | btree | `user_id, status`      | --                          |
| `idx_tasks_due_date`       | btree | `user_id, due_date`    | `WHERE due_date IS NOT NULL`|
| `idx_tasks_priority`       | btree | `user_id, priority`    | --                          |
| `idx_tasks_title_search`   | GIN   | `title gin_trgm_ops`  | --                          |

### goals

| Index Name                 | Type  | Column(s)              | Partial Condition           |
| -------------------------- | ----- | ---------------------- | --------------------------- |
| `idx_goals_user_id`        | btree | `user_id`              | --                          |
| `idx_goals_target_date`    | btree | `user_id, target_date` | `WHERE target_date IS NOT NULL` |
| `idx_goals_title_search`   | GIN   | `title gin_trgm_ops`  | --                          |

### habits

| Index Name             | Type  | Column(s)           | Partial Condition            |
| ---------------------- | ----- | ------------------- | ---------------------------- |
| `idx_habits_user_id`   | btree | `user_id`           | --                           |
| `idx_habits_active`    | btree | `user_id, is_active`| `WHERE is_active = TRUE`     |

### habit_logs

| Index Name                  | Type  | Column(s)        | Partial Condition |
| --------------------------- | ----- | ---------------- | ----------------- |
| `idx_habit_logs_habit_id`   | btree | `habit_id`       | --                |
| `idx_habit_logs_user_date`  | btree | `user_id, date`  | --                |
| `idx_habit_logs_date`       | btree | `habit_id, date DESC` | --           |

### ai_insights

| Index Name                  | Type  | Column(s)               | Partial Condition |
| --------------------------- | ----- | ----------------------- | ----------------- |
| `idx_ai_insights_user_type` | btree | `user_id, type`         | --                |
| `idx_ai_insights_created`   | btree | `user_id, created_at DESC` | --             |

---

## Functions

### update_updated_at()

Trigger function that sets `updated_at = NOW()` before any row update. Applied to `users`, `tasks`, `goals`, and `habits`.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### handle_new_user()

Runs after a new row is inserted into `auth.users`. Creates a corresponding `public.users` profile row with name derived from `raw_user_meta_data->>'full_name'` (falls back to the email local part) and avatar from `raw_user_meta_data->>'avatar_url'`.

Defined with `SECURITY DEFINER` to bypass RLS during the insert.

### get_habit_streak(p_habit_id UUID) -> INTEGER

Calculates the current consecutive-day streak for a habit by walking backwards from today. Returns the count of consecutive days with a `'completed'` log entry. Stops at the first day without a completed log.

Defined with `SECURITY DEFINER STABLE`.

### recalculate_goal_progress(p_goal_id UUID) -> VOID

Counts total tasks and completed tasks linked to the given goal, computes `progress = ROUND((completed / total) * 100)`, and updates the goal row. Also sets `is_completed = TRUE` when progress reaches 100. Does nothing if the goal has zero linked tasks.

Defined with `SECURITY DEFINER`.

### trg_task_update_goal_progress()

Trigger function that fires after a task is updated. If the task's `status` changed and the task is linked to a goal, calls `recalculate_goal_progress()` for that goal. Also handles the case where a task is moved between goals by recalculating the old goal's progress.

---

## Triggers

| Trigger Name                  | Table         | Timing        | Event   | Function                           |
| ----------------------------- | ------------- | ------------- | ------- | ---------------------------------- |
| `trg_users_updated_at`        | `users`       | BEFORE UPDATE | UPDATE  | `update_updated_at()`              |
| `trg_tasks_updated_at`        | `tasks`       | BEFORE UPDATE | UPDATE  | `update_updated_at()`              |
| `trg_goals_updated_at`        | `goals`       | BEFORE UPDATE | UPDATE  | `update_updated_at()`              |
| `trg_habits_updated_at`       | `habits`      | BEFORE UPDATE | UPDATE  | `update_updated_at()`              |
| `trg_on_auth_user_created`    | `auth.users`  | AFTER INSERT  | INSERT  | `handle_new_user()`                |
| `trg_task_goal_progress`      | `tasks`       | AFTER UPDATE  | UPDATE  | `trg_task_update_goal_progress()`  |

---

## Row-Level Security (RLS) Policies

RLS is enabled on all 6 public tables. Every policy enforces `auth.uid() = user_id` (or `auth.uid() = id` for the users table), ensuring complete per-user data isolation.

### Policy Summary

| Table          | SELECT         | INSERT              | UPDATE              | DELETE         |
| -------------- | -------------- | ------------------- | ------------------- | -------------- |
| `users`        | `id = uid()`   | `id = uid()`        | `id = uid()` (USING + WITH CHECK) | --     |
| `tasks`        | `user_id = uid()` | `user_id = uid()` | `user_id = uid()` (USING + WITH CHECK) | `user_id = uid()` |
| `goals`        | `user_id = uid()` | `user_id = uid()` | `user_id = uid()` (USING + WITH CHECK) | `user_id = uid()` |
| `habits`       | `user_id = uid()` | `user_id = uid()` | `user_id = uid()` (USING + WITH CHECK) | `user_id = uid()` |
| `habit_logs`   | `user_id = uid()` | `user_id = uid()` + habit ownership check | `user_id = uid()` (USING + WITH CHECK) | `user_id = uid()` |
| `ai_insights`  | `user_id = uid()` | `user_id = uid()` | --                  | `user_id = uid()` |

Note on `users`: There is no DELETE policy. Users cannot delete their own profile row (deletion cascades from `auth.users`).

Note on `ai_insights`: There is no UPDATE policy. Insights are immutable once created. Inserts are typically done server-side with the service role key (which bypasses RLS).

Note on `habit_logs` INSERT: The policy includes an additional sub-query check to verify the referenced habit belongs to the inserting user:

```sql
EXISTS (
  SELECT 1 FROM public.habits
  WHERE id = habit_id AND user_id = auth.uid()
)
```

---

## Entity Relationships

```
auth.users
    |
    | 1:1 (trigger-created)
    v
+----------+
|  users   |
+----------+
    |
    |--- 1:N ---> goals
    |                |
    |                |--- 1:N (goal_id, ON DELETE SET NULL)
    |                |
    |--- 1:N ---> tasks <--+
    |
    |--- 1:N ---> habits
    |                |
    |                |--- 1:N ---> habit_logs (UNIQUE habit_id + date)
    |
    |--- 1:N ---> ai_insights
```

- A **user** has many tasks, goals, habits, and AI insights.
- A **goal** has many tasks (via `tasks.goal_id`). Deleting a goal sets `goal_id = NULL` on linked tasks.
- A **habit** has many habit_logs. Deleting a habit cascades to its logs.
- A **task** optionally belongs to one goal. When a task's status changes, the linked goal's progress is automatically recalculated.

---

## Design Notes

1. **UUIDs everywhere**: All primary keys use UUID v4 for safe client-side generation and merge-friendly distributed operations.

2. **Enum types over check constraints**: Enums provide schema-level documentation and prevent typos. Trade-off: adding new values requires `ALTER TYPE ... ADD VALUE`, but the enum sets are unlikely to change frequently.

3. **Partial indexes**: Indexes like `idx_tasks_goal_id WHERE goal_id IS NOT NULL` and `idx_habits_active WHERE is_active = TRUE` reduce index size by excluding rows that would never match common queries.

4. **Trigram search**: The `pg_trgm` GIN indexes on task and goal titles enable `ILIKE '%query%'` searches without full-text search complexity, suitable for the current scale.

5. **completed_at constraint**: The `completed_at_valid` check constraint on tasks enforces data consistency at the database level rather than relying on application code.

6. **Automatic goal progress**: The `trg_task_goal_progress` trigger keeps goal progress in sync whenever a task's status changes, eliminating the need for manual recalculation in application code.

7. **Habit log uniqueness**: The `UNIQUE (habit_id, date)` constraint on habit_logs enables upsert operations (`ON CONFLICT`) for toggling habit completion.

8. **SECURITY DEFINER functions**: `handle_new_user` and the helper functions use SECURITY DEFINER to bypass RLS when performing cross-table operations that the calling user's policies would not permit.

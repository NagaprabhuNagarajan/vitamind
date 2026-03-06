-- Migration 009: Burnout Radar + Smart Task Decomposition
-- Phase B of Killer Features

-- ─── Burnout History (tracks daily burnout signals for pattern detection) ─────
create table if not exists burnout_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  date        date not null default current_date,
  risk_level  smallint not null check (risk_level between 0 and 100),
  signals     jsonb not null default '{}',
  recovery_plan text,
  acknowledged boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(user_id, date)
);

alter table burnout_alerts enable row level security;

create policy "Users read own burnout alerts"
  on burnout_alerts for select
  using (auth.uid() = user_id);

create policy "Users update own burnout alerts"
  on burnout_alerts for update
  using (auth.uid() = user_id);

create index idx_burnout_alerts_user_date on burnout_alerts(user_id, date desc);

-- ─── Task Decomposition (estimated_minutes + subtask support) ────────────────
-- parent_task_id already exists from migration 004 (recurring tasks)
-- Add estimated_minutes for time estimates
alter table tasks add column if not exists estimated_minutes smallint;

-- Add is_subtask flag to distinguish AI-generated subtasks from recurring children
alter table tasks add column if not exists is_subtask boolean not null default false;

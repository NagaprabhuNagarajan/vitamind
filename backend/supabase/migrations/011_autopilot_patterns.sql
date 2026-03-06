-- Migration 011: Goal Autopilot + Pattern Oracle
-- Phase D of Killer Features

-- ─── Goal Autopilot (AI-generated task plans for goals) ──────────────────────
create table if not exists goal_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  goal_id     uuid not null references goals(id) on delete cascade,
  week_number smallint not null default 1,
  tasks_generated jsonb not null default '[]',
  habits_suggested jsonb not null default '[]',
  status      text not null default 'active' check (status in ('active', 'adjusted', 'completed')),
  created_at  timestamptz not null default now(),
  unique(goal_id, week_number)
);

alter table goal_plans enable row level security;

create policy "Users manage own goal_plans"
  on goal_plans for all
  using (auth.uid() = user_id);

create index idx_goal_plans_goal on goal_plans(goal_id, week_number);

-- ─── Pattern Insights (discovered correlations) ──────────────────────────────
create table if not exists pattern_insights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null check (type in ('habit_task_correlation', 'habit_pair', 'keystone_habit', 'day_pattern', 'time_pattern')),
  title       text not null,
  description text not null,
  data        jsonb not null default '{}',
  confidence  numeric(3,2) not null check (confidence between 0 and 1),
  computed_at timestamptz not null default now(),
  is_dismissed boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table pattern_insights enable row level security;

create policy "Users manage own pattern_insights"
  on pattern_insights for all
  using (auth.uid() = user_id);

create index idx_pattern_insights_user on pattern_insights(user_id, computed_at desc);

-- ─── Add autopilot flag to goals ────────────────────────────────────────────
alter table goals add column if not exists autopilot_enabled boolean not null default false;

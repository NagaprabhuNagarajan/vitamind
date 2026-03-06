-- Migration 010: Cascade Intelligence + Habit Stacking
-- Phase C of Killer Features

-- ─── Habit-Goal Links (for cascade impact analysis) ──────────────────────────
create table if not exists habit_goal_links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  habit_id    uuid not null references habits(id) on delete cascade,
  goal_id     uuid not null references goals(id) on delete cascade,
  impact_weight numeric(3,2) not null default 0.5 check (impact_weight between 0 and 1),
  created_at  timestamptz not null default now(),
  unique(habit_id, goal_id)
);

alter table habit_goal_links enable row level security;

create policy "Users manage own habit_goal_links"
  on habit_goal_links for all
  using (auth.uid() = user_id);

create index idx_habit_goal_links_user on habit_goal_links(user_id);
create index idx_habit_goal_links_habit on habit_goal_links(habit_id);

-- ─── Habit Stacks (ordered habit chains) ─────────────────────────────────────
create table if not exists habit_stacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  habit_ids   uuid[] not null default '{}',
  suggested_time time,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table habit_stacks enable row level security;

create policy "Users manage own habit_stacks"
  on habit_stacks for all
  using (auth.uid() = user_id);

create index idx_habit_stacks_user on habit_stacks(user_id);

-- ─── Cascade Events (log of detected ripple effects) ─────────────────────────
create table if not exists cascade_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  habit_id    uuid not null references habits(id) on delete cascade,
  affected_goals jsonb not null default '[]',
  suggestion  text,
  acknowledged boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table cascade_events enable row level security;

create policy "Users manage own cascade_events"
  on cascade_events for all
  using (auth.uid() = user_id);

create index idx_cascade_events_user on cascade_events(user_id, created_at desc);

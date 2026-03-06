-- Migration 012: Voice Life Log + Life Review
-- Phase E of Killer Features

-- ─── Voice Logs (transcribed speech with extracted actions) ──────────────────
create table if not exists voice_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  transcript  text not null,
  actions     jsonb not null default '{}',
  duration_ms integer,
  created_at  timestamptz not null default now()
);

alter table voice_logs enable row level security;

create policy "Users manage own voice_logs"
  on voice_logs for all
  using (auth.uid() = user_id);

create index idx_voice_logs_user on voice_logs(user_id, created_at desc);

-- ─── Life Reviews (monthly AI-generated reports) ─────────────────────────────
create table if not exists life_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  month       text not null,  -- YYYY-MM
  report      text not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique(user_id, month)
);

alter table life_reviews enable row level security;

create policy "Users manage own life_reviews"
  on life_reviews for all
  using (auth.uid() = user_id);

create index idx_life_reviews_user on life_reviews(user_id, month desc);

# Product Roadmap

## Phase 1 -- MVP (6-8 weeks)

Features: - Authentication - Task management - Goals - Habit tracker -
Dashboard - AI daily planner - AI assistant

Goal: Launch first public version.

Status: **Complete**

---

## Post-MVP Feature Phases

The following phases build the 12 killer features that form VitaMind's competitive moat. Each phase is scoped to 1-1.5 weeks and ships incrementally. All features depend on the unified tasks + habits + goals data model from Phase 1.

### Phase A -- Life Momentum Score + Time Fingerprint (~1 week)

**Features:**
- Life Momentum Score: Daily 0-100 score computed from task velocity, habit consistency, goal trajectory, and overdue pressure. Stored in `momentum_snapshots` table. Displayed as the hero metric on the dashboard.
- Time Fingerprint: Analyze task completion timestamps and habit log times to build a per-user productivity profile (peak hours, best days, morning vs evening patterns). Stored in `users.productivity_profile` JSONB column.

**Why first:** These are read-only analytics features with no new user input flows. They deliver immediate "wow" value on the existing data and validate the AI insight pipeline.

**Deliverables:**
- `momentum_snapshots` table + daily cron job
- Time Fingerprint analysis job (runs weekly)
- Dashboard momentum widget (score + 30-day sparkline)
- Time Fingerprint visualization screen
- GET /api/v1/momentum, GET /api/v1/momentum/history, GET /api/v1/time-fingerprint endpoints

**Revenue gate:** Free tier sees the score number only. Pro unlocks full breakdown + history + Time Fingerprint.

---

### Phase B -- Burnout Radar + Smart Task Decomposition (~1 week)

**Features:**
- Burnout Radar: Multi-signal detection analyzing declining habit streaks, rising overdue count, missed deadlines, and reduced task throughput. Surfaces warnings in the daily plan and as push notifications.
- Smart Task Decomposition: AI endpoint that takes a task and generates 3-8 subtasks with time estimates. Adds `estimated_minutes` column to tasks.

**Why second:** Burnout Radar leverages the momentum pipeline from Phase A. Task decomposition is a high-value, low-complexity AI feature that improves daily task flow.

**Deliverables:**
- Burnout risk score added to momentum snapshots
- Burnout warning UI component + notification trigger
- POST /api/v1/tasks/:id/decompose endpoint
- `tasks.estimated_minutes` column
- Decomposition UI (button on task detail, subtask preview)

---

### Phase C -- Cascade Intelligence + Habit Stacking Engine (~1.5 weeks)

**Features:**
- Cascade Intelligence: Analyzes correlations between habit completion and goal/task progress. Maps which habits most impact which goals. Stored in `habit_goal_links` table with AI-detected impact weights.
- Habit Stacking Engine: Groups habits into optimal sequences based on completion correlation data. Suggests time slots using Time Fingerprint. Stored in `habit_stacks` table.

**Why third:** Both features require 2-4 weeks of user data to produce meaningful results. By Phase C, early adopters from MVP launch have sufficient history.

**Deliverables:**
- POST /api/v1/cascade/analyze endpoint
- `habit_goal_links` table with user and AI-created links
- Cascade visualization (habit-to-goal impact map)
- `habit_stacks` table
- GET /api/v1/habit-stacks endpoint
- POST /api/v1/habit-goal-links endpoint
- Habit stack suggestion UI + reorder interface

---

### Phase D -- Goal Autopilot + Pattern Oracle (~1.5 weeks)

**Features:**
- Goal Autopilot: AI generates a week-by-week task plan for a goal, auto-creates tasks, monitors progress weekly, and adjusts the plan when the user falls behind.
- Pattern Oracle: Cross-domain statistical correlation engine. Discovers relationships like "You complete 40% more tasks on days you meditate" by analyzing task/habit/goal data intersections.

**Why fourth:** Goal Autopilot depends on task decomposition (Phase B). Pattern Oracle needs the correlation pipeline from Phase C and benefits from accumulated user data.

**Deliverables:**
- POST /api/v1/goals/:id/autopilot endpoint
- Autopilot dashboard (generated plan, progress tracking, adjustment history)
- GET /api/v1/patterns endpoint
- Pattern Oracle discovery UI (card-based insight feed)
- Weekly autopilot check-in cron job

---

### Phase E -- Voice Life Log + Monthly Life Review (~1 week)

**Features:**
- Voice Life Log: User speaks a natural language update ("Finished the deck, skipped gym, feeling good about the launch"). AI parses it into structured task completions, habit logs, and notes.
- Monthly Life Review: AI-generated long-form report covering momentum trends, biggest wins, concern areas, habit streaks, goal progress, and personalized recommendations.

**Why fifth:** Voice input is a UX enhancement that benefits from having all entity types established. Life Review needs a full month of data from the killer features.

**Deliverables:**
- POST /api/v1/voice-log endpoint (accepts transcript text)
- Voice input UI (record button + transcript preview + parsed action confirmation)
- GET /api/v1/life-review endpoint
- Monthly review generation cron job (1st of each month)
- Life Review screen (long-form scrollable report with charts)

---

### Phase F -- Focus Contracts + Accountability Contracts (~1.5 weeks)

**Features:**
- Focus Contracts: Declare a focus block with specific tasks and a time window. Track interruptions and completed tasks. Get a focus score after the block ends. Stored in `focus_blocks` table.
- Accountability Contracts: Stake-based goal commitments. User sets a goal, a deadline, a check-in frequency, and optionally a financial stake (donated to charity on failure). Stored in `contracts` table.

**Why last:** Focus Contracts require the task infrastructure to be mature. Accountability Contracts introduce financial transactions (Razorpay integration) and are the highest-complexity feature. They also unlock the Team tier.

**Deliverables:**
- `focus_blocks` table
- POST /api/v1/focus/start, POST /api/v1/focus/end, GET /api/v1/focus/history endpoints
- Focus mode UI (timer, task checklist, interruption logger)
- `contracts` table
- POST /api/v1/contracts, GET /api/v1/contracts endpoints
- Contract creation flow UI
- Razorpay integration for financial stakes (UPI, net banking, cards)
- Team tier: shared accountability contracts between users

**Revenue gate:** Focus Contracts and Accountability Contracts are Pro/Team only. Team tier launches with Phase F.

---

## Post-Launch Growth Phases

These phases extend VitaMind toward the AI Life Intelligence Platform vision.

### Phase G -- Calendar & External Integrations

- Google Calendar two-way sync -- **Complete** (OAuth connect, push tasks to calendar, import calendar events as tasks, duplicate detection)
- Calendar-aware daily planning (AI sees your meetings) -- Planned
- Weekly productivity email reports via Resend -- **Complete** (edge function deployed)
- Apple Calendar sync -- Planned

### Phase G -- Launch Infrastructure -- **Complete**

- Vercel deployment (vitamind-woad.vercel.app)
- Firebase Cloud Messaging V1 (OAuth2 JWT, not Legacy)
- Sentry error monitoring (web + mobile)
- PostHog analytics (web + mobile)
- Supabase Edge Functions (compute-momentum, send-reminder, send-weekly-report)
- pg_cron scheduling (momentum daily, reminders hourly, habits daily, weekly reports Monday 9am)

### Phase H -- Behavioral Intelligence -- **Complete**

- Long-term behavioral trend analysis (90-day momentum trends, weekly breakdowns, component trend directions)
- Smart scheduling (AI suggests 3 optimal time slots using Time Fingerprint + Google Calendar availability)
- AI productivity coaching conversations (Pattern Oracle insights + keystone habit injected into chat context)

### Phase I -- Life Ecosystem -- **Complete**

- **Financial Tracking**: Manual income/expense logging with 10 expense + 5 income categories, monthly summary (total income/expense/net, savings rate), category breakdown bar chart. CRUD API + web `/finance` + mobile `FinanceScreen`.
- **Health Tracking**: Daily health entry (sleep, steps, water, exercise, weight, mood 1–5), 30-day trend analysis (improving/declining/stable), consecutive-day tracking streak. Upsert API + web `/health` + mobile `HealthScreen`.
- **Automation Rules**: Trigger-based rule engine — 5 trigger types (task_overdue, habit_streak_broken, momentum_low, burnout_high, goal_deadline_approaching) × 3 action types (create_task, send_notification, webhook). Toggle on/off per rule. CRUD API + web `/automations` + mobile `AutomationsScreen`.
- **Cross-Domain AI Insights**: `GET /api/v1/cross-domain` — AI prompt synthesising finance + health + productivity data, identifies inter-domain correlations, returns `insights[]` + `top_leverage` message. 6-hour cache.

### Phase J -- Monetization

- Razorpay integration for accountability contract financial stakes (India-first: UPI, net banking, cards, wallets)
- Pro tier feature gating
- Team tier: shared accountability contracts

---

## Next-Gen Phases -- AI Life Intelligence System

These features evolve VitaMind from a productivity tool into an AI Life Intelligence System. Focus: reduce manual input, increase insight, create emotional connection.

### Phase K -- Life Timeline + Life Map -- **Complete**

- **Life Timeline**: Chronological timeline auto-built from tasks, goals, habits, notes, and logs. Searchable history. Auto-populated via DB triggers. Manual note/milestone creation. Full-text search. Available on Web + Mobile.
- **Life Map**: Visual overview of 6 life domains (Health, Career, Relationships, Finance, Learning, Personal) with weighted scores (goals 50%, tasks 30%, habits 20%), radar chart visualization, domain drill-down, and template-based insights. Available on Web + Mobile.

**Migrations**: `014_life_timeline.sql`, `015_life_map_domain.sql`

### Phase L -- AI Life Coach + AI Life Companion -- **Complete**

- **AI Life Coach**: Proactive, data-backed coaching report generated from tasks, habits, momentum, burnout, health, and time fingerprint data. Returns 4–5 insights each with observation, recommended action, impact, domain, and urgency. 24-hour cache with force-refresh. API: `GET /api/v1/ai/life-coach`. Web: `/life-coach`. Mobile: `LifeCoachScreen`.
- **AI Life Companion**: Persistent memory system (`companion_memory` table, one row per memory key). Memory auto-initialised from existing user data on first chat. Updated after each conversation via AI extraction. Time-of-day + seasonal aware system prompt. Memory keys: personality, seasonal, struggles, victories, preferences. API: `POST /api/v1/ai/companion`. Web: `/companion`. Mobile: `CompanionScreen`.

**Migrations**: `companion_memory` table added to `backend/supabase/schema.sql`

### Phase M -- Decision Engine + Life Simulation -- **Complete**

- **Decision Engine**: AI-assisted decision analysis. User poses a question + 2–5 options. AI evaluates each against active goals, momentum, and behavioural patterns. Returns recommendation, per-option pros/cons/risk/effort/goal-alignment %, key considerations, and confidence level. History stored in `decisions` table. API: `GET/POST /api/v1/decisions`, `DELETE /api/v1/decisions/[id]`. Web: `/decisions`. Mobile: `DecisionsScreen`.
- **Life Simulation**: Simulate what life looks like if a scenario is followed for 12 months. Uses current baseline (tasks, habits, momentum, health, finance) to project 4 milestones (1/3/6/12 months) with probability %, measurable metric, key risks, and success enablers. Stateless (no DB). API: `POST /api/v1/life-simulation`. Web: `/life-simulation`. Mobile: `LifeSimulationScreen`.

**Migrations**: `decisions` table added to `backend/supabase/schema.sql`

### Phase N -- Knowledge Graph + Auto Capture -- **Complete**

- **AI Personal Knowledge Graph** ✅: Directed graph of habit/health/productivity influence relationships computed from 30 days of real data. Identifies keystone habits. SVG graph (web) + scrollable list (mobile). `GET /api/v1/knowledge-graph`. Cached 24h.
- **Life Auto Capture** ✅: Quick-log any text in plain English → AI parses into tasks/habit logs/health entries. Smart suggestions from Google Calendar events + un-logged habits. `GET|POST /api/v1/auto-capture`, `POST /api/v1/auto-capture/import`.

**Key files**: `features/knowledge-graph/services/knowledge-graph.service.ts`, `features/auto-capture/services/auto-capture.service.ts`, `app/api/v1/knowledge-graph/`, `app/api/v1/auto-capture/`

### Phase O -- Social Accountability Layer + Future Self -- **Complete**

- **Social Accountability Layer** ✅: Bidirectional friend graph (`social_connections` table with requester/addressee + status). Send invites by email, accept/decline incoming requests, view friends' daily habit + task counts in an activity feed. API: `GET/POST /api/v1/social/friends`, `PUT/DELETE /api/v1/social/friends/[id]`, `GET /api/v1/social/feed`. Web: `/social`. Mobile: `SocialScreen`.
- **Future Self** ✅: Time-capsule messages sealed for a future date. AI generates a personalized behavioral forecast at write time using 30 days of habit/task/goal data. Arrived messages expand to show the original forecast. API: `GET/POST /api/v1/future-self`, `DELETE /api/v1/future-self/[id]`. Web: `/future-self`. Mobile: `FutureSelfScreen`.

**Migrations**: `social_connections`, `future_messages` tables added to `backend/supabase/schema.sql`

**Key files**: `features/social/services/social.service.ts`, `features/future-self/services/future-self.service.ts`, `app/api/v1/social/`, `app/api/v1/future-self/`

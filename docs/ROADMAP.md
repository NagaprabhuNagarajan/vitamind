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

### Phase H -- Behavioral Intelligence

- Long-term behavioral trend analysis
- Smart scheduling (AI suggests optimal times for tasks based on Time Fingerprint + calendar)
- AI productivity coaching conversations

### Phase I -- Life Ecosystem

- Financial insights integration (bank transaction categorization)
- Health data connections (Apple Health, Google Fit)
- Automation workflows (IFTTT/Zapier-style triggers)
- Cross-domain life optimization recommendations

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

### Phase L -- AI Life Coach + AI Life Companion

- **AI Life Coach**: Behavioral pattern analysis with improvement suggestions. Detects productivity drops, suggests habit reinforcement and lifestyle adjustments. (e.g., "You skip gym when you sleep after 1AM.")
- **AI Life Companion**: Persistent AI that learns user personality and history. Emotional support, context-aware advice, seasonal awareness. (e.g., "You usually feel less motivated in March.")

### Phase M -- Decision Engine + Life Simulation

- **Decision Engine**: AI-assisted decision making. Compare options, evaluate risk/benefit, align decisions with user goals. (e.g., "Should I change jobs?")
- **Life Simulation**: Simulate future scenarios based on goals and current habits. Projects timelines for different strategies with outcome forecasting.

### Phase N -- Knowledge Graph + Auto Capture

- **AI Personal Knowledge Graph**: Graph of relationships between habits, goals, productivity, and outcomes. Discover hidden patterns and keystone habits. (e.g., Meditation -> Focus up -> Tasks completed up -> Goals progress up)
- **Life Auto Capture**: Automatic data ingestion from calendar, email summaries, phone usage, health data, sleep tracking. Reduces manual input.

### Phase O -- Social + Future Self

- **Social Accountability Layer**: Share goals, habits, and focus sessions with friends or mentors. Friendly competition, public progress boards. (e.g., "Your friend completed 6 habits today.")
- **Future Self**: Send messages to future self, AI predictions based on current behavior, reflection reminders. (e.g., "If current habits continue, productivity may increase 23% next year.")

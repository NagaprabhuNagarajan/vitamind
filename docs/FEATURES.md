# VitaMind -- Complete Feature List

> Last updated: 2026-03-06 (Sprint 3-4 updates)
> "The AI Operating System for Your Life"

---

## Core Modules

### Authentication
- Email/password registration and login
- Google OAuth (one-tap sign-in)
- Magic link email login
- Password reset flow
- Email verification
- Session management with JWT refresh
- Account deletion with full data cascade (GDPR)
- Available on: Web + Mobile

### Task Management
- Create, edit, delete tasks with title, description, priority, due date
- Status workflow: todo -> in_progress -> completed / cancelled
- Priority levels: low, medium, high, urgent
- Filter by status and priority
- Search by title/description
- Link tasks to goals (progress tracking)
- Recurring tasks (daily, weekly, monthly, yearly) with auto-spawn
- Calendar event sync (tasks with due dates -> Google Calendar)
- Calendar event import (Google Calendar events -> VitaMind tasks)
- Cascade delete: deleting a parent task also deletes all subtasks
- Pagination with offset-based navigation
- Available on: Web + Mobile

### Goal Tracking
- Create goals with title, description, target date
- Life domain categorization (health, career, relationships, finance, learning, personal)
- Progress tracking (0-100% range slider)
- Link tasks to goals for automatic progress correlation
- Goal completion marking
- Top 5 active goals displayed on dashboard
- Available on: Web + Mobile

### Habit Tracker
- Create habits with title, frequency (daily, weekly, weekdays, weekends)
- Daily check-in logging (completed, skipped, missed)
- Streak calculation and display
- Reminder time configuration
- Active/inactive habit toggling
- 7-day completion visualization
- Available on: Web + Mobile

### Dashboard
- Unified view: tasks due today, active goals, habit streaks
- Quick stats cards (tasks completed, habits logged, goals in progress)
- AI insight widget
- Momentum score widget (see Killer Features)
- Burnout radar widget (see Killer Features)
- Voice log widget (see Killer Features)
- Cascade alerts widget (see Killer Features)
- Available on: Web + Mobile

### AI Daily Planner
- AI-generated daily plan based on tasks, goals, habits, and momentum
- Considers time fingerprint (peak productivity hours)
- Burnout-aware suggestions (lighter plans when risk is elevated)
- Cached once per day to minimize AI costs
- Available on: Web

### AI Chat Assistant
- Conversational AI for productivity advice
- Context-aware (sees your tasks, goals, habits, momentum)
- Conversation history (last 10 turns)
- Starter prompt suggestions
- Available on: Web

---

## 12 Killer Features

### 1. Life Momentum Score
Daily 0-100 score computed from four weighted components:
- Task velocity (25%) -- completion rate over 7 days
- Habit consistency (30%) -- habit completion vs possible
- Goal trajectory (25%) -- pace toward target dates
- Overdue pressure (20%) -- penalty for overdue tasks

Includes 30-day sparkline, component breakdown bars, and push notifications for score drops > 7 points.
Available on: Web + Mobile

### 2. Time Fingerprint
Per-user productivity profile built from task completion timestamps and habit log times:
- Peak productivity hours
- Best productivity window
- Morning vs evening classification
- Best and worst days of the week
- Habit completion rates by time slot

Computed weekly, stored in users.productivity_profile JSONB. Fed into AI daily planner for time-optimized scheduling.
Available on: Web + Mobile

### 3. Burnout Radar
Multi-signal burnout detection analyzing:
- Declining habit streaks
- Rising overdue task count
- Missed deadlines
- Reduced task throughput
- Momentum score drops

Generates AI recovery plans when risk exceeds threshold (65/100). Push notification alerts.
Available on: Web + Mobile

### 4. Smart Task Decomposition
AI-powered task breakdown: takes a complex task and generates 3-8 subtasks with time estimates. Adds estimated_minutes and is_subtask columns to tasks. Parent task progress auto-updates as subtasks complete.
Available on: Web + Mobile (service only)

### 5. Cascade Intelligence
Analyzes correlations between habit completion and goal/task progress:
- Detects which habits impact which goals
- Maps ripple effects (missed habit -> affected goals)
- AI suggests habit-goal links
- Acknowledging cascade alerts

Dashboard widget shows unacknowledged cascade events with affected goals.
Dedicated management UI on Goals page: view/remove links, AI-suggested links with accept, manual habit-goal link form.
Available on: Web + Mobile

### 6. Habit Stacking Engine
Groups habits into optimal sequences based on completion correlation:
- Temporal analysis (which habits are completed together)
- Stack suggestions based on time patterns
- Bulk stack completion (complete all habits in a stack at once)
- 14-day completion rate tracking per stack

Available on: Web + Mobile

### 7. Goal Autopilot
AI generates week-by-week task plans for goals:
- Auto-creates real tasks linked to the goal
- Weekly plan adjustment based on actual progress
- On-track / behind / ahead status
- Tasks include time estimates

Toggle autopilot per goal directly from goal cards (Rocket icon). AI recalibrates when user falls behind.
Available on: Web + Mobile

### 8. Pattern Oracle
Cross-domain statistical correlation engine:
- Discovers relationships (e.g., "40% more tasks completed on meditation days")
- Keystone habit identification (highest-impact habits)
- Day-of-week and time-of-day patterns
- Confidence scores per insight
- Dismissible insight cards

Available on: Web + Mobile

### 9. Voice Life Log
Natural language input for rapid life logging:
- User speaks/types an update ("Finished the deck, skipped gym, feeling good")
- AI parses into structured actions: task completions, habit logs, notes
- Action confirmation and auto-apply
- Recent voice logs history
- Mobile: native speech-to-text via speech_to_text package, tap mic to record, auto-stop after 30s/3s silence, pulsing animation

Available on: Web + Mobile

### 10. Life Review (Monthly Deep Dive)
AI-generated long-form monthly productivity report:
- Momentum trends and averages
- Tasks completed vs created
- Habit completion rates
- Goal progress summaries
- Biggest wins and concern areas
- Personalized recommendations

Generate on-demand for any past month.
Available on: Web + Mobile

### 11. Focus Contracts (Deep Work Blocks)
Declare focused work sessions with specific tasks:
- Duration picker (25min - 3hr)
- AI suggests optimal tasks for the session
- Live countdown timer
- Interruption tracking
- Focus score after block ends
- Session history with stats

Available on: Web + Mobile

### 12. Accountability Contracts
Stake-based goal commitments:
- Set a goal, deadline, and check-in frequency (daily/weekly)
- Optional financial stake (Razorpay integration planned -- UPI, net banking, cards)
- 14-day check-in dot visualization
- Auto and manual check-ins
- AI nudge messages when falling behind
- Active, completed, and failed contract states

Available on: Web + Mobile

---

## Infrastructure Features

### Google Calendar Integration
- OAuth 2.0 connect/disconnect flow
- Two-way sync:
  - **Push**: Sync VitaMind tasks with due dates to Google Calendar as all-day events
  - **Pull**: Import Google Calendar events (next 7 days) as VitaMind tasks, with duplicate detection via calendar_event_id
- Bi-directional tracking via calendar_event_id
- Token refresh with 5-minute buffer
- Settings UI with connection status, last sync time, Sync Tasks button, Import Events button
- Available on: Web + Mobile

### Weekly Email Reports
- Automated Monday 9am UTC email via Supabase Edge Function
- Stats: momentum score, tasks completed, habit completion rate, active days, streaks, goals progress
- Branded HTML email with dark theme and mini bar charts
- Opt-in via email_weekly_report user preference
- Dual provider: Resend (primary) + SendGrid (fallback)
- Skips users with zero weekly activity

### Push Notifications
- Firebase Cloud Messaging V1 (OAuth2 service account JWT)
- Task due reminders (hourly check)
- Habit reminders (daily at 8am UTC)
- Momentum drop alerts (> 7 point drop)
- Burnout risk alerts (risk >= 65)
- Cascade alerts (unacknowledged habit-goal events)
- In-app foreground banners (mobile)
- Tap routing to correct screen (mobile)

### Recurring Tasks
- Recurrence patterns: daily, weekly, monthly, yearly
- Recurrence end date (optional)
- Auto-spawn via cron edge function (daily at 1am UTC)
- Parent-child task linking

### Offline Support (Mobile)
- Cache-first pattern with TTL (24h for lists, 1h for dashboard)
- SharedPreferences JSON storage
- Offline indicator banner
- Automatic sync on reconnection

---

## Platform & Quality

### Security
- Row Level Security (RLS) on all database tables
- HSTS, CSP, X-Frame-Options, X-Content-Type-Options headers
- CORS middleware with origin validation
- Rate limiting (3 tiers: standard 60/min, dashboard 30/min, AI 10/min)
- Input validation on all API endpoints
- Environment variable validation (fail-fast on missing vars)

### Monitoring & Analytics
- Sentry error tracking (web client + server + edge, mobile activated)
- PostHog product analytics (typed events, user identification, mobile activated)
- Structured JSON request logging (duration, user ID, route)

### Accessibility (WCAG 2.1 AA)
- Skip navigation links
- ARIA labels and landmark roles
- Keyboard navigation with visible focus indicators
- Form labels and error messages
- Flutter Semantics widgets (mobile)

### Testing
- 132+ unit tests (Vitest for web, Flutter Test for mobile)
- E2E tests (Playwright for web, Flutter Integration Test for mobile)
- CI pipeline: lint, test, typecheck, build on every PR

### Legal
- Privacy Policy page
- Terms of Service page
- GDPR data export endpoint (GET /api/v1/user/export)
- Account deletion with full data cascade

---

## Next-Gen Features

These features evolve VitaMind from a productivity tool into an **AI Life Intelligence System**.

### 13. Life Timeline -- **Complete**
- Chronological timeline auto-built from tasks, goals, habits, notes, and logs
- Auto-populated via database triggers (task completed, goal achieved)
- Manual event creation (notes, milestones) with date picker
- Full-text search on event titles (GIN index)
- Filter by event type (task_completed, goal_achieved, habit_streak, milestone, note)
- Paginated, date-grouped display
- Delete manual events (notes/milestones only)
- Searchable history ("When did I start that project?")
- Available on: Web + Mobile

### 14. AI Life Coach
- Behavioral pattern analysis with improvement suggestions
- Detects productivity drops, habit reinforcement suggestions, lifestyle adjustments
- Example: "You skipped the gym 3 times this week. You tend to skip workouts when you sleep after 1AM. Consider moving gym to evenings."

### 15. Decision Engine
- AI-assisted decision making for personal and professional choices
- Compare options, evaluate risk/benefit, align decisions with user goals
- Example: "Should I change jobs?", "Should I start a business?"

### 16. Life Simulation
- Simulate future scenarios based on goals and current habits
- Projects timelines for different strategies with outcome forecasting
- Example: Save 30% income -> achieve financial independence in 6.2 years vs start side business -> 4.1 years

### 17. AI Personal Knowledge Graph
- Graph of relationships between habits, goals, productivity, and outcomes
- Discover hidden patterns and identify keystone habits
- Visualization: Meditation -> Focus up -> Tasks completed up -> Goals progress up

### 18. Life Auto Capture
- Automatic data ingestion from external sources (calendar, email, phone usage, health, sleep)
- Reduces manual input dramatically
- Example insight: "You complete 40% more tasks on days you sleep 7+ hours"

### 19. Future Self
- Send messages to future self (time capsule)
- AI predictions based on current behavior trajectory
- Reflection reminders and behavioral forecasting
- Example: "If current habits continue, productivity may increase 23% next year"

### 20. Life Map -- **Complete**
- Visual overview of 6 life domains: Health, Career, Relationships, Finance, Learning, Personal
- SVG hexagonal radar chart with per-domain scores (web), CustomPainter radar (mobile)
- Weighted composite score per domain: goal progress (50%) + task completion (30%) + habit consistency (20%)
- Overall life score (average across domains)
- Domain cards with progress bars, goal counts, expandable active goals list
- Template-based insights per domain (e.g., "Career is on track", "Health needs attention")
- Goals tagged by domain via `life_domain` enum column
- Available on: Web + Mobile

### 21. Social Accountability Layer
- Share goals, habits, and focus sessions with friends or mentors
- Friendly competition and public progress boards
- Example: "Your friend completed 6 habits today"

### 22. AI Life Companion
- Persistent AI that learns user personality, preferences, and history over time
- Personalized insights, emotional support, context-aware advice
- Seasonal awareness: "You usually feel less motivated in March. Let's plan something energizing."

---

## API Surface

35+ REST endpoints across these domains:

| Domain | Endpoints |
|--------|-----------|
| Auth | register, login, logout, OAuth callback |
| Tasks | CRUD, search, decompose |
| Goals | CRUD, autopilot |
| Habits | CRUD, daily log |
| Dashboard | Aggregate stats |
| AI | Daily plan, chat, insights |
| Momentum | Score + history |
| Time Fingerprint | Profile |
| Burnout Radar | Status + acknowledge |
| Cascade | View + link/unlink + acknowledge |
| Habit Stacks | CRUD + complete |
| Patterns | Insights + dismiss |
| Voice Log | Submit + recent |
| Life Reviews | List + generate |
| Focus | Suggest + start/end + stats |
| Contracts | CRUD + check-in + nudge |
| Calendar | Connect + disconnect + sync + import + status |
| Timeline | List + search + create + delete |
| Life Map | Domain scores + radar data |
| User | Profile CRUD + export + delete |
| Health | Health check |

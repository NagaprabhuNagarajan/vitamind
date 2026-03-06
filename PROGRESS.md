# VitaMind -- Build Progress

> Last updated: 2026-03-06

## Summary

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 102   | 102       | 0           | 0       |

---

## Phase 0 -- Foundation

| Task | Status |
|------|--------|
| Project structure scaffold (monorepo: web + mobile + backend) | Done |

---

## Phase 1 -- Database

| Task | Status |
|------|--------|
| 1A -- Supabase schema: DDL, enums, indexes, foreign keys, triggers | Done |
| 1B -- RLS policies + helper functions (streak, goal progress) | Done |

**Files:**
- `backend/supabase/migrations/001_initial_schema.sql`
- `backend/supabase/migrations/002_rls_policies.sql`

---

## Phase 2 -- Authentication

| Task | Status |
|------|--------|
| Supabase Auth (email + Google OAuth), JWT middleware, session management | Done |

**Files:**
- `apps/web/src/features/auth/actions.ts` -- server actions (login, register, Google OAuth, logout)
- `apps/web/src/features/auth/hooks/use-user.ts` -- reactive client-side auth hook
- `apps/web/src/app/auth/callback/route.ts` -- OAuth + magic link callback handler
- `apps/web/src/lib/supabase/middleware.ts` -- session refresh + route protection
- `apps/web/src/app/(auth)/login/page.tsx` + `login-form.tsx`
- `apps/web/src/app/(auth)/register/page.tsx` + `register-form.tsx`
- `apps/mobile/lib/features/auth/data/auth_service.dart` -- Flutter auth service
- `apps/mobile/lib/features/auth/presentation/bloc/auth_bloc.dart` -- Bloc state management

---

## Phase 3 -- Backend Services

| Task | Status |
|------|--------|
| 3A -- Task service: CRUD repository + API routes | Done |
| 3B -- Goal service: CRUD + task linking + progress calc | Done |
| 3C -- Habit service: CRUD + daily logging + streak calc | Done |
| 3D -- Dashboard API: aggregate (tasks + goals + habits + AI insights) | Done |

**Files:**
- `apps/web/src/lib/api/errors.ts` -- typed error/success response helpers
- `apps/web/src/lib/api/auth-guard.ts` -- `requireAuth()` middleware
- `apps/web/src/features/tasks/repositories/task.repository.ts`
- `apps/web/src/features/tasks/services/task.service.ts`
- `apps/web/src/app/api/v1/tasks/route.ts` + `[id]/route.ts`
- `apps/web/src/features/goals/repositories/goal.repository.ts`
- `apps/web/src/features/goals/services/goal.service.ts`
- `apps/web/src/app/api/v1/goals/route.ts` + `[id]/route.ts`
- `apps/web/src/features/habits/repositories/habit.repository.ts`
- `apps/web/src/features/habits/services/habit.service.ts`
- `apps/web/src/app/api/v1/habits/route.ts` + `[id]/route.ts`
- `apps/web/src/app/api/v1/habit-log/route.ts`
- `apps/web/src/app/api/v1/dashboard/route.ts`

---

## Phase 4 -- Next.js Web

| Task | Status |
|------|--------|
| 4A -- Design system setup (Inter, color tokens, Tailwind config) | Done |
| 4B -- Auth pages (login, register, OAuth callback) | Done |
| 4C -- Dashboard page + sidebar layout (stats, tasks, habits, goals, AI widget) | Done |
| 4D -- Task Manager page (list, create, complete, delete, filter by status/priority) | Done |
| 4E -- Goal Manager page (progress bars, range slider, create, delete) | Done |
| 4F -- Habit Tracker page (card grid, daily check-in, streak display) | Done |

**Files:**
- `apps/web/src/components/layout/sidebar.tsx` -- nav sidebar with active state
- `apps/web/src/components/layout/page-header.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx` -- sidebar + main layout
- `apps/web/src/app/(dashboard)/dashboard/` -- page + 5 sub-components
- `apps/web/src/app/(dashboard)/tasks/` -- page + task-list + task-create-button
- `apps/web/src/app/(dashboard)/goals/` -- page + goal-list + goal-create-button
- `apps/web/src/app/(dashboard)/habits/` -- page + habit-grid + habit-create-button

---

## Phase 5 -- Flutter Mobile

| Task | Status |
|------|--------|
| 5A -- Project setup (feature structure, theme, router, constants) | Done |
| 5B -- Auth screens (login, register, Google Sign-In) | Done |
| 5C -- Dashboard screen | Done |
| 5D -- Tasks, Goals, Habits screens (Bloc state management) | Done |

**Files:**
- `apps/mobile/lib/main.dart`
- `apps/mobile/lib/app.dart` -- BlocProvider<AuthBloc> at root
- `apps/mobile/lib/core/theme/app_theme.dart`
- `apps/mobile/lib/core/router/app_router.dart` -- all routes wired
- `apps/mobile/lib/core/constants/app_constants.dart`
- `apps/mobile/lib/features/auth/presentation/screens/login_screen.dart`
- `apps/mobile/lib/features/auth/presentation/screens/register_screen.dart`
- `apps/mobile/lib/features/auth/presentation/widgets/auth_text_field.dart`
- `apps/mobile/lib/features/dashboard/data/dashboard_service.dart`
- `apps/mobile/lib/features/dashboard/presentation/screens/dashboard_screen.dart`
- `apps/mobile/lib/features/tasks/data/task_service.dart`
- `apps/mobile/lib/features/tasks/presentation/bloc/tasks_bloc.dart`
- `apps/mobile/lib/features/tasks/presentation/screens/tasks_screen.dart`
- `apps/mobile/lib/features/goals/data/goal_service.dart`
- `apps/mobile/lib/features/goals/presentation/bloc/goals_bloc.dart`
- `apps/mobile/lib/features/goals/presentation/screens/goals_screen.dart`
- `apps/mobile/lib/features/habits/data/habit_service.dart`
- `apps/mobile/lib/features/habits/presentation/bloc/habits_bloc.dart`
- `apps/mobile/lib/features/habits/presentation/screens/habits_screen.dart`

---

## Phase 6 -- AI Layer

| Task | Status |
|------|--------|
| 6A -- Prompt builder (user context: tasks + goals + habits) | Done |
| 6B -- Daily planner API (POST /api/v1/ai/daily-plan) with caching | Done |
| 6C -- Chat assistant API (POST /api/v1/ai/chat) | Done |
| 6D -- Productivity insights generation + ai_insights storage | Done |

**Files:**
- `apps/web/src/features/ai/services/prompt-builder.ts` -- buildDailyPlanPrompt, buildInsightsPrompt, buildChatSystemPrompt
- `apps/web/src/features/ai/services/ai-provider.ts` -- OpenAI/Groq abstraction via AI_PROVIDER env
- `apps/web/src/features/ai/services/cache.ts` -- getCachedInsight / saveInsight with TTL + 30-record trim
- `apps/web/src/features/ai/services/context.ts` -- buildUserContext (parallel fetch, capped context)
- `apps/web/src/app/api/v1/ai/daily-plan/route.ts` -- cache -> context -> prompt -> save -> return
- `apps/web/src/app/api/v1/ai/chat/route.ts` -- conversation history, last 10 turns
- `apps/web/src/app/api/v1/ai/insights/route.ts` -- productivity insights with caching
- `apps/web/src/app/(dashboard)/planner/page.tsx` + `daily-plan-view.tsx` -- Planner UI
- `apps/web/src/app/(dashboard)/ai/page.tsx` + `chat-interface.tsx` -- Chat UI with starter prompts

---

## Phase 7 -- Notifications

| Task | Status |
|------|--------|
| Firebase Cloud Messaging setup, task + habit reminders | Done |

---

## Phase 8 -- Deployment

| Task | Status |
|------|--------|
| Vercel setup, env vars, Supabase production config, CI/CD | Done |

---

## Phase 9 -- Bug Fixes & Hardening

| Task | Status |
|------|--------|
| 9A -- Fix `log_date` -> `date` column mismatch in dashboard_service.dart & send-reminder edge function | Done |
| 9B -- Fix task_service.dart: map TaskStatus.pending -> 'todo' for DB enum | Done |
| 9C -- Fix habit_service.dart: correct column name & onConflict key | Done |
| 9D -- Fix notification_service.dart: lazy Firebase init with try-catch | Done |
| 9E -- Fix dashboard_service.dart: individual try-catch per query, _safeCount() | Done |
| 9F -- Fix auth_bloc.dart: StreamSubscription<dynamic>, no AuthLoading in Google login | Done |
| 9G -- Fix tasks_screen.dart: BlocListener for errors, buildWhen skips error rebuilds | Done |

---

## Phase 10 -- API Infrastructure

| Task | Status |
|------|--------|
| 10A -- Pagination (offset-based, all list endpoints + mobile BLoCs) | Done |
| 10B -- Rate limiting (in-memory sliding window, 3 tiers: standard/dashboard/AI) | Done |
| 10C -- Input validation (centralized validators for strings, enums, dates, UUIDs) | Done |

**New files:**
- `apps/web/src/lib/api/rate-limit.ts` -- `withRateLimit()` wrapper, per-user per-route, auto-cleanup
- `apps/web/src/lib/api/validation.ts` -- validators + domain constants (TASK_STATUSES, etc.)
- `apps/web/src/lib/api/pagination.ts` -- `parsePagination()` query param parser
- `apps/web/src/lib/types/index.ts` -- PaginationParams, PaginatedResult<T>, ApiPaginatedResponse<T>

**Modified:** All 11 API route files, all repositories (`.range()` + `count: 'exact'`), all services (`getAll` returns `{ data, total }`), all dashboard callers (destructure `.data`)

---

## Phase 11 -- Notification Routing & Foreground Banners

| Task | Status |
|------|--------|
| 11A -- FCM tap routing (navigate to correct screen based on notification type) | Done |
| 11B -- In-app foreground notification banner (animated overlay) | Done |

**New files:**
- `apps/mobile/lib/core/widgets/in_app_banner.dart` -- animated slide-down banner with auto-dismiss

**Modified:**
- `apps/mobile/lib/core/notifications/notification_service.dart` -- `_handleTap` wired to GoRouter, `_showBanner` overlay
- `apps/mobile/lib/core/router/app_router.dart` -- `navigatorKey` for overlay access

---

## Phase 12 -- Offline Caching (Mobile)

| Task | Status |
|------|--------|
| 12A -- Cache service with TTL (SharedPreferences JSON) | Done |
| 12B -- Cache-first pattern in all mobile services | Done |
| 12C -- Offline banner widget | Done |

**New files:**
- `apps/mobile/lib/core/cache/cache_service.dart` -- `CacheService` with TTL (24h lists, 1h dashboard)
- `apps/mobile/lib/core/widgets/offline_banner.dart` -- amber "cached data" indicator

**Modified:** All mobile services (task, goal, habit, dashboard) -- cache on success, fallback to cache on failure

---

## Phase 13 -- Password Reset & Email Verification

| Task | Status |
|------|--------|
| 13A -- Forgot password screen (mobile) | Done |
| 13B -- Password reset flow in auth_bloc | Done |
| 13C -- Email verification screen (mobile) | Done |

**New files:**
- `apps/mobile/lib/features/auth/presentation/screens/forgot_password_screen.dart`
- `apps/mobile/lib/features/auth/presentation/screens/verify_email_screen.dart`

**Modified:**
- `apps/mobile/lib/features/auth/presentation/bloc/auth_bloc.dart` -- `AuthPasswordResetRequested`, `AuthDeleteAccountRequested` events
- `apps/mobile/lib/features/auth/presentation/screens/login_screen.dart` -- "Forgot password?" link

---

## Phase 14 -- Tests

| Task | Status |
|------|--------|
| 14A -- Web unit tests (vitest): services, prompt-builder, cache, errors | Done |
| 14B -- Mobile unit tests: services, BLoC, mock Supabase | Done |

**New files (web):**
- `apps/web/vitest.config.ts`
- `apps/web/src/lib/api/__tests__/errors.test.ts`
- `apps/web/src/features/tasks/services/__tests__/task.service.test.ts`
- `apps/web/src/features/goals/services/__tests__/goal.service.test.ts`
- `apps/web/src/features/habits/services/__tests__/habit.service.test.ts`
- `apps/web/src/features/ai/services/__tests__/prompt-builder.test.ts`
- `apps/web/src/features/ai/services/__tests__/cache.test.ts`

**New files (mobile):**
- `apps/mobile/test/helpers/mock_supabase.dart`
- `apps/mobile/test/features/tasks/data/task_service_test.dart`
- `apps/mobile/test/features/goals/data/goal_service_test.dart`
- `apps/mobile/test/features/habits/data/habit_service_test.dart`
- `apps/mobile/test/features/dashboard/data/dashboard_service_test.dart`
- `apps/mobile/test/features/tasks/presentation/bloc/tasks_bloc_test.dart`

**Total: 132 tests across 12 test files**

---

## Phase 15 -- Production Blockers

| Task | Status |
|------|--------|
| 15A -- Root .gitignore (prevent .env / secrets from being committed) | Done |
| 15B -- Settings / Profile page (web + mobile) | Done |
| 15C -- Account deletion with cascade (GDPR compliance) | Done |
| 15D -- Legal pages: Privacy Policy + Terms of Service (web) | Done |
| 15E -- Email confirmation flow (mobile verify screen) | Done |

**New files:**
- `.gitignore` -- comprehensive ignore rules for env, deps, build, IDE, OS, logs
- `apps/web/src/app/(dashboard)/settings/page.tsx` -- settings page
- `apps/web/src/app/(dashboard)/settings/profile-form.tsx` -- profile edit form
- `apps/web/src/app/(dashboard)/settings/security-section.tsx` -- password change
- `apps/web/src/app/(dashboard)/settings/danger-zone.tsx` -- account deletion
- `apps/web/src/app/api/v1/user/route.ts` -- GET/PUT/DELETE user API
- `apps/web/src/app/(legal)/layout.tsx` -- legal pages layout
- `apps/web/src/app/(legal)/privacy/page.tsx` -- privacy policy
- `apps/web/src/app/(legal)/terms/page.tsx` -- terms of service
- `apps/mobile/lib/features/settings/presentation/screens/settings_screen.dart`

---

## Phase 16 -- Error Handling & Infrastructure

| Task | Status |
|------|--------|
| 16A -- Environment variable validation (fail-fast on missing vars) | Done |
| 16B -- Health check endpoint | Done |
| 16C -- Error boundary + 404 page (web) | Done |
| 16D -- Global error handlers (mobile) | Done |

**New files:**
- `apps/web/src/lib/env.ts` -- `validateEnv()` with typed access, fail-fast
- `apps/web/src/app/api/health/route.ts` -- health check, tests Supabase connectivity
- `apps/web/src/app/error.tsx` -- error boundary with VitaMind branding
- `apps/web/src/app/not-found.tsx` -- custom 404 page

**Modified:**
- `apps/web/src/app/layout.tsx` -- calls `validateEnv()` at startup
- `apps/mobile/lib/main.dart` -- `ErrorWidget.builder`, `FlutterError.onError`, `PlatformDispatcher.instance.onError`

---

## Documentation Updates

| Task | Status |
|------|--------|
| DATABASE_SCHEMA.md -- full rewrite (27 lines -> comprehensive reference) | Done |
| API_CONTRACTS.md -- full rewrite (36 lines -> 19 endpoint spec) | Done |

---

## Phase 17 -- Security & CORS

| Task | Status |
|------|--------|
| 17A -- Security headers (HSTS, CSP, X-Frame-Options, etc.) | Done |
| 17B -- CORS middleware for mobile API access | Done |
| 17C -- Structured request logging (JSON, duration, user ID) | Done |

**New files:**
- `apps/web/src/lib/api/cors.ts` -- `withCors()` wrapper, origin validation, OPTIONS preflight
- `apps/web/src/lib/api/logger.ts` -- `withLogging()` wrapper, JSON structured logs

**Modified:**
- `apps/web/next.config.ts` -- security headers + CSP
- All 13 API route files -- wrapped with `withLogging(withCors(withRateLimit(...)))` + `OPTIONS` export

---

## Phase 18 -- Loading Skeletons

| Task | Status |
|------|--------|
| 18A -- Shared Skeleton component | Done |
| 18B -- Loading pages for all 7 dashboard routes | Done |

**New files:**
- `apps/web/src/components/ui/skeleton.tsx` -- `Skeleton`, `PageHeaderSkeleton`, `CardSkeleton`
- `apps/web/src/app/(dashboard)/dashboard/loading.tsx`
- `apps/web/src/app/(dashboard)/tasks/loading.tsx`
- `apps/web/src/app/(dashboard)/goals/loading.tsx`
- `apps/web/src/app/(dashboard)/habits/loading.tsx`
- `apps/web/src/app/(dashboard)/planner/loading.tsx`
- `apps/web/src/app/(dashboard)/ai/loading.tsx`
- `apps/web/src/app/(dashboard)/settings/loading.tsx`

---

## Phase 19 -- High Priority Improvements

| Task | Status |
|------|--------|
| 19A -- Users table RLS policies (DELETE policy) | Done |
| 19B -- GDPR data export endpoint (GET /api/v1/user/export) | Done |
| 19C -- Mobile bottom nav "More" menu (AI, Planner, Settings) | Done |
| 19D -- Task search filter (web client + API + mobile) | Done |

**New files:**
- `backend/supabase/migrations/003_users_rls.sql` -- DELETE policy for users table
- `apps/web/src/app/api/v1/user/export/route.ts` -- full data export (tasks, goals, habits, logs, insights)

**Modified:**
- `apps/mobile/lib/core/widgets/app_bottom_nav.dart` -- 4 tabs + "More" bottom sheet
- `apps/web/src/app/(dashboard)/tasks/task-list.tsx` -- search input + filter by title/description
- `apps/web/src/features/tasks/repositories/task.repository.ts` -- `ilike` search on title
- `apps/web/src/app/api/v1/tasks/route.ts` -- `search` query parameter
- `apps/mobile/lib/features/tasks/presentation/screens/tasks_screen.dart` -- search TextField

---

## Phase 20 -- E2E Tests

| Task | Status |
|------|--------|
| 20A -- Playwright config + auth/navigation/tasks/health tests (web) | Done |
| 20B -- Flutter integration tests (splash, login, register, bottom nav, navigation) | Done |

**New files (web):**
- `apps/web/playwright.config.ts` -- 3 browsers, 30s timeout, CI retries
- `apps/web/e2e/auth.spec.ts` -- 10 auth flow tests
- `apps/web/e2e/navigation.spec.ts` -- 9 navigation tests (sidebar, responsive, branding)
- `apps/web/e2e/tasks.spec.ts` -- 4 tasks page tests
- `apps/web/e2e/health.spec.ts` -- 4 health endpoint tests

**New files (mobile):**
- `apps/mobile/integration_test/app_test.dart` -- 14 integration tests (splash, login, register, nav)
- `apps/mobile/integration_test/navigation_test.dart` -- 8 navigation tests (More sheet, tiles)

---

## Phase 21 -- Recurring Tasks

| Task | Status |
|------|--------|
| 21A -- Database schema (recurrence_pattern enum, recurring columns) | Done |
| 21B -- Supabase edge function (cron-based spawn-recurring) | Done |
| 21C -- Web UI (recurring toggle, frequency dropdown, end date) | Done |
| 21D -- Mobile model updates (RecurrencePattern enum, Task fields) | Done |

**New files:**
- `backend/supabase/migrations/004_recurring_tasks.sql` -- recurrence_pattern enum, is_recurring, recurrence_pattern, recurrence_end_date, parent_task_id, next_occurrence
- `backend/supabase/functions/spawn-recurring/index.ts` -- cron edge function for spawning task instances

**Modified:**
- `apps/web/src/lib/types/index.ts` -- RecurrencePattern type + recurring fields on Task
- `apps/web/src/app/(dashboard)/tasks/task-create-button.tsx` -- recurring toggle UI
- `apps/mobile/lib/features/tasks/data/task_service.dart` -- RecurrencePattern enum + Task fields

---

## Phase 22 -- Calendar Integration (Google Calendar)

| Task | Status |
|------|--------|
| 22A -- Database schema (calendar_connections table) | Done |
| 22B -- OAuth connect/disconnect API routes | Done |
| 22C -- Calendar sync API (push tasks to Google Calendar) | Done |
| 22D -- Calendar settings UI section | Done |

**New files:**
- `backend/supabase/migrations/005_calendar_integration.sql` -- calendar_connections table + RLS
- `apps/web/src/app/api/v1/calendar/connect/route.ts` -- OAuth initiation
- `apps/web/src/app/api/v1/calendar/disconnect/route.ts` -- revoke + delete connection
- `apps/web/src/app/api/v1/calendar/sync/route.ts` -- push tasks to Google Calendar
- `apps/web/src/app/api/v1/calendar/status/route.ts` -- connection status check
- `apps/web/src/app/(dashboard)/settings/calendar-section.tsx` -- connect/disconnect UI

---

## Phase 23 -- Weekly Email Reports

| Task | Status |
|------|--------|
| 23A -- Database schema (email_preferences table) | Done |
| 23B -- Supabase edge function (weekly-report with Resend) | Done |
| 23C -- Notification preferences UI | Done |

**New files:**
- `backend/supabase/migrations/006_email_preferences.sql` -- email_preferences table + RLS
- `backend/supabase/functions/weekly-report/index.ts` -- cron function, HTML email via Resend
- `apps/web/src/app/(dashboard)/settings/notification-section.tsx` -- email preferences UI

---

## Phase 24 -- Accessibility Audit (WCAG 2.1 AA)

| Task | Status |
|------|--------|
| 24A -- Skip navigation + landmark roles (web) | Done |
| 24B -- ARIA labels, aria-current, aria-hidden on decorative elements | Done |
| 24C -- Focus indicators + keyboard navigation | Done |
| 24D -- Form accessibility (labels, error messages) | Done |
| 24E -- Flutter Semantics widgets (mobile) | Done |

**Modified (web):**
- `apps/web/src/app/(dashboard)/layout.tsx` -- skip-to-content link, aria-hidden on orbs, id="main-content", role="main"
- `apps/web/src/components/layout/sidebar.tsx` -- aria-label="Main navigation", aria-current="page", aria-hidden on icons, alt text on logo
- `apps/web/src/components/layout/bottom-nav.tsx` -- aria labels on nav items

---

## Phase 25 -- CI Pipeline

| Task | Status |
|------|--------|
| 25A -- GitHub Actions workflow for web (lint, test, typecheck, build) | Done |
| 25B -- GitHub Actions workflow for mobile (analyze, test, build Android + iOS) | Done |

**New files:**
- `.github/workflows/ci-web.yml` -- 4 jobs: lint, unit tests, typecheck, build (on PR/push to main, path-filtered)
- `.github/workflows/ci-mobile.yml` -- 4 jobs: analyze, unit tests, build Android, build iOS (on PR/push to main, path-filtered)

---

## Phase 26 -- Killer Feature A: Life Momentum Score

| Task | Status |
|------|--------|
| 26A -- Database schema (momentum_snapshots table) | Done |
| 26B -- Momentum service (compute + store, on-demand scoring) | Done |
| 26C -- Momentum API endpoint (GET /api/v1/momentum) | Done |
| 26D -- Momentum dashboard widget (score ring, component bars, sparkline, burnout warning) | Done |
| 26E -- Daily compute edge function (pg_cron scheduled) | Done |

**New files:**
- `backend/supabase/migrations/007_momentum_score.sql` -- momentum_snapshots table, RLS, index
- `apps/web/src/features/momentum/types.ts` -- MomentumSnapshot, MomentumResponse, MomentumComponents
- `apps/web/src/features/momentum/services/momentum.service.ts` -- getCurrentScore, getHistory, computeComponents, computeAndStore
- `apps/web/src/app/api/v1/momentum/route.ts` -- GET with trend calculation
- `apps/web/src/app/(dashboard)/dashboard/momentum-score.tsx` -- client widget with SVG ring, bars, sparkline
- `backend/supabase/functions/compute-momentum/index.ts` -- daily cron edge function

**Modified:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` -- added MomentumScore widget

---

## Phase 27 -- Killer Feature A: Time Fingerprint

| Task | Status |
|------|--------|
| 27A -- Database schema (productivity_profile JSONB on users) | Done |
| 27B -- Time fingerprint service (compute + cache with 7-day TTL) | Done |
| 27C -- Time fingerprint API endpoint (GET /api/v1/time-fingerprint) | Done |
| 27D -- Weekly compute edge function (pg_cron scheduled) | Done |
| 27E -- Settings UI section (peak hours, best window, habit patterns) | Done |
| 27F -- AI integration (momentum + fingerprint in context + prompts) | Done |

**New files:**
- `backend/supabase/migrations/008_time_fingerprint.sql` -- productivity_profile JSONB column on users
- `apps/web/src/features/time-fingerprint/services/time-fingerprint.service.ts` -- getProfile, hasEnoughData, computeProfile
- `apps/web/src/app/api/v1/time-fingerprint/route.ts` -- GET endpoint
- `backend/supabase/functions/compute-time-fingerprint/index.ts` -- weekly cron edge function
- `apps/web/src/app/(dashboard)/settings/time-fingerprint-section.tsx` -- productivity profile display

**Modified:**
- `apps/web/src/features/ai/services/context.ts` -- fetches momentum + fingerprint in parallel
- `apps/web/src/features/ai/services/prompt-builder.ts` -- includes momentum score + fingerprint data in daily plan + insights prompts
- `apps/web/src/app/(dashboard)/settings/page.tsx` -- added TimeFingerprintSection

---

## Phase 28 -- Killer Feature B: Burnout Radar

| Task | Status |
|------|--------|
| 28A -- Database schema (burnout_alerts table) | Done |
| 28B -- Burnout Radar service (multi-signal detection + AI recovery plans) | Done |
| 28C -- Burnout Radar API endpoints (GET radar + PUT acknowledge) | Done |
| 28D -- Burnout Radar dashboard widget (collapsible, signals, recovery plan) | Done |
| 28E -- AI daily plan integration (burnout-aware suggestions) | Done |

**New files:**
- `backend/supabase/migrations/009_burnout_decomposition.sql` -- burnout_alerts table + estimated_minutes/is_subtask on tasks
- `apps/web/src/features/burnout-radar/types.ts` -- BurnoutSignals, BurnoutAlert, BurnoutRadarResponse
- `apps/web/src/features/burnout-radar/services/burnout-radar.service.ts` -- detectSignals, generateRecoveryPlan, computeAndStore
- `apps/web/src/app/api/v1/burnout-radar/route.ts` -- GET + PUT endpoints
- `apps/web/src/app/(dashboard)/dashboard/burnout-radar.tsx` -- collapsible radar widget

**Modified:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` -- added BurnoutRadar widget

---

## Phase 29 -- Killer Feature B: Smart Task Decomposition

| Task | Status |
|------|--------|
| 29A -- Database schema (estimated_minutes + is_subtask columns on tasks) | Done |
| 29B -- Decomposition service (AI-powered task breakdown + subtask creation) | Done |
| 29C -- Decomposition API endpoint (POST /api/v1/tasks/decompose) | Done |
| 29D -- Task list UI (break down menu action, subtask badge, time estimates) | Done |
| 29E -- Type updates (estimated_minutes, is_subtask on Task interface) | Done |

**New files:**
- `apps/web/src/features/smart-decomposition/services/decomposition.service.ts` -- decompose, getSubtasks, updateParentProgress
- `apps/web/src/app/api/v1/tasks/decompose/route.ts` -- POST endpoint

**Modified:**
- `apps/web/src/lib/types/index.ts` -- added estimated_minutes, is_subtask to Task
- `apps/web/src/app/(dashboard)/tasks/task-list.tsx` -- "Break down" menu action, subtask badge, time estimate display

---

## Phase 30 -- Killer Feature C: Cascade Intelligence

| Task | Status |
|------|--------|
| 30A -- Database schema (habit_goal_links, cascade_events tables) | Done |
| 30B -- Cascade service (habit-goal linking, ripple detection, AI suggestions) | Done |
| 30C -- Cascade API endpoints (GET view, POST link/unlink/acknowledge/suggest) | Done |
| 30D -- Cascade alerts dashboard widget (collapsible, affected goals, suggestions) | Done |
| 30E -- Auto-suggest habit-goal links via AI | Done |

**New files:**
- `backend/supabase/migrations/010_cascade_stacking.sql` -- habit_goal_links, habit_stacks, cascade_events tables
- `apps/web/src/features/cascade-intelligence/types.ts` -- HabitGoalLink, CascadeEvent, CascadeAnalysis
- `apps/web/src/features/cascade-intelligence/services/cascade.service.ts` -- detectCascades, generateSuggestions, suggestLinks
- `apps/web/src/app/api/v1/cascade/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/dashboard/cascade-alerts.tsx` -- collapsible alert widget

**Modified:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` -- added CascadeAlerts widget

---

## Phase 31 -- Killer Feature C: Habit Stacking Engine

| Task | Status |
|------|--------|
| 31A -- Database schema (habit_stacks table) | Done |
| 31B -- Stacking service (temporal analysis, stack suggestions, bulk completion) | Done |
| 31C -- Stacking API endpoints (GET stacks+suggestions, POST create/complete/delete) | Done |
| 31D -- Habit stacks UI on habits page (active stacks, "Start stack", suggestions) | Done |
| 31E -- Habits page integration | Done |
| 31F -- Stack completion rate tracking (14-day window) | Done |

**New files:**
- `apps/web/src/features/habit-stacking/types.ts` -- HabitStack, StackWithHabits, StackSuggestion
- `apps/web/src/features/habit-stacking/services/stacking.service.ts` -- getStacks, suggestStacks, completeStack
- `apps/web/src/app/api/v1/habit-stacks/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/habits/habit-stacks.tsx` -- stacks + suggestions UI

**Modified:**
- `apps/web/src/app/(dashboard)/habits/page.tsx` -- added HabitStacks component

---

## Phase 32 -- Killer Feature D: Goal Autopilot

| Task | Status |
|------|--------|
| 32A -- Database schema (goal_plans table, autopilot_enabled on goals) | Done |
| 32B -- Autopilot service (AI task generation, weekly adjustment) | Done |
| 32C -- Autopilot API endpoints (GET status, POST enable/disable/adjust) | Done |
| 32D -- Goal Autopilot UI on goals page (toggle, plan preview, on-track status) | Done |
| 32E -- Auto-creates real tasks linked to goal with time estimates | Done |

**New files:**
- `backend/supabase/migrations/011_autopilot_patterns.sql` -- goal_plans, pattern_insights tables, autopilot_enabled column
- `apps/web/src/features/goal-autopilot/types.ts` -- GoalPlan, GeneratedTask, AutopilotStatus
- `apps/web/src/features/goal-autopilot/services/autopilot.service.ts` -- enableAutopilot, generateWeeklyPlan, adjustPlan
- `apps/web/src/app/api/v1/goal-autopilot/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/goals/goal-autopilot.tsx` -- autopilot toggle + plan preview

**Modified:**
- `apps/web/src/app/(dashboard)/goals/page.tsx` -- added GoalAutopilot component

---

## Phase 33 -- Killer Feature D: Pattern Oracle

| Task | Status |
|------|--------|
| 33A -- Database schema (pattern_insights table) | Done |
| 33B -- Oracle service (correlation analysis, keystone habit detection, day/time patterns) | Done |
| 33C -- Oracle API endpoints (GET insights, POST dismiss/refresh) | Done |
| 33D -- Patterns page with insight cards + keystone habit highlight | Done |
| 33E -- Sidebar navigation link to Patterns | Done |
| 33F -- Loading skeleton for Patterns page | Done |

**New files:**
- `apps/web/src/features/pattern-oracle/types.ts` -- PatternInsight, PatternOracleResponse
- `apps/web/src/features/pattern-oracle/services/oracle.service.ts` -- getInsights, computeInsights, dismiss
- `apps/web/src/app/api/v1/patterns/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/patterns/page.tsx` -- Patterns page
- `apps/web/src/app/(dashboard)/patterns/patterns-list.tsx` -- insight cards, keystone highlight, refresh
- `apps/web/src/app/(dashboard)/patterns/loading.tsx` -- loading skeleton

**Modified:**
- `apps/web/src/components/layout/sidebar.tsx` -- added Patterns nav item

---

## Phase 34 -- Killer Feature E: Voice Life Log

| Task | Status |
|------|--------|
| 34A -- Database schema (voice_logs table) | Done |
| 34B -- Voice Log service (AI transcript parsing, action extraction, auto-apply) | Done |
| 34C -- Voice Log API endpoints (GET recent, POST process transcript) | Done |
| 34D -- Voice Log dashboard widget (browser speech-to-text, live transcript, action results) | Done |

**New files:**
- `backend/supabase/migrations/012_voice_reviews.sql` -- voice_logs + life_reviews tables
- `apps/web/src/features/voice-log/types.ts` -- ExtractedActions, VoiceLog
- `apps/web/src/features/voice-log/services/voice-log.service.ts` -- processTranscript, getRecent
- `apps/web/src/app/api/v1/voice-log/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/dashboard/voice-log-widget.tsx` -- speech recording widget

**Modified:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` -- added VoiceLogWidget

---

## Phase 35 -- Killer Feature E: Life Review (Monthly Deep Dive)

| Task | Status |
|------|--------|
| 35A -- Database schema (life_reviews table) | Done |
| 35B -- Life Review service (cross-domain data gathering, AI report generation) | Done |
| 35C -- Life Review API endpoints (GET reviews, POST generate) | Done |
| 35D -- Reviews page (list view, detail view with stats, AI report) | Done |
| 35E -- Loading skeleton for Reviews page | Done |
| 35F -- Sidebar navigation link to Reviews | Done |

**New files:**
- `apps/web/src/features/life-review/types.ts` -- ReviewData, LifeReview
- `apps/web/src/features/life-review/services/review.service.ts` -- getReview, getAllReviews, generateReview
- `apps/web/src/app/api/v1/life-reviews/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/reviews/page.tsx` -- reviews list + detail view
- `apps/web/src/app/(dashboard)/reviews/loading.tsx` -- loading skeleton

**Modified:**
- `apps/web/src/components/layout/sidebar.tsx` -- added Reviews nav item (BookOpen icon)

---

## Phase 36 -- Killer Feature F: Focus Contracts (Deep Work Blocks)

| Task | Status |
|------|--------|
| 36A -- Database schema (focus_blocks table) | Done |
| 36B -- Focus service (AI task suggestions, start/end blocks, focus scoring) | Done |
| 36C -- Focus API endpoints (GET stats, POST suggest/start/end) | Done |
| 36D -- Focus page (timer, task selection, interruption tracking, session history) | Done |
| 36E -- Loading skeleton for Focus page | Done |
| 36F -- Sidebar navigation link to Focus | Done |

**New files:**
- `backend/supabase/migrations/013_focus_accountability.sql` -- focus_blocks, contracts, contract_checkins tables
- `apps/web/src/features/focus-contracts/types.ts` -- FocusBlock, FocusSuggestion, FocusStats
- `apps/web/src/features/focus-contracts/services/focus.service.ts` -- suggestTasks, startBlock, endBlock, getStats
- `apps/web/src/app/api/v1/focus/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/focus/page.tsx` -- focus mode page with timer + AI suggestions
- `apps/web/src/app/(dashboard)/focus/loading.tsx` -- loading skeleton

**Modified:**
- `apps/web/src/components/layout/sidebar.tsx` -- added Focus nav item (Crosshair icon)

---

## Phase 37 -- Killer Feature F: Accountability Contracts

| Task | Status |
|------|--------|
| 37A -- Database schema (contracts + contract_checkins tables) | Done |
| 37B -- Accountability service (create, auto/manual check-in, AI nudges) | Done |
| 37C -- Accountability API endpoints (GET contracts, POST create/checkin/cancel/nudge) | Done |
| 37D -- Contracts page (create form, active contracts, check-in dots, AI nudge, past contracts) | Done |
| 37E -- Loading skeleton for Contracts page | Done |
| 37F -- Sidebar navigation link to Contracts | Done |

**New files:**
- `apps/web/src/features/accountability/types.ts` -- Contract, ContractCheckin, ContractWithCheckins
- `apps/web/src/features/accountability/services/accountability.service.ts` -- create, autoCheckIn, manualCheckIn, getNudge
- `apps/web/src/app/api/v1/contracts/route.ts` -- GET + POST endpoints
- `apps/web/src/app/(dashboard)/contracts/page.tsx` -- accountability contracts page
- `apps/web/src/app/(dashboard)/contracts/loading.tsx` -- loading skeleton

**Modified:**
- `apps/web/src/components/layout/sidebar.tsx` -- added Contracts nav item (Shield icon)

---

## ALL 12 KILLER FEATURES COMPLETE (WEB)

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Life Momentum Score | 26 | Done |
| 2 | Time Fingerprint | 27 | Done |
| 3 | Burnout Radar | 28 | Done |
| 4 | Smart Task Decomposition | 29 | Done |
| 5 | Cascade Intelligence | 30 | Done |
| 6 | Habit Stacking Engine | 31 | Done |
| 7 | Goal Autopilot | 32 | Done |
| 8 | Pattern Oracle | 33 | Done |
| 9 | Voice Life Log | 34 | Done |
| 10 | Life Review | 35 | Done |
| 11 | Focus Contracts | 36 | Done |
| 12 | Accountability Contracts | 37 | Done |

---

## Phase 38 -- Mobile: All 12 Killer Features

| Task | Status |
|------|--------|
| 38A -- Data services for all 12 features (Supabase + CacheService) | Done |
| 38B -- Screens for 11 features (Smart Decomposition has no dedicated screen) | Done |
| 38C -- Router + bottom nav updated with 11 new routes | Done |
| 38D -- Dashboard enhanced with Momentum Score + Burnout Alert widgets | Done |
| 38E -- All screens pass `flutter analyze` with zero issues | Done |

**New data services (12 files):**
- `apps/mobile/lib/features/momentum/data/momentum_service.dart` -- MomentumSnapshot model, fetchCurrent/fetchHistory
- `apps/mobile/lib/features/burnout/data/burnout_service.dart` -- BurnoutAlert model with copyWith, fetchLatest/acknowledge
- `apps/mobile/lib/features/patterns/data/patterns_service.dart` -- PatternInsight model, fetchInsights/getKeystoneHabit/dismiss
- `apps/mobile/lib/features/voice_log/data/voice_log_service.dart` -- VoiceLog model, fetchRecent/submitLog
- `apps/mobile/lib/features/life_review/data/life_review_service.dart` -- LifeReview model, fetchAll/fetchByMonth
- `apps/mobile/lib/features/focus/data/focus_service.dart` -- FocusBlock model, startBlock/endBlock/getRecent/getActive
- `apps/mobile/lib/features/time_fingerprint/data/time_fingerprint_service.dart` -- ProductivityProfile model, fetchProfile
- `apps/mobile/lib/features/cascade/data/cascade_service.dart` -- CascadeEvent/HabitGoalLink models, fetchCascades/fetchLinks/acknowledge
- `apps/mobile/lib/features/habit_stacking/data/habit_stacking_service.dart` -- HabitStack model, fetchStacks/createStack/completeStack/deleteStack
- `apps/mobile/lib/features/goal_autopilot/data/goal_autopilot_service.dart` -- GoalPlan model, getAutopilotGoals/toggleAutopilot/fetchPlans
- `apps/mobile/lib/features/decomposition/data/decomposition_service.dart` -- decompose/getSubtasks
- `apps/mobile/lib/features/accountability/data/accountability_service.dart` -- Contract/ContractCheckin models, fetchAll/create/checkin/cancel/fetchCheckins

**New screens (11 files):**
- `apps/mobile/lib/features/momentum/presentation/screens/momentum_screen.dart` -- animated score ring, component breakdown, history badges
- `apps/mobile/lib/features/burnout/presentation/screens/burnout_screen.dart` -- risk score, signal list, recovery plan, acknowledge
- `apps/mobile/lib/features/patterns/presentation/screens/patterns_screen.dart` -- keystone habit, insight cards with confidence bars, dismiss
- `apps/mobile/lib/features/life_review/presentation/screens/reviews_screen.dart` -- review list, generate buttons, detail page with stats + AI report
- `apps/mobile/lib/features/focus/presentation/screens/focus_screen.dart` -- timer with countdown, duration picker, interruption counter, session history
- `apps/mobile/lib/features/voice_log/presentation/screens/voice_log_screen.dart` -- text input with mic icon, action results, recent logs
- `apps/mobile/lib/features/cascade/presentation/screens/cascade_screen.dart` -- active alerts with missed days/affected goals, habit-goal links
- `apps/mobile/lib/features/habit_stacking/presentation/screens/habit_stacks_screen.dart` -- stack cards, complete button, create bottom sheet
- `apps/mobile/lib/features/goal_autopilot/presentation/screens/goal_autopilot_screen.dart` -- autopilot toggle, progress bars, recent plans
- `apps/mobile/lib/features/time_fingerprint/presentation/screens/time_fingerprint_screen.dart` -- peak hours, best window, best/worst days, habit rates
- `apps/mobile/lib/features/accountability/presentation/screens/contracts_screen.dart` -- create form, active contracts with 14-day check-in dots, streak, cancel

**Modified:**
- `apps/mobile/lib/core/router/app_router.dart` -- 11 new route constants + GoRoute entries
- `apps/mobile/lib/core/widgets/app_bottom_nav.dart` -- scrollable "More" sheet with 14 tiles for all features
- `apps/mobile/lib/features/dashboard/presentation/screens/dashboard_screen.dart` -- Momentum + Burnout widgets, parallel data fetching

---

## ALL 12 KILLER FEATURES COMPLETE (WEB + MOBILE)

| # | Feature | Web | Mobile |
|---|---------|-----|--------|
| 1 | Life Momentum Score | Done | Done |
| 2 | Time Fingerprint | Done | Done |
| 3 | Burnout Radar | Done | Done |
| 4 | Smart Task Decomposition | Done | Done (service only) |
| 5 | Cascade Intelligence | Done | Done |
| 6 | Habit Stacking Engine | Done | Done |
| 7 | Goal Autopilot | Done | Done |
| 8 | Pattern Oracle | Done | Done |
| 9 | Voice Life Log | Done | Done |
| 10 | Life Review | Done | Done |
| 11 | Focus Contracts | Done | Done |
| 12 | Accountability Contracts | Done | Done |

---

## Phase 39 -- Launch Prep & Deployment

| Task | Status |
|------|--------|
| 39A -- FCM V1 migration (Legacy API -> OAuth2 service account JWT) | Done |
| 39B -- Firebase project setup (vitamind-d72ad) + Android Gradle config | Done |
| 39C -- Sentry error monitoring setup (web + mobile scaffolding) | Done |
| 39D -- PostHog analytics setup (web + mobile scaffolding) | Done |
| 39E -- Vercel deployment (vercel.json fix, Next.js update, env vars) | Done |
| 39F -- Supabase secrets (FCM_SERVICE_ACCOUNT) | Done |
| 39G -- Google Calendar OAuth credentials setup | Done |
| 39H -- Supabase Edge Functions deployment | Done |

**FCM V1 Migration:**
- `backend/supabase/functions/_shared/send-notification.ts` -- rewritten: FCM V1 with JWT-based OAuth2
- `backend/supabase/functions/send-reminder/index.ts` -- removed FCM_SERVER_KEY, 3-param signature
- `backend/supabase/functions/compute-momentum/index.ts` -- FCM_SERVICE_ACCOUNT check

**Sentry (web):**
- `apps/web/sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `apps/web/next.config.ts` -- wrapped with withSentryConfig()

**PostHog (web):**
- `apps/web/src/lib/posthog.ts` -- trackEvent, identifyUser, AnalyticsEvents
- `apps/web/src/components/providers/analytics-provider.tsx`

**Mobile monitoring/analytics scaffolding:**
- `apps/mobile/lib/core/monitoring/sentry_service.dart`
- `apps/mobile/lib/core/analytics/analytics_service.dart`

**Deployment:**
- `apps/web/vercel.json` -- removed @secret references
- `.gitignore` -- added Firebase keys, google-services.json
- `apps/web/src/lib/env.ts` -- added Sentry + PostHog optional vars

---

## Phase 40 -- External Service Integration Status

| Service | Status | Notes |
|---------|--------|-------|
| Supabase (DB + Auth) | Active | Project: qogkvngpcmrdbrkgxbow |
| Vercel (Web hosting) | Active | vitamind-woad.vercel.app |
| Firebase (FCM) | Active | Project: vitamind-d72ad |
| Sentry (Error monitoring) | Active | DSN configured in Vercel |
| PostHog (Analytics) | Active | API key configured in Vercel |
| Google Calendar OAuth | Configured | Credentials set in Vercel |
| Resend / SendGrid (Email) | Pending | Need API key for weekly reports |
| Razorpay (Payments) | Deferred | For accountability contract stakes (UPI, net banking, cards) |

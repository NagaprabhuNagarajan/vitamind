# VitaMind -- Build Progress

> Last updated: 2026-03-09 | 283 features complete

## Summary

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 283   | 283       | 0           | 0       |

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
| Vercel (Web hosting) | Active | vitamind-ai.vercel.app |
| Firebase (FCM) | Active | Project: vitamind-d72ad |
| Sentry (Error monitoring) | Active | DSN configured in Vercel |
| PostHog (Analytics) | Active | API key configured in Vercel |
| Google Calendar OAuth | Configured | Credentials set in Vercel |
| Resend / SendGrid (Email) | Pending | Need API key for weekly reports |
| Razorpay (Payments) | Deferred | For accountability contract stakes (UPI, net banking, cards) |

---

## Phase 41 -- Life Timeline (Sprint 3)

- [x] Created `backend/supabase/migrations/014_life_timeline.sql` -- life_event_type enum, life_events table, RLS policies, GIN index for full-text search, auto-populate triggers (task completed, goal achieved, habit streak milestones)
- [x] Created `apps/web/src/app/api/v1/timeline/route.ts` -- GET (paginated, filterable by type/date) + POST (create manual note/milestone events)
- [x] Created `apps/web/src/app/api/v1/timeline/search/route.ts` -- GET full-text search on event titles
- [x] Created `apps/web/src/app/api/v1/timeline/[id]/route.ts` -- DELETE manual events (notes/milestones only)
- [x] Created `apps/web/src/app/(dashboard)/timeline/page.tsx` -- chronological feed with date grouping, filter chips (All/Tasks/Goals/Habits/Milestones/Notes), search bar, "Add life event" form (Note/Milestone types), swipe-to-delete for manual entries
- [x] Added Timeline to sidebar navigation (`apps/web/src/components/layout/sidebar.tsx`)
- [x] Created `apps/mobile/lib/features/timeline/` -- data models, service, BLoC, timeline screen with filters/search/create/delete
- [x] Added Timeline tab to mobile bottom navigation

**Files created/modified:** 8 files

---

## Phase 42 -- Life Map (Sprint 4)

- [x] Created `backend/supabase/migrations/015_life_map_domain.sql` -- life_domain enum (health, career, relationships, finance, learning, personal), added domain column to goals table
- [x] Created `apps/web/src/app/api/v1/life-map/route.ts` -- GET endpoint computing per-domain weighted scores (goals 50%, tasks 30%, habits 20%), overall life score, template-based insights
- [x] Created `apps/web/src/app/(dashboard)/life-map/page.tsx` -- SVG hexagonal radar chart, domain cards with progress bars, expandable active goals, template insights, overall life score
- [x] Added Life Map to sidebar navigation
- [x] Created `apps/mobile/lib/features/life_map/` -- data models, service, screen with CustomPainter radar chart, domain cards
- [x] Added Life Map tab to mobile bottom navigation

**Files created/modified:** 7 files

---

## Phase 43 -- Calendar Two-Way Sync

- [x] Created `apps/web/src/app/api/v1/calendar/import/route.ts` -- POST endpoint to pull Google Calendar events (next 7 days) and create VitaMind tasks, duplicate detection via calendar_event_id
- [x] Updated `apps/web/src/app/(dashboard)/settings/calendar-section.tsx` -- added "Import events" button alongside "Sync tasks", fixed "Synced 0 of undefined tasks" by using message field
- [x] Updated `apps/mobile/lib/features/settings/presentation/widgets/calendar_settings_tile.dart` -- added sync and import buttons with Dio API calls, loading states

**Files created/modified:** 3 files

---

## Phase 44 -- Subtask Cascade Delete

- [x] Updated `apps/web/src/features/tasks/services/task.service.ts` -- delete method now cascades to subtasks first
- [x] Created `apps/web/src/features/tasks/repositories/task.repository.ts` -- added deleteSubtasks method
- [x] Updated `apps/mobile/lib/features/tasks/data/task_service.dart` -- delete cascades subtasks before parent
- [x] Updated `apps/mobile/lib/features/tasks/presentation/bloc/tasks_bloc.dart` -- local state removal filters out subtasks

**Files modified:** 4 files

---

## Phase 45 -- Bug Fixes & UI Improvements

- [x] Fixed radar chart cropping in Life Map -- increased CHART_SIZE from 320 to 400 (`life-map/page.tsx`)
- [x] Fixed Voice Log hydration mismatch -- moved `supportsRecognition` check from render-time to useEffect/useState pattern (`voice-log-widget.tsx`)
- [x] Added explicit microphone permission request via getUserMedia before SpeechRecognition (`voice-log-widget.tsx`)
- [x] Fixed calendar sync "Synced 0 of undefined tasks" -- use API message field with fallback (`calendar-section.tsx`)

**Files modified:** 3 files

---

## Phase 46 -- Documentation Updates

- [x] Updated `docs/FEATURES.md` -- added Life Timeline, Life Map (both marked complete), calendar import, subtask cascade, 35+ API endpoints
- [x] Updated `docs/API_CONTRACTS.md` -- added 7 new endpoints (calendar sync/import, timeline CRUD+search, life-map)
- [x] Updated `docs/DATABASE_SCHEMA.md` -- added life_event_type and life_domain enums, life_events table, goals.domain column, triggers, indexes
- [x] Updated `docs/ROADMAP.md` -- marked Phase K (Life Timeline + Life Map) as complete
- [x] Updated `docs/UI_UX_FLOW.md` -- added Life Timeline and Life Map screens, updated Settings with calendar sync/import
- [x] Updated `PROGRESS.md` -- added phases 41-46, updated total count

**Files modified:** 6 files

---

## Phase 47 -- Mobile Sentry & PostHog Activation

- [x] Rewrote `apps/mobile/lib/core/monitoring/sentry_service.dart` -- activated Sentry SDK (was commented-out stub), init with DSN, captureException wired up
- [x] Rewrote `apps/mobile/lib/core/analytics/analytics_service.dart` -- activated PostHog SDK (was commented-out stub), fixed `Map<String, Object>?` type for PostHog API
- [x] Updated `apps/mobile/lib/main.dart` -- added SentryService.init, PostHog init, FlutterError.onError + PlatformDispatcher.onError hooks for Sentry capture
- [x] Updated `apps/mobile/.env` -- added SENTRY_DSN, POSTHOG_KEY, POSTHOG_HOST placeholders

**Files modified:** 4 files

---

## Phase 48 -- Mobile Speech-to-Text (Voice Log)

- [x] Added `speech_to_text: ^7.0.0` to `apps/mobile/pubspec.yaml`
- [x] Rewrote `apps/mobile/lib/features/voice_log/presentation/screens/voice_log_screen.dart` -- real-time speech recognition via SpeechToText, tap mic to start/stop, auto-stop after 30s or 3s silence, pulsing red animation while recording
- [x] Added `RECORD_AUDIO` and `INTERNET` permissions to `apps/mobile/android/app/src/main/AndroidManifest.xml`
- [x] Added `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` to `apps/mobile/ios/Runner/Info.plist`

**Files modified:** 4 files

---

## Phase 49 -- Kotlin Build Fix

- [x] Updated `apps/mobile/android/build.gradle.kts` -- added KotlinCompile language/api version override to 1.9 (posthog_flutter uses 1.6 which Kotlin 2.2.20 dropped)

**Files modified:** 1 file

---

## Phase 50 -- Cascade Intelligence & Goal Autopilot UI Visibility

- [x] Created `apps/web/src/app/(dashboard)/goals/cascade-section.tsx` -- full Cascade Intelligence management UI: view/remove habit-goal links, AI-suggested links with accept, manual link form with dropdowns
- [x] Updated `apps/web/src/app/(dashboard)/goals/page.tsx` -- added HabitService import, parallel habit fetch, CascadeSection component with habit/goal options
- [x] Updated `apps/web/src/app/(dashboard)/goals/goal-list.tsx` -- added autopilot toggle button (Rocket icon) on each goal card, calls `/api/v1/goal-autopilot` POST to enable/disable

**Files created/modified:** 3 files

---

## Phase 51 -- dotenv Initialization Order Fix

- [x] Fixed `apps/mobile/lib/main.dart` -- moved `dotenv.load()` before all service initializations (was causing NotInitializedError when Sentry/PostHog tried to read env vars)

**Files modified:** 1 file

---

## Phase 52 -- Mobile Calendar Sync/Import Fix

- [x] Fixed `apps/mobile/.env` -- `API_BASE_URL` changed from `http://localhost:3003` to `https://vitamind-ai.vercel.app` (mobile was hitting localhost, unreachable on device)
- [x] Fixed `apps/web/src/lib/api/auth-guard.ts` -- `requireAuth()` now checks `Authorization: Bearer` header first, falls back to cookie session; all 37 API routes now work from mobile app without any other changes

**Files modified:** 2 files

---

## Phase 53 -- Settings Sign-Out Dialog

- [x] Updated `apps/mobile/lib/features/settings/presentation/screens/settings_screen.dart` -- added `_showLogoutDialog()` with the same confirmation dialog as dashboard (red logout icon, Cancel + Sign out buttons), wired up Sign out tile to call it instead of firing logout directly

**Files modified:** 1 file

---

## Phase 54 -- Task Due Time (Google Calendar-style)

- [x] Created `backend/supabase/migrations/016_task_due_time.sql` -- adds `due_time TIME` nullable column to tasks table (backward compatible); composite index on `(user_id, due_date, due_time)`
- [x] Updated `apps/web/src/lib/types/index.ts` -- added `due_time: string | null` to `Task` interface
- [x] Updated `apps/web/src/features/tasks/types.ts` -- added `due_time` to `CreateTaskInput` and `UpdateTaskInput`
- [x] Updated `apps/web/src/lib/utils/index.ts` -- added `formatTime()` helper (HH:MM 24hr → "2:30 PM")
- [x] Updated `apps/web/src/app/api/v1/tasks/route.ts` -- validates and stores `due_time` on create
- [x] Updated `apps/web/src/app/api/v1/tasks/[id]/route.ts` -- validates and stores `due_time` on update
- [x] Updated `apps/web/src/app/(dashboard)/tasks/task-create-button.tsx` -- added `<input type="time">` field below date picker
- [x] Updated `apps/web/src/app/(dashboard)/tasks/task-list.tsx` -- shows time alongside date (e.g. "Mar 10, 2026 · 2:30 PM")
- [x] Updated `apps/mobile/lib/features/tasks/data/task_service.dart` -- `dueTime` field on `Task` model, `fromMap`, `copyWith`, `toMap`, `create()`
- [x] Updated `apps/mobile/lib/features/tasks/presentation/bloc/tasks_bloc.dart` -- `dueTime` in `TaskCreateRequested` event and `_onCreate` handler
- [x] Updated `apps/mobile/lib/features/tasks/presentation/screens/tasks_screen.dart` -- side-by-side Date/Time pickers using `showTimePicker()`, time shown in task cards, `_formatTaskTime()` top-level helper

**Files created/modified:** 11 files

**Requires manual action:** Apply migration `016_task_due_time.sql` in Supabase dashboard SQL editor.

---

## Phase 55 -- Phase H: Behavioral Trend Analysis

- [x] Created `apps/web/src/features/behavioral-trends/services/trends.service.ts` -- `BehavioralTrendsService.getAnalysis()` fetches 90 days of `momentum_snapshots`, groups into ISO weeks, computes weekly averages (score, task_velocity, habit_consistency, goal_trajectory, overdue_pressure, burnout_risk), finds trend direction (improving/declining/stable) per component by comparing first-half vs second-half weekly averages, returns best/worst weeks
- [x] Created `apps/web/src/app/api/v1/behavioral-trends/route.ts` -- `GET /api/v1/behavioral-trends` endpoint (dashboard rate tier, requireAuth)
- [x] Created `apps/web/src/app/(dashboard)/behavioral-trends/page.tsx` -- server page with redirect guard and PageHeader
- [x] Created `apps/web/src/app/(dashboard)/behavioral-trends/trends-view.tsx` -- client component with: overall trend banner (color-coded improving/stable/declining), interactive weekly bar chart with hover tooltips, component trends breakdown (Task Velocity, Habit Consistency, Goal Trajectory, Burnout Risk) with mini sparklines, best/worst week highlight cards, weekly detail table (reversed, newest first)
- [x] Created `apps/web/src/app/(dashboard)/behavioral-trends/loading.tsx` -- skeleton loading state
- [x] Updated `apps/web/src/components/layout/sidebar.tsx` -- added `TrendingUp` import and "Trends" nav item → `/behavioral-trends`
- [x] Created `apps/mobile/lib/features/behavioral_trends/data/behavioral_trends_service.dart` -- `BehavioralTrendsService.fetchTrends()` calls `GET /api/v1/behavioral-trends` with Bearer auth, cached 4 hours; `WeekSummary`, `ComponentTrend`, `BehavioralTrendsResult`, `TrendDirection` models
- [x] Created `apps/mobile/lib/features/behavioral_trends/presentation/screens/behavioral_trends_screen.dart` -- full Flutter screen: overall trend banner, weekly bar chart (color-coded), component trend rows, best/worst week highlight cards, weekly breakdown table

**Files created/modified:** 8 files

---

## Phase 56 -- Phase H: Smart Scheduling

- [x] Created `apps/web/src/app/api/v1/smart-schedule/route.ts` -- `POST /api/v1/smart-schedule` endpoint: accepts `{title, priority, date?, estimated_minutes?}`, fetches Time Fingerprint + Google Calendar events for the date, calls AI to generate 3 optimal time slot suggestions (avoids calendar conflicts, uses peak hours for high-priority tasks), returns `{slots: [{time, label, reason}], used_fingerprint, used_calendar}` with graceful fallback
- [x] Updated `apps/web/src/app/(dashboard)/tasks/task-create-button.tsx` -- added `TimeSlot` interface, `suggestTime()` async method, controlled `dueTime`/`dueDate` state, "Suggest time" button with `Sparkles` icon next to time label, inline slot suggestion chips (click to apply), `Spinner` while loading
- [x] Created `apps/mobile/lib/features/smart_schedule/data/smart_schedule_service.dart` -- `SmartScheduleService.suggestSlots()` calls `POST /api/v1/smart-schedule` with Bearer auth; `TimeSlot`, `SmartScheduleResult` models
- [x] Updated `apps/mobile/lib/features/tasks/presentation/screens/tasks_screen.dart` -- added `SmartScheduleService` import, `_suggestingTime`/`_timeSlots` state, `_suggestTime()` method, "Suggest time" `TextButton` below date/time row, time slot chips (Wrap layout) that auto-apply the selected time and clear suggestions

**Files created/modified:** 4 files

---

## Phase 57 -- Phase H: AI Productivity Coaching (Pattern Oracle enrichment)

- [x] Updated `apps/web/src/features/ai/services/context.ts` -- added `PatternOracleService` + `PatternInsight` imports; `buildUserContext()` now also fetches pattern insights via `PatternOracleService.getInsights()` in the parallel Promise.all; returned context includes `patterns: PatternInsight[]` and `keystoneHabit`
- [x] Updated `apps/web/src/features/ai/services/prompt-builder.ts` -- added `PatternInsight` import; `UserContext` interface extended with `patterns?` and `keystoneHabit?`; `buildChatSystemPrompt()` now builds a `patternsBlock` (top 4 pattern titles + descriptions, keystone habit callout) appended to the system prompt; coaching guidelines extended with "reference specific patterns" and "encourage keystone habit consistency"

**Files created/modified:** 2 files

---

## Phase 58 -- Phase I: Financial Tracking

| Task | Status |
|------|--------|
| `financial_entries` DB table + RLS | Done |
| `FinanceService` (getEntries, addEntry, deleteEntry, getMonthlySummary) | Done |
| `GET /api/v1/finance` — list entries + monthly summary + categories | Done |
| `POST /api/v1/finance` — add income/expense entry | Done |
| `DELETE /api/v1/finance/[id]` — delete entry | Done |
| Web: `/finance` page with income/expense list, monthly summary cards, category breakdown bar chart | Done |
| Mobile: `FinanceScreen` with summary cards, category breakdown, swipe-to-delete entries | Done |

---

## Phase 59 -- Phase I: Health Tracking

| Task | Status |
|------|--------|
| `health_entries` DB table + RLS (unique per user+date) | Done |
| `HealthService` (getEntries, upsertEntry, getInsights with trends + streak) | Done |
| `GET /api/v1/health` — entries + insights (avg sleep/steps/mood/exercise, trends, streak) | Done |
| `POST /api/v1/health` — upsert daily health entry | Done |
| Web: `/health` page with insight cards, tracking streak, full entry log | Done |
| Mobile: `HealthScreen` with grid insights, streak, mood selector, stat chips | Done |

---

## Phase 60 -- Phase I: Automation Rules

| Task | Status |
|------|--------|
| `automation_rules` DB table + RLS | Done |
| `AutomationsService` (getRules, createRule, updateRule, deleteRule, evaluateRules) | Done |
| Rule evaluation engine: task_overdue, momentum_low, burnout_high, habit_streak_broken, goal_deadline_approaching | Done |
| Actions: create_task, send_notification, webhook | Done |
| `GET /api/v1/automations` — list rules + labels | Done |
| `POST /api/v1/automations` — create rule | Done |
| `PUT /api/v1/automations/[id]` — update rule (toggle active, config) | Done |
| `DELETE /api/v1/automations/[id]` — delete rule | Done |
| Web: `/automations` page with toggle switch, create modal, rule cards | Done |
| Mobile: `AutomationsScreen` with swipe-to-delete, toggle switch, create sheet | Done |

---

## Phase 61 -- Phase I: Cross-Domain AI Insights

| Task | Status |
|------|--------|
| `GET /api/v1/cross-domain` — AI analysis correlating finance + health + productivity | Done |
| Prompt: finds correlations across domains, identifies highest-leverage action | Done |
| 6-hour cache via ai_insights table | Done |
| Returns: insights array, top_leverage message, finance_summary, health_insights | Done |

---

## Phase 62 -- Phase L: AI Life Coach

### Goal
Replace generic AI chat with a **proactive, data-backed coaching report** generated from the user's own behavioural data — tasks, habits, momentum, burnout risk, health trends, and time fingerprint. No user prompt required. The coach surfaces what matters most, unprompted.

### Architecture

**Service:** `apps/web/src/features/life-coach/services/life-coach.service.ts`

`LifeCoachService.generateReport(userId, force?)` is the core method. It:

1. Checks `ai_insights` table for a cached report (`insight_type = 'life_coach'`) less than 24 hours old — returns it immediately if valid and `force` is not set
2. Fetches 7 data sources **in parallel** via `Promise.all`:
   - Recent tasks (last 50: title, status, priority, due_date, completed_at)
   - Active habits + last 30 days of habit logs (to compute streaks and miss rates)
   - Current momentum score + burnout risk (`MomentumService.getCurrentScore`)
   - Pattern Oracle insights + keystone habit (`PatternOracleService.getInsights`)
   - Last 7 days of health entries (sleep, steps, exercise, mood)
   - Time fingerprint (peak hours, low-energy hours, from `users.productivity_profile`)
3. Computes derived metrics inline:
   - `completionRate`: completed tasks / total tasks (last 50)
   - `overdueTasks`: tasks past due_date and not completed
   - `habitStreaks`: per-habit consecutive-day streak calculated from log dates
   - `missedHabits`: habits where completion rate < 50% over 30 days
   - `avgSleep`, `avgMood` from health entries
4. Builds a detailed prompt (≈600 tokens) that includes all derived data and instructs the AI to return **4–5 coaching insights** as a JSON object

**Prompt structure:**
```
User Data Summary:
- Tasks: X completed of Y (last 30 days). Overdue: Z.
- Habits: [habit name]: X-day streak, X% completion over 30 days
- Momentum: 72/100 | Burnout risk: 38/100
- Key patterns: [pattern titles from Pattern Oracle]
- Keystone habit: meditation
- Health (7d avg): sleep 6.8h, mood 3.4/5, exercise 22min/day
- Peak hours: 9, 10, 11 | Low-energy: 14, 15

Generate 4-5 specific, data-backed coaching insights...
Return JSON: { summary, focus_this_week, insights: [{title, observation, action, impact, domain, urgency}] }
```

5. Parses the AI response, validates it, and upserts to `ai_insights` with 24-hour TTL

**API:** `apps/web/src/app/api/v1/ai/life-coach/route.ts`
- `GET /api/v1/ai/life-coach` — returns cached or freshly generated report
- `GET /api/v1/ai/life-coach?force=true` — bypasses cache and regenerates
- Rate limited to `RateLimitTier.ai`

### Response Shape

```ts
{
  summary: string               // 2-3 sentence overall coaching summary
  focus_this_week: string       // Single highest-priority focus
  insights: Array<{
    title: string               // Short, action-oriented headline
    observation: string         // What the data shows (specific numbers)
    action: string              // Concrete recommended action
    impact: string              // Expected outcome if action is taken
    domain: string              // 'health' | 'productivity' | 'habits' | 'finance' | 'mindset' | 'goals'
    urgency: 'high' | 'medium' | 'low'
  }>
  generated_at: string          // ISO timestamp
}
```

### Web UI: `/life-coach`

**Files:** `apps/web/src/app/(dashboard)/life-coach/page.tsx` + `life-coach-view.tsx`

- Page header with "Generated at" timestamp and **Regenerate** button (calls `?force=true`, shows spinner)
- **Summary card**: gradient background (indigo→purple), displays `summary` + `focus_this_week` block
- **Insight cards**: one card per insight
  - Domain icon (Heart=health, Zap=productivity, TrendingUp=habits, DollarSign=finance, Brain=mindset, Flame=goals)
  - Urgency badge: red=high, yellow=medium, green=low
  - `observation` text (full width)
  - Side-by-side mini-blocks: **Action** + **Impact**
- Loading state: centered spinner + "Analysing your data…" message
- Error state: red alert card with message

### Mobile: `LifeCoachScreen`

**Files:**
- `apps/mobile/lib/features/life_coach/data/life_coach_service.dart` — `LifeCoachService.getReport({force})`; maps API response to `CoachReport` + `CoachingInsight` models
- `apps/mobile/lib/features/life_coach/presentation/screens/life_coach_screen.dart`

Screen layout:
- `AppBar` with refresh icon button (`?force=true` on tap, shows `CircularProgressIndicator` while regenerating)
- Generated timestamp subtitle
- **Summary card**: gradient container (indigo→purple tint), summary text + focus-this-week block with divider
- **Insight cards**: domain icon in rounded container, urgency chip (color-coded), observation text, two `_miniBlock` widgets side-by-side for action + impact
- Pull-to-refresh triggers force regeneration
- Loading: centered spinner + label; Error: red text

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/life-coach/services/life-coach.service.ts` | NEW — full service |
| `apps/web/src/app/api/v1/ai/life-coach/route.ts` | NEW — GET endpoint |
| `apps/web/src/app/(dashboard)/life-coach/page.tsx` | NEW — page wrapper |
| `apps/web/src/app/(dashboard)/life-coach/life-coach-view.tsx` | NEW — full UI |
| `apps/mobile/lib/features/life_coach/data/life_coach_service.dart` | NEW — service + models |
| `apps/mobile/lib/features/life_coach/presentation/screens/life_coach_screen.dart` | NEW — full screen |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Life Coach nav item (`BrainCog` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — added `Routes.lifeCoach` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — added Life Coach tile to More sheet |

---

## Phase 63 -- Phase L: AI Life Companion

### Goal
A **relationship-style AI**, distinct from the productivity-focused AI Assistant. The companion remembers who the user is, grows with them over time, provides emotional support, and is seasonally and time-of-day aware. Unlike AI chat (stateless, context from dashboard data), the companion has **persistent memory** — a database-backed personality profile that evolves after every conversation.

### Memory System

**DB Table:** `companion_memory` (from `backend/supabase/schema.sql`)

```sql
CREATE TABLE companion_memory (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  memory_key  TEXT NOT NULL,  -- 'personality' | 'seasonal' | 'struggles' | 'victories' | 'preferences'
  content     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, memory_key)
);
```

Five memory keys, each holding 1–3 sentences:
- `personality` — inferred communication style and personality traits
- `seasonal` — what this time of year typically means for this user
- `struggles` — recurring challenges observed from their data
- `victories` — wins and milestones worth acknowledging
- `preferences` — what the user cares about most (domains, focus areas)

**Service:** `apps/web/src/features/companion/services/companion.service.ts`

Four static methods:

**`getMemory(userId)`**
- Reads all rows from `companion_memory` for this user
- Returns `Partial<CompanionMemory>` object keyed by memory key

**`updateMemory(userId, key, content)`**
- Upserts to `companion_memory` on conflict `(user_id, memory_key)`
- Automatically updates `updated_at`

**`initialiseMemoryIfEmpty(userId)`**
- Called on every companion chat load (safe to call repeatedly — skips if ≥ 3 keys already exist)
- Fetches user's name, member-since date, recent task titles, top Pattern Oracle insights, and momentum score **in parallel**
- Builds an AI prompt asking for all 5 memory keys as JSON
- Parses response and upserts each key
- On AI failure: falls back to two hardcoded defaults (personality + seasonal) so the companion is never blank

**`buildSystemPrompt(userId, userName)`**
- Reads memory via `getMemory()`
- Computes time-of-day (`morning` / `afternoon` / `evening`) from current hour
- Gets current month name
- Returns a rich system prompt:

```
You are VitaMind Companion, a warm and emotionally intelligent AI life companion for {name}.
It is currently {timeOfDay} in {month}.

What you know about {name}:
Personality: Goal-oriented and self-improving. Prefers direct, actionable advice.
Seasonal: January is typically a time of high motivation and fresh starts for this user.
Struggles: Tends to overcommit in early months; burnout risk rises in Q1.
Victories: Completed 47 tasks last month; maintained gym habit for 14 days straight.
Preferences: Deeply values health and career growth above other domains.

Your role:
- Be a trusted companion, not just a productivity tool
- Reference what you know about them naturally (not robotically)
- Provide emotional support when they seem stressed or struggling
- Celebrate their wins genuinely
- Be seasonally aware — acknowledge how {month} feels and what it brings
- Ask follow-up questions to deepen your understanding
- When appropriate, update your understanding of them based on what they share

Tone: Warm, honest, insightful. Like a wise friend who genuinely knows you.
```

**`updateMemoryFromConversation(userId, messages)`**
- Called **after** each AI reply (fire-and-forget, non-blocking)
- Skips if fewer than 4 messages (not enough context to learn from)
- Takes last 10 messages from conversation
- Sends to AI: "identify NEW insights that should update companion memory. Only include if meaningfully new."
- Response is a partial JSON — only updates keys where something new was learned
- Silently swallows errors (non-critical)

### API: `POST /api/v1/ai/companion`

**File:** `apps/web/src/app/api/v1/ai/companion/route.ts`

Flow:
1. `requireAuth()` — validate session
2. Parse + validate `messages[]` array (max 20 messages, max 4000 chars each)
3. Fetch user's name from `users` table
4. `CompanionService.initialiseMemoryIfEmpty(userId)` — no-op if already set
5. `CompanionService.buildSystemPrompt(userId, userName)` — personalised prompt with memory
6. `complete({ messages: [system, ...last12messages], maxTokens: 600, temperature: 0.75 })` — slightly warmer temperature than AI chat (0.7) for more natural emotional responses
7. Fire-and-forget: `CompanionService.updateMemoryFromConversation(userId, allMessages)` — does not block the response
8. Return `{ message: { role, content }, timestamp }`

Rate limited to `RateLimitTier.ai`.

### Web UI: `/companion`

**Files:** `apps/web/src/app/(dashboard)/companion/page.tsx` + `companion-chat.tsx`

Visually distinct from AI Chat (which uses primary/indigo):
- **Purple-themed** (`#A855F7` secondary colour) — heart icon instead of sparkles
- Avatar: small heart circle next to each assistant bubble
- Assistant bubbles: purple-tinted background (`rgba(168,85,247,0.08)`) with purple border
- Send button: purple gradient
- Empty state: explains the companion remembers the user and grows over time
- Starter prompts: emotionally oriented ("How am I doing lately?", "I'm feeling overwhelmed today", "Help me reflect on this week")

### Mobile: `CompanionScreen`

**Files:**
- `apps/mobile/lib/features/companion/data/companion_service.dart` — `CompanionService.sendMessage(history, text)`; maps history to API format, returns `CompanionMessage`
- `apps/mobile/lib/features/companion/presentation/screens/companion_screen.dart`

Screen mirrors `AiScreen` architecture but with:
- Heart icon instead of sparkles in avatar + empty state
- Purple gradient send button (instead of indigo)
- `focusedBorder` in input uses `AppColors.secondary` (purple) instead of `AppColors.primary`
- Bubble border/background uses `AppColors.secondary` tints
- Calls `POST /api/v1/ai/companion` instead of `/ai/chat`
- Includes `_TypingDots` animated widget (same as AiScreen)

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/companion/services/companion.service.ts` | NEW — full service with memory |
| `apps/web/src/app/api/v1/ai/companion/route.ts` | NEW — POST endpoint |
| `apps/web/src/app/(dashboard)/companion/page.tsx` | NEW — page wrapper |
| `apps/web/src/app/(dashboard)/companion/companion-chat.tsx` | NEW — purple-themed chat UI |
| `apps/mobile/lib/features/companion/data/companion_service.dart` | NEW — service + models |
| `apps/mobile/lib/features/companion/presentation/screens/companion_screen.dart` | NEW — full screen |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Companion nav item (`UserCircle2` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — added `Routes.companion` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — added Life Companion tile to More sheet |
| `backend/supabase/schema.sql` | MODIFIED — added `companion_memory` table + RLS |
| `docs/ROADMAP.md` | MODIFIED — Phase L marked Complete |
| `docs/FEATURES.md` | MODIFIED — Features 14 + 22 marked Complete |

---

## Phase 64 -- Phase M: Decision Engine

### Goal
Give users structured, AI-backed analysis for any personal or professional decision. Not a generic chatbot answer — a structured evaluation of each option against the user's **actual goals, momentum, and behavioural patterns**, saved to history for future reference.

### Architecture

**DB Table:** `decisions` (appended to `backend/supabase/schema.sql`)
```sql
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
RLS: users manage only their own rows.

**Service:** `apps/web/src/features/decisions/services/decisions.service.ts`

`DecisionEngineService.analyze(userId, question, options[])`:
1. Fetches 3 data sources in parallel: active goals (title, progress, domain), current momentum score + burnout risk, top 3 Pattern Oracle insights
2. Builds a prompt with all options and full user context injected
3. AI evaluates each option and returns structured JSON:

```ts
{
  recommendation: string
  options_analysis: [{
    option: string
    pros: string[]
    cons: string[]
    goal_alignment: number    // 0-100
    risk_level: 'low'|'medium'|'high'
    effort_required: 'low'|'medium'|'high'
  }]
  key_considerations: string[]
  confidence: 'high'|'medium'|'low'
}
```
4. Inserts decision + analysis into `decisions` table and returns the full row

`getHistory(userId, limit?)` — decisions ordered by `created_at DESC`

`deleteDecision(userId, id)` — hard delete with user ownership check

**API Routes:**
- `GET /api/v1/decisions` — list history (`RateLimitTier.standard`)
- `POST /api/v1/decisions` — analyse; validates 2–5 non-empty options, question 5–500 chars (`RateLimitTier.ai`)
- `DELETE /api/v1/decisions/[id]` — delete (`RateLimitTier.standard`)

### Web UI: `/decisions`

**Files:** `apps/web/src/app/(dashboard)/decisions/page.tsx` + `decisions-view.tsx`

- Form: question textarea + dynamic option inputs (2–5, add/remove) + Analyse button
- Collapsible history cards: confidence badge (colour-coded), on expand shows recommendation box (indigo), option cards (risk badge, goal-alignment gradient bar, pros/cons), key considerations
- Delete per card; error shown inline

### Mobile: `DecisionsScreen`

**Files:**
- `apps/mobile/lib/features/decisions/data/decisions_service.dart` — `DecisionsService.getHistory()`, `analyze(question, options)`, `delete(id)`; models: `Decision`, `DecisionAnalysis`, `DecisionOption`
- `apps/mobile/lib/features/decisions/presentation/screens/decisions_screen.dart` — same breakdown as web with `LinearProgressIndicator` for goal alignment

### Files Created/Modified

| File | Change |
|------|--------|
| `backend/supabase/schema.sql` | MODIFIED — `decisions` table + RLS |
| `apps/web/src/features/decisions/services/decisions.service.ts` | NEW |
| `apps/web/src/app/api/v1/decisions/route.ts` | NEW — GET + POST |
| `apps/web/src/app/api/v1/decisions/[id]/route.ts` | NEW — DELETE |
| `apps/web/src/app/(dashboard)/decisions/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/decisions/decisions-view.tsx` | NEW |
| `apps/mobile/lib/features/decisions/data/decisions_service.dart` | NEW |
| `apps/mobile/lib/features/decisions/presentation/screens/decisions_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Decisions (`Scale` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.decisions` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Decision Engine tile |

---

## Phase 65 -- Phase M: Life Simulation

### Goal
Let users simulate what their life would look like 12 months from now if they commit to a specific scenario. Unlike Decision Engine (which compares options), Life Simulation takes **one committed scenario** and projects its trajectory using real baseline data. Stateless — no DB write, generated fresh per request.

### Architecture

**Service:** `apps/web/src/features/life-simulation/services/life-simulation.service.ts`

`LifeSimulationService.simulate(userId, scenario)`:
1. Fetches 6 data sources in parallel: active goals, active habits, last-30-day tasks (for completion rate), momentum + burnout, health insights (avg sleep/mood), finance monthly summary
2. Computes task completion rate inline
3. Builds prompt with all baseline data, instructs AI to simulate 4 milestones (months 1, 3, 6, 12)
4. Returns:

```ts
{
  scenario: string
  summary: string
  outcome_at_12_months: string
  probability_of_success: number     // 0-100
  milestones: [{
    month: 1 | 3 | 6 | 12
    title: string
    description: string
    probability: number
    metric?: string                  // e.g. "₹12,000 saved"
  }]
  key_risks: string[]
  key_enablers: string[]
  recommendation: string             // single most important first step
}
```

**API:** `POST /api/v1/life-simulation` — validates scenario 5–500 chars, calls service, returns result. `RateLimitTier.ai`.

### Web UI: `/life-simulation`

**Files:** `apps/web/src/app/(dashboard)/life-simulation/page.tsx` + `life-simulation-view.tsx`

- Textarea + 5 built-in example scenario chips (click auto-fills + triggers simulation)
- Result: header card (success % with colour-coded animated bar, summary, 12-month outcome), vertical timeline with milestone dots (colour by probability), side-by-side risks + enablers cards, first-step recommendation card
- Probability thresholds: green ≥70%, yellow ≥40%, red <40%

### Mobile: `LifeSimulationScreen`

**Files:**
- `apps/mobile/lib/features/life_simulation/data/life_simulation_service.dart` — `LifeSimulationService.simulate(scenario)`; models: `SimulationResult`, `SimulationMilestone`
- `apps/mobile/lib/features/life_simulation/presentation/screens/life_simulation_screen.dart` — same visual logic as web; timeline using `Column` + circle dot containers with vertical connector `Container` between items

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/life-simulation/services/life-simulation.service.ts` | NEW |
| `apps/web/src/app/api/v1/life-simulation/route.ts` | NEW — POST |
| `apps/web/src/app/(dashboard)/life-simulation/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/life-simulation/life-simulation-view.tsx` | NEW |
| `apps/mobile/lib/features/life_simulation/data/life_simulation_service.dart` | NEW |
| `apps/mobile/lib/features/life_simulation/presentation/screens/life_simulation_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Life Sim (`FlaskConical` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.lifeSimulation` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Life Simulation tile |

---

## Phase 66 -- Phase N (Part 1): Knowledge Graph

### Goal
Give users a visual map of how their habits, health, and productivity behaviours influence each other — an AI-computed directed graph over 30 days of real data. Cached 24 hours in `ai_insights` with `type = 'knowledge_graph'`.

### Architecture

**Service:** `apps/web/src/features/knowledge-graph/services/knowledge-graph.service.ts`

`KnowledgeGraphService.getGraph(userId, force?)`:
1. Cache-check via `getCachedInsight(userId, 'knowledge_graph')` — returns parsed `KnowledgeGraph` if fresh
2. Parallel fetch: `habits` (active), `habit_logs` (30 days), `tasks` (30 days, for completion correlation), `goals` (incomplete), `HealthService.getInsights(30)`
3. Computes per-habit task correlation: avg tasks completed on habit-completion days vs. non-habit days
4. Builds AI prompt with habit summary (rate + correlation diff), health averages (sleep/mood/exercise + trends), goal summary, productivity rate
5. AI responds with `GraphNode[]` + `GraphEdge[]` + `keystone_node` + `summary`
6. Saves via `saveInsight(userId, 'knowledge_graph', JSON.stringify(graph))`

**Types:**
```ts
interface GraphNode { id, label, type: 'habit'|'health'|'productivity'|'goal'|'outcome', strength: 0–100, description? }
interface GraphEdge { from, to, label, strength: 0–100, direction: 'positive'|'negative'|'neutral' }
interface KnowledgeGraph { nodes, edges, keystone_node, summary, has_enough_data, computed_at }
```

**API:** `GET /api/v1/knowledge-graph?force=true` — `RateLimitTier.ai`

**Bug fix (prerequisite):** `InsightType` in `lib/types/index.ts` extended to include `'knowledge_graph'`; `CACHE_TTL` in `cache.ts` extended with `knowledge_graph: 24h` — without this, `getCachedInsight` would compute `new Date(NaN)` and throw a 500.

### Web UI: `/knowledge-graph`

**Files:** `apps/web/src/app/(dashboard)/knowledge-graph/page.tsx` + `knowledge-graph-view.tsx`

- Summary card: node/edge count, computed date, keystone habit badge (gold star icon)
- SVG graph: circle-layout positioning (deterministic ring), colour-coded by node type (habit=indigo, health=green, productivity=amber, goal=purple, outcome=cyan), edges drawn as lines with arrow markers (positive=green/negative=red/neutral=grey), line weight ∝ edge strength, edge labels shown on hover
- Node tooltip: hover shows description in a `foreignObject` text box
- Legend: node type colours + edge direction colours
- Refresh button calls `?force=true`

### Mobile: `KnowledgeGraphScreen`

**Files:**
- `apps/mobile/lib/features/knowledge_graph/data/knowledge_graph_service.dart` — `KnowledgeGraphService.getGraph({force})`; models: `KnowledgeGraph`, `GraphNode`, `GraphEdge`
- `apps/mobile/lib/features/knowledge_graph/presentation/screens/knowledge_graph_screen.dart` — summary card (summary + keystone badge), scrollable node list (coloured left-border by type, strength number), scrollable edge list (from→to with direction badge)

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/lib/types/index.ts` | MODIFIED — added `'knowledge_graph'` to `InsightType` |
| `apps/web/src/features/ai/services/cache.ts` | MODIFIED — added `knowledge_graph: 24h` to `CACHE_TTL` |
| `apps/web/src/features/knowledge-graph/services/knowledge-graph.service.ts` | NEW (rewritten clean) |
| `apps/web/src/app/api/v1/knowledge-graph/route.ts` | NEW — GET |
| `apps/web/src/app/(dashboard)/knowledge-graph/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/knowledge-graph/knowledge-graph-view.tsx` | NEW |
| `apps/mobile/lib/features/knowledge_graph/data/knowledge_graph_service.dart` | NEW |
| `apps/mobile/lib/features/knowledge_graph/presentation/screens/knowledge_graph_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Knowledge Graph (`Network` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.knowledgeGraph` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Knowledge Graph tile |

---

## Phase 67 -- Phase N (Part 2): Auto Capture

### Goal
Two capabilities in one feature: (1) **Smart Suggestions** — surface actionable items from Google Calendar events + un-logged habits, so nothing slips through the cracks; (2) **Quick Log** — parse any free-form plain-English text into structured tasks, habit logs, or health entries using AI, with a single tap.

### Architecture

**Service:** `apps/web/src/features/auto-capture/services/auto-capture.service.ts`

`AutoCaptureService.getSuggestions(userId)`:
1. Fetches calendar connection → `listCalendarEvents(token, now, tomorrow)` → converts upcoming events to task suggestions (`type: 'task'`, `source: 'calendar'`, confidence 70%)
2. Fetches active habits not yet logged today → `type: 'habit_log'`, `source: 'pattern'`, confidence 90%
3. Returns up to 15 `CaptureSuggestion` items

`AutoCaptureService.importCalendarEvent(userId, suggestion)`:
- Inserts a task into `tasks` table with due_date/due_time from calendar event

`AutoCaptureService.quickLog(userId, text)`:
1. Fetches user's habit list for ID-resolution context
2. Sends text to AI with habit list; AI extracts `tasks[]`, `habit_logs[]`, `health{}`
3. Inserts tasks, upserts habit_logs (onConflict: `habit_id,date`), upserts health_entries (onConflict: `user_id,date`)
4. Returns `QuickLogResult { actions_taken[], tasks_created, habits_logged, health_entries_created }`

**API:**
- `GET /api/v1/auto-capture` — returns suggestions (`RateLimitTier.standard`)
- `POST /api/v1/auto-capture` — quick-log text (`RateLimitTier.ai`)
- `POST /api/v1/auto-capture/import` — import one calendar suggestion as a task (`RateLimitTier.standard`)

### Web UI: `/auto-capture`

**Files:** `apps/web/src/app/(dashboard)/auto-capture/page.tsx` + `auto-capture-view.tsx`

- Quick Log card: textarea, `⌘+Enter` shortcut, green success card showing `actions_taken[]`
- Smart Suggestions: cards showing source icon (Calendar=indigo / Pattern=purple), type badge, confidence %, title, due info; "Add Task" button imports calendar suggestions; habit suggestions shown as informational (no import needed — user can log directly)

### Mobile: `AutoCaptureScreen`

**Files:**
- `apps/mobile/lib/features/auto_capture/data/auto_capture_service.dart` — `AutoCaptureService.getSuggestions()`, `importSuggestion(s)`, `quickLog(text)`; models: `CaptureSuggestion`, `QuickLogResult`
- `apps/mobile/lib/features/auto_capture/presentation/screens/auto_capture_screen.dart` — Quick Log `TextField` (3 lines) + Log It button, success card with check icons per action, suggestion tiles with source icon + type badge + import button

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/auto-capture/services/auto-capture.service.ts` | NEW |
| `apps/web/src/app/api/v1/auto-capture/route.ts` | NEW — GET + POST |
| `apps/web/src/app/api/v1/auto-capture/import/route.ts` | NEW — POST |
| `apps/web/src/app/(dashboard)/auto-capture/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/auto-capture/auto-capture-view.tsx` | NEW |
| `apps/mobile/lib/features/auto_capture/data/auto_capture_service.dart` | NEW |
| `apps/mobile/lib/features/auto_capture/presentation/screens/auto_capture_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Auto Capture (`ScanSearch` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.autoCapture` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Auto Capture tile |

---

## Phase 68 -- Phase O (Part 1): Social Accountability Layer

### Goal
Bidirectional friend graph that lets users connect with friends, send/accept invites by email, and view a daily activity feed showing how friends are progressing on habits and tasks.

### Architecture

**DB Tables (added to `backend/supabase/schema.sql`):**
- `social_connections(id, requester_id, addressee_id, status: pending|accepted|blocked, created_at, updated_at)` — unique constraint on (requester_id, addressee_id), self-reference check; RLS: visible to requester or addressee
- `future_messages(id, user_id, message, deliver_at DATE, delivered BOOL, ai_forecast TEXT, created_at)` — also added here for co-location with Phase O DB work; RLS: user sees only own messages

**Service:** `apps/web/src/features/social/services/social.service.ts`

`SocialService`:
- `sendInvite(requesterId, email)` — lookup addressee by email in `public.users`, check for existing connection (duplicate/reverse), insert pending connection
- `acceptInvite(userId, connectionId)` — update status to `'accepted'` where addressee_id = userId
- `removeConnection(userId, connectionId)` — delete where requester or addressee = userId
- `getConnections(userId)` — join `social_connections` with `users` table twice (as requester + addressee), compute `direction: 'incoming'|'outgoing'`, return `SocialConnection[]`
- `getFriendFeed(userId)` — for each accepted friend: parallel fetch today's `habit_logs` (completed), `tasks` (completed), `momentum_snapshots` (today); compute `streak_highlight` from longest active streak; return `FriendActivity[]` sorted by total activity desc

**Types:**
```ts
interface SocialConnection { id, friend_id, friend_name, friend_email, status, direction }
interface FriendActivity { friend_id, friend_name, habits_today, tasks_today, momentum_score?, streak_highlight? }
```

**API:**
- `GET /api/v1/social/friends` — list all connections (`RateLimitTier.standard`)
- `POST /api/v1/social/friends` — send invite by email (`RateLimitTier.standard`)
- `PUT /api/v1/social/friends/[id]` — accept incoming invite
- `DELETE /api/v1/social/friends/[id]` — remove connection
- `GET /api/v1/social/feed` — today's friend activity feed

### Web UI: `/social`

**Files:** `apps/web/src/app/(dashboard)/social/page.tsx` + `social-view.tsx`

- Invite card: email input + "Invite" button; shows success (green) / error (red) message
- Incoming friend requests section: avatar initial, name, email, "Accept" button + remove (trash) button
- Friends Today feed: purple avatars, streak highlight, momentum score badge, habits/tasks chip row
- All Friends list: accepted connections with remove button
- Sent Invites list: pending outgoing shown at 60% opacity with "Awaiting response" label

**Bug fix:** `apps/web/src/lib/supabase/middleware.ts` — added `/social` and `/future-self` to `isProtectedRoute` check so unauthenticated users are redirected to `/login` rather than seeing blank pages with API 401 errors.

### Mobile: `SocialScreen`

**Files:**
- `apps/mobile/lib/features/social/data/social_service.dart` — full CRUD + feed; models: `SocialConnection`, `FriendActivity`, `InviteResult`
- `apps/mobile/lib/features/social/presentation/screens/social_screen.dart` — invite card (email TextField + Send button), incoming requests (Accept / close buttons), friend activity feed (habit + task chips, momentum score), accepted friends list, sent pending list

### Files Created/Modified

| File | Change |
|------|--------|
| `backend/supabase/schema.sql` | MODIFIED — added `social_connections` + `future_messages` tables + RLS |
| `apps/web/src/features/social/services/social.service.ts` | NEW |
| `apps/web/src/app/api/v1/social/friends/route.ts` | NEW — GET + POST |
| `apps/web/src/app/api/v1/social/friends/[id]/route.ts` | NEW — PUT + DELETE |
| `apps/web/src/app/api/v1/social/feed/route.ts` | NEW — GET |
| `apps/web/src/app/(dashboard)/social/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/social/social-view.tsx` | NEW |
| `apps/mobile/lib/features/social/data/social_service.dart` | NEW |
| `apps/mobile/lib/features/social/presentation/screens/social_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Social (`Users` icon) |
| `apps/web/src/lib/supabase/middleware.ts` | MODIFIED — added `/social` + `/future-self` to isProtectedRoute |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.social` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Social tile |

---

## Phase 69 -- Phase O (Part 2): Future Self

### Goal
Time-capsule messaging: write a personal message to be sealed until a chosen date. At write time, AI generates a behavioral forecast using 30 days of habit/task/goal data. Arrived messages expand to show the original message + the AI prediction from the past.

### Architecture

**Service:** `apps/web/src/features/future-self/services/future-self.service.ts`

`FutureSelfService`:
- `getMessages(userId)` — fetch all `future_messages` ordered by `deliver_at ASC`; compute `days_until` + `is_past` flag
- `createMessage(userId, message, deliverAt)` — fetch 30-day behavioral context (active habits + completions, task completion rate, active goals progress), call `generateForecast()`, insert row to `future_messages` with `ai_forecast`
- `deleteMessage(userId, messageId)` — delete with user ownership check
- `generateForecast(message, monthsAhead, habits, habitCompletions, taskRate, goals)` — 200-token warm + honest 2-3 sentence prediction using `complete()` at `temperature: 0.7`

**API:**
- `GET /api/v1/future-self` — list all messages (`RateLimitTier.standard`)
- `POST /api/v1/future-self` — create + seal message (`RateLimitTier.ai`)
- `DELETE /api/v1/future-self/[id]` — delete message

### Web UI: `/future-self`

**Files:** `apps/web/src/app/(dashboard)/future-self/page.tsx` + `future-self-view.tsx`

- Compose card: textarea for message, date picker (calendar popover), "Seal & Send" button (hourglass icon)
- Arrived messages (is_past=true): expandable card showing original message + purple AI forecast box ("AI Forecast at Time of Writing")
- Sealed messages (is_past=false): lock icon, truncated preview, deliver date + days remaining
- Delete button on both arrived and sealed messages

### Mobile: `FutureSelfScreen`

**Files:**
- `apps/mobile/lib/features/future_self/data/future_self_service.dart` — `getMessages()`, `createMessage(message, deliverAt)`, `deleteMessage(id)`; model: `FutureMessage`
- `apps/mobile/lib/features/future_self/presentation/screens/future_self_screen.dart` — compose card (4-line TextField + GestureDetector date row → `showDatePicker` + "Seal & Send" button), arrived messages (expandable with AI forecast box), sealed tiles (lock icon + days remaining)

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/future-self/services/future-self.service.ts` | NEW |
| `apps/web/src/app/api/v1/future-self/route.ts` | NEW — GET + POST |
| `apps/web/src/app/api/v1/future-self/[id]/route.ts` | NEW — DELETE |
| `apps/web/src/app/(dashboard)/future-self/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/future-self/future-self-view.tsx` | NEW |
| `apps/mobile/lib/features/future_self/data/future_self_service.dart` | NEW |
| `apps/mobile/lib/features/future_self/presentation/screens/future_self_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Future Self (`Hourglass` icon) |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — `Routes.futureSelf` + GoRoute |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Future Self tile |

---

## Phase 70 -- Phase P: Life Trajectory Engine

### Goal
Compute directional velocity per life domain by running the same Life Map scoring formula over two 14-day windows (recent vs prior) and exposing the delta. Pure intelligence — no new data collection.

### Architecture

**Service:** `apps/web/src/features/trajectory/services/trajectory.service.ts`

`generateTrajectoryReport(userId, force?)`:
1. Checks `ai_insights` cache (`type = 'trajectory'`, 24h TTL)
2. Fetches goals, task stats (within date window), habit rate — for BOTH recent (0–14d) and prior (15–28d) windows in parallel
3. Applies Life Map formula per domain per window: `goalProgress * 0.5 + taskRate * 0.3 + habitRate * 0.2`
4. Delta = recentScore - priorScore; trend = up/down/stable (±3pt threshold)
5. Highest Impact Action: domain with lowest score + declining/stable trend → template-based recommendation
6. Caches and returns `TrajectoryReport`

**Response type:**
```ts
interface DomainVelocity { domain, score, delta, trend }
interface TrajectoryReport {
  domains: DomainVelocity[]
  overallTrend: 'up' | 'down' | 'stable'
  highestImpactAction: { action, domain, projectedImpact }
  generatedAt: string
}
```

**API:** `GET /api/v1/trajectory` — `RateLimitTier.dashboard`, `?force=true` bypasses cache

### Web UI: `/trajectory`

**Files:** `apps/web/src/app/(dashboard)/trajectory/page.tsx` + `trajectory-view.tsx`

- Overall trend badge (colored icon + label)
- HIA callout card (domain-colored gradient border)
- 2-col domain grid: each card shows domain icon, score %, progress bar, delta (▲/▼ with color + points)
- Refresh button; loading/error states

### Mobile: `TrajectoryScreen`

**Files:**
- `apps/mobile/lib/features/trajectory/data/trajectory_service.dart` — models + Dio service
- `apps/mobile/lib/features/trajectory/presentation/screens/trajectory_screen.dart` — HIA card, 2-col domain GridView with colored delta arrows and progress bars

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/lib/types/index.ts` | MODIFIED — added `'trajectory' \| 'life_report'` to InsightType |
| `apps/web/src/features/ai/services/cache.ts` | MODIFIED — added trajectory + life_report TTL entries |
| `apps/web/src/features/trajectory/services/trajectory.service.ts` | NEW |
| `apps/web/src/app/api/v1/trajectory/route.ts` | NEW — GET |
| `apps/web/src/app/(dashboard)/trajectory/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/trajectory/trajectory-view.tsx` | NEW |
| `apps/mobile/lib/features/trajectory/data/trajectory_service.dart` | NEW |
| `apps/mobile/lib/features/trajectory/presentation/screens/trajectory_screen.dart` | NEW |
| `apps/web/src/components/layout/sidebar.tsx` | MODIFIED — added Trajectory + Life Report nav items |
| `apps/web/src/lib/supabase/middleware.ts` | MODIFIED — added `/trajectory` + `/life-report` to isProtectedRoute |
| `apps/mobile/lib/core/router/app_router.dart` | MODIFIED — added Routes.trajectory + Routes.lifeReport + GoRoutes |
| `apps/mobile/lib/core/widgets/app_bottom_nav.dart` | MODIFIED — Trajectory + Life Report tiles in More sheet |

---

## Phase 71 -- Phase P: Daily Life Intelligence Report + Highest Impact Action

### Goal
Unified AI morning briefing combining: health summary, momentum + 7-day trend sparkline, burnout risk, top Pattern Oracle insight, Highest Impact Action, and AI-generated warm greeting. Cached once per day. HIA is computed by the Trajectory Engine (no separate AI call).

### Architecture

**Service:** `apps/web/src/features/ai/services/life-report.service.ts`

`LifeReportService.generateReport(userId, force?)`:
1. Checks `ai_insights` cache (`type = 'life_report'`, 24h TTL)
2. Parallel fetch: user name, latest health entry, last 7 momentum snapshots, PatternOracle top insight, TrajectoryReport (includes HIA)
3. Computes burnout risk from momentum trend (3+ declining days = high, avg change < -2 = medium, else low)
4. AI call for greeting only: name + momentum + trend direction + top insight → 2-sentence warm morning greeting (`maxTokens: 100, temperature: 0.6`)
5. Returns `LifeReport` combining computed data + AI greeting; saves to cache

**Response type:**
```ts
interface LifeReport {
  greeting: string          // AI-generated personalised 2-sentence morning greeting
  momentumScore: number
  momentumTrend: number[]   // last 7 days (oldest first) for sparkline
  burnoutRisk: 'low' | 'medium' | 'high'
  topInsight: string
  highestImpactAction: { action, domain, projectedImpact }
  domains: DomainVelocity[]
  healthSummary: string | null
  generatedAt: string
}
```

**API:** `GET /api/v1/ai/life-report` — `RateLimitTier.ai`, `?force=true` bypasses cache

### Web UI: `/life-report`

**Files:** `apps/web/src/app/(dashboard)/life-report/page.tsx` + `life-report-view.tsx`

- Gradient greeting card with health summary below
- 2-col stats: momentum score (indigo, with SVG sparkline) + burnout risk chip (colour-coded)
- Top Pattern card
- HIA callout card (domain-colored, most prominent)
- 3-col domain mini-grid (icon + score + trend arrow)
- Regenerate button; loading/error states

### Mobile: `LifeReportScreen`

**Files:**
- `apps/mobile/lib/features/life_report/data/life_report_service.dart` — models + Dio service
- `apps/mobile/lib/features/life_report/presentation/screens/life_report_screen.dart` — greeting card, momentum + burnout row (with `CustomPaint` sparkline), top pattern, HIA card, domain 3-col grid

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/web/src/features/ai/services/life-report.service.ts` | NEW |
| `apps/web/src/app/api/v1/ai/life-report/route.ts` | NEW — GET |
| `apps/web/src/app/(dashboard)/life-report/page.tsx` | NEW |
| `apps/web/src/app/(dashboard)/life-report/life-report-view.tsx` | NEW |
| `apps/mobile/lib/features/life_report/data/life_report_service.dart` | NEW |
| `apps/mobile/lib/features/life_report/presentation/screens/life_report_screen.dart` | NEW |

---

## Phase 72 -- Marketing Website (`apps/website`)

### Goal
Standalone Next.js 15 marketing site separate from the dashboard app. Primary goal: email wait list capture for the first 1,000 private beta users.

### Architecture

**App:** `apps/website` (port 3010 in development, separate Vercel project for production)

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS (same design tokens) + Framer Motion

**Wait List API:** `POST /api/waitlist` — validates email, inserts into Supabase `waitlist` table (unique constraint), returns 409 on duplicate

### Pages

| Route | Description |
|-------|-------------|
| `/` | Full landing page (8 sections) |
| `/features` | Detailed feature breakdowns |
| `/pricing` | Free vs Pro comparison |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Homepage Sections
1. **Hero** — Framer Motion staggered animations, mock Life Intelligence Report card
2. **Problem** — 5 pain point cards with icons
3. **Solution** — "Google Maps for your life" quote callout
4. **Features** — 6-card grid (AI GPS, Momentum, Burnout Radar, Pattern Oracle, Timeline, Coach)
5. **Product Demo** — Animated tab switcher (Dashboard / Life Map / Mobile) with SVG radar chart
6. **How It Works** — 3-step numbered flow
7. **Social Proof** — Private Beta stats pills
8. **Final CTA** — Email wait list form (`id="waitlist"`)

### Files Created/Modified

| File | Change |
|------|--------|
| `apps/website/package.json` | NEW |
| `apps/website/next.config.ts` | NEW |
| `apps/website/tsconfig.json` | NEW |
| `apps/website/postcss.config.mjs` | NEW |
| `apps/website/tailwind.config.ts` | NEW |
| `apps/website/src/app/globals.css` | NEW |
| `apps/website/src/app/layout.tsx` | NEW |
| `apps/website/src/app/page.tsx` | NEW |
| `apps/website/src/app/features/page.tsx` | NEW |
| `apps/website/src/app/pricing/page.tsx` | NEW |
| `apps/website/src/app/privacy/page.tsx` | NEW |
| `apps/website/src/app/terms/page.tsx` | NEW |
| `apps/website/src/app/api/waitlist/route.ts` | NEW |
| `apps/website/src/components/layout/navbar.tsx` | NEW |
| `apps/website/src/components/layout/footer.tsx` | NEW |
| `apps/website/src/components/sections/hero.tsx` | NEW |
| `apps/website/src/components/sections/problem.tsx` | NEW |
| `apps/website/src/components/sections/solution.tsx` | NEW |
| `apps/website/src/components/sections/features.tsx` | NEW |
| `apps/website/src/components/sections/product-demo.tsx` | NEW |
| `apps/website/src/components/sections/how-it-works.tsx` | NEW |
| `apps/website/src/components/sections/social-proof.tsx` | NEW |
| `apps/website/src/components/sections/final-cta.tsx` | NEW |
| `apps/website/src/components/ui/waitlist-form.tsx` | NEW |
| `apps/website/src/components/ui/gradient-text.tsx` | NEW |
| `apps/website/src/components/ui/glass-card.tsx` | NEW |
| `package.json` (root) | MODIFIED — added `apps/website` to workspaces + `dev:website`/`build:website` scripts |
| `docs/TECH_STACK.md` | MODIFIED — added Marketing Website section |
| `docs/FEATURES.md` | MODIFIED — added Feature #23 (Marketing Website) |

---

## Backlog -- Pending Items

### Requires Manual Action

| # | Item | Status |
|---|------|--------|
| 1 | Mobile app store builds | Pending — build and publish to Google Play / Apple App Store |

### Known Limitations

| # | Item | Details |
|---|------|---------|
| 1 | Voice Log requires HTTPS | Web Speech API needs secure context; works in production but not on localhost HTTP |
| 2 | Google OAuth "unverified app" warning | Expected during development; submit app for Google verification before public launch |

### Future Development (from Roadmap)

| # | Phase | Feature | Status |
|---|-------|---------|--------|
| 1 | Phase J | Razorpay integration (UPI, net banking, cards) | Not started |
| 2 | Phase J | Pro tier feature gating | Not started |
| 3 | Phase J | Team tier: shared accountability contracts | Not started |
| 4 | -- | Apple Calendar sync | Not started |
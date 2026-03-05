# VitaMind -- Build Progress

> Last updated: 2026-03-05

## Summary

| Total | Completed | In Progress | Pending |
|-------|-----------|-------------|---------|
| 58    | 58        | 0           | 0       |

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

## Remaining Work (Backlog)

All planned items complete. Future improvements:

- **E2E tests in CI** -- Playwright in GitHub Actions with test Supabase instance
- **Preview deployments** -- Vercel preview on PR
- **Release automation** -- semantic versioning + changelog generation

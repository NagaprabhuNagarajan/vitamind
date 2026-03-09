# Third-Party Services

> Last updated: 2026-03-06

All external services VitaMind depends on, their purpose, configuration, and cost.

---

## 1. Supabase

**Purpose:** Database, authentication, storage, edge functions, cron scheduling

| Detail | Value |
|--------|-------|
| Project ref | `qogkvngpcmrdbrkgxbow` |
| Dashboard | supabase.com/dashboard |
| Features used | PostgreSQL, Auth (email + Google OAuth), Edge Functions, pg_cron, pg_net |
| Free tier | 500MB DB, 50K auth users, 500K edge function invocations/month |

**Environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL` -- Project API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Public anon key (client-side)
- `SUPABASE_SERVICE_ROLE_KEY` -- Admin key (server-side only, never exposed to client)

**Supabase secrets (edge functions):**
- `FCM_SERVICE_ACCOUNT` -- Firebase service account JSON for push notifications
- `RESEND_API_KEY` or `SENDGRID_API_KEY` -- Email provider for weekly reports

**Edge functions deployed:**
- `compute-momentum` -- Daily momentum score computation (cron: `0 0 * * *`)
- `send-reminder` -- Task + habit reminders (cron: `0 * * * *` tasks, `0 8 * * *` habits)
- `send-weekly-report` -- Weekly email report (cron: `0 9 * * 1`)
- `compute-time-fingerprint` -- Weekly productivity profile (cron: `0 2 * * 0`)
- `spawn-recurring` -- Recurring task creation (cron: `0 1 * * *`)

---

## 2. Vercel

**Purpose:** Web app hosting with auto-deploy from GitHub

| Detail | Value |
|--------|-------|
| Project URL | vitamind-ai.vercel.app |
| Framework | Next.js 15 |
| Root directory | `apps/web` |
| Region | iad1 (US East) |
| Free tier | 100GB bandwidth, 6K build minutes/month |

**Environment variables set in Vercel dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER` (openai or groq)
- `OPENAI_API_KEY` or `GROQ_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

---

## 3. Firebase (Google)

**Purpose:** Push notifications via Firebase Cloud Messaging (FCM V1)

| Detail | Value |
|--------|-------|
| Project | vitamind-d72ad |
| Console | console.firebase.google.com |
| API used | FCM V1 (`https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`) |
| Auth method | OAuth2 service account JWT (not Legacy server key) |
| Free tier | Unlimited push notifications |

**Configuration files:**
- `apps/mobile/android/app/google-services.json` -- Android FCM config (gitignored)
- `apps/mobile/ios/Runner/GoogleService-Info.plist` -- iOS FCM config (gitignored)
- Service account key JSON -- stored as `FCM_SERVICE_ACCOUNT` Supabase secret (gitignored)

**Gradle plugins:**
- `com.google.gms.google-services` in `settings.gradle.kts` and `app/build.gradle.kts`

---

## 4. OpenAI / Groq

**Purpose:** AI language model for intelligent features

| Detail | Value |
|--------|-------|
| Provider | Configurable via `AI_PROVIDER` env var |
| OpenAI | api.openai.com -- GPT-4o / GPT-4o-mini |
| Groq | api.groq.com -- Llama 3 / Mixtral (faster, cheaper) |
| Free tier | Groq: generous free tier; OpenAI: pay-per-token |

**Used by:**
- Daily AI planner (POST /api/v1/ai/daily-plan)
- Chat assistant (POST /api/v1/ai/chat)
- Productivity insights (POST /api/v1/ai/insights)
- Task decomposition (POST /api/v1/tasks/decompose)
- Burnout recovery plans
- Goal autopilot task generation
- Voice log parsing (natural language -> structured actions)
- Life review generation
- Pattern Oracle correlation analysis
- Cascade Intelligence habit-goal suggestions

---

## 5. Sentry

**Purpose:** Error monitoring and performance tracking

| Detail | Value |
|--------|-------|
| Dashboard | sentry.io |
| Org | vitamind-jn |
| Project | javascript-nextjs |
| SDK (web) | @sentry/nextjs |
| SDK (mobile) | sentry_flutter (ready to activate) |
| Free tier | 5K errors/month, 10K transactions/month |

**Environment variables:**
- `NEXT_PUBLIC_SENTRY_DSN` -- Client DSN for error reporting
- `SENTRY_ORG` -- Organization slug for source map uploads
- `SENTRY_PROJECT` -- Project slug

**Config files (web):**
- `apps/web/sentry.client.config.ts` -- Browser error capture + replay
- `apps/web/sentry.server.config.ts` -- Server-side error capture
- `apps/web/sentry.edge.config.ts` -- Edge runtime error capture
- `apps/web/next.config.ts` -- Wrapped with `withSentryConfig()`

---

## 6. PostHog

**Purpose:** Product analytics and user behavior tracking

| Detail | Value |
|--------|-------|
| Dashboard | posthog.com |
| SDK (web) | posthog-js |
| SDK (mobile) | posthog_flutter (ready to activate) |
| Free tier | 1M events/month |

**Environment variables:**
- `NEXT_PUBLIC_POSTHOG_KEY` -- Project API key
- `NEXT_PUBLIC_POSTHOG_HOST` -- `https://app.posthog.com`

**Tracked events:**
sign_up, login, logout, task_created, task_completed, goal_created, habit_logged, momentum_viewed, ai_chat_sent, ai_plan_generated, focus_session_started, focus_session_completed, contract_created, voice_log_recorded

---

## 7. Google Calendar API

**Purpose:** Sync tasks with due dates to Google Calendar events

| Detail | Value |
|--------|-------|
| API | Google Calendar API v3 |
| Auth | OAuth 2.0 (authorization code flow with offline access) |
| Scopes | `https://www.googleapis.com/auth/calendar.events` |
| Console | Google Cloud Console -> APIs & Services -> Credentials |
| Free tier | Unlimited (within Google API quotas) |

**Environment variables:**
- `GOOGLE_CLIENT_ID` -- OAuth client ID (server-side)
- `GOOGLE_CLIENT_SECRET` -- OAuth client secret (server-side)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` -- Same client ID (client-side, for OAuth URL)

**Redirect URIs configured:**
- `https://vitamind-ai.vercel.app/settings`
- `http://localhost:3003/settings`

**API routes:**
- POST /api/v1/calendar/connect -- Exchange auth code for tokens
- DELETE /api/v1/calendar/disconnect -- Remove connection
- POST /api/v1/calendar/sync -- Push unsynced tasks to calendar
- GET /api/v1/calendar/status -- Connection status

---

## 8. Resend (Primary Email Provider)

**Purpose:** Send weekly productivity report emails

| Detail | Value |
|--------|-------|
| API | api.resend.com/emails |
| Free tier | 3,000 emails/month, 100 emails/day |
| Status | Pending setup |

**Environment variable (Supabase secret):**
- `RESEND_API_KEY` -- API key from resend.com dashboard

---

## 9. SendGrid (Fallback Email Provider)

**Purpose:** Fallback email delivery if Resend is unavailable

| Detail | Value |
|--------|-------|
| API | api.sendgrid.com/v3/mail/send |
| Free tier | 100 emails/day |
| Status | Pending setup (optional) |

**Environment variable (Supabase secret):**
- `SENDGRID_API_KEY` -- API key from sendgrid.com dashboard

---

## 10. GitHub

**Purpose:** Source code hosting, CI/CD via GitHub Actions

| Detail | Value |
|--------|-------|
| Repository | Private |
| CI workflows | ci-web.yml (lint, test, typecheck, build), ci-mobile.yml (analyze, test, build) |
| Auto-deploy | Vercel deploys on push to main |

---

## 11. Razorpay (Planned)

**Purpose:** Payment processing for accountability contract financial stakes (India-first)

| Detail | Value |
|--------|-------|
| Status | Deferred |
| Use case | Users stake money on goal contracts; refund on success, donate on failure |
| Integration | Razorpay Checkout + Webhooks |
| Payment methods | UPI, Google Pay, PhonePe, net banking (50+ banks), cards (Visa/MC/RuPay), wallets (Paytm, Amazon Pay) |
| Pricing | 2% per transaction |
| Dashboard | dashboard.razorpay.com |

**Environment variables (when activated):**
- `RAZORPAY_KEY_ID` -- Public key (client-side checkout)
- `RAZORPAY_KEY_SECRET` -- Secret key (server-side API)
- `RAZORPAY_WEBHOOK_SECRET` -- Webhook signature verification

---

## Cost Summary (0-500 users)

| Service | Monthly Cost |
|---------|-------------|
| Supabase | Free |
| Vercel | Free |
| Firebase (FCM) | Free |
| Sentry | Free |
| PostHog | Free |
| Google Calendar API | Free |
| Resend | Free |
| AI (Groq) | ~$10-30 |
| AI (OpenAI) | ~$30-50 |
| **Total** | **~$10-50/month** |

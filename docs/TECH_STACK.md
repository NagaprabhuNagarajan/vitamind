# Tech Stack

> Last updated: 2026-03-09

## Mobile App

- **Flutter** -- Cross-platform (iOS + Android) from a single codebase
- **Dart** -- Language for Flutter
- **flutter_bloc** -- State management (BLoC pattern)
- **go_router** -- Declarative routing
- **shared_preferences** -- Local cache with TTL

## Web Dashboard (`apps/web`)

- **Next.js 15** -- React framework with App Router, Server Components, Route Handlers
- **React 19** -- UI library
- **TypeScript** -- Type safety across the codebase
- **Tailwind CSS 3** -- Utility-first styling with custom design tokens
- **Lucide React** -- Icon library

## Marketing Website (`apps/website`)

- **Next.js 15** -- App Router, static pages + API route for waitlist
- **React 19** -- UI library
- **TypeScript** -- Type safety
- **Tailwind CSS 3** -- Same design tokens as the dashboard
- **Framer Motion** -- Page animations and section transitions
- **@supabase/supabase-js** -- Waitlist email storage (service role key, no auth needed)

## Backend

- **Supabase** -- Backend-as-a-Service
  - PostgreSQL database with RLS (Row Level Security)
  - Supabase Auth (email/password + Google OAuth)
  - Edge Functions (Deno runtime) for scheduled jobs
  - pg_cron for scheduled task execution

## AI Services

- **OpenAI API** or **Groq API** -- LLM provider (configurable via AI_PROVIDER env var)
- Used for: daily planner, chat assistant, task decomposition, pattern analysis, burnout recovery plans, goal autopilot, voice log parsing, life reviews

## Hosting & Deployment

- **Vercel** -- Web dashboard (`apps/web`) + Marketing website (`apps/website`) hosting (auto-deploy from GitHub)
- **Supabase Cloud** -- Database + Auth + Edge Functions hosting

## Push Notifications

- **Firebase Cloud Messaging (FCM V1)** -- Push notifications to mobile devices
- Uses OAuth2 service account JWT authentication (not Legacy API)

## Error Monitoring

- **Sentry** -- Error tracking for web (client, server, edge) and mobile
- `@sentry/nextjs` (web), `sentry_flutter` (mobile, ready to activate)

## Analytics

- **PostHog** -- Product analytics and event tracking
- `posthog-js` (web), `posthog_flutter` (mobile, ready to activate)

## Email

- **Resend** (primary) or **SendGrid** (fallback) -- Transactional email for weekly reports
- Branded HTML email templates with dark theme

## Calendar Integration

- **Google Calendar API v3** -- OAuth2 connect, event CRUD, bi-directional sync
- Raw fetch() calls (no heavyweight SDK dependency)

## CI/CD

- **GitHub Actions** -- Automated lint, test, typecheck, build on PR/push
- Separate workflows for web and mobile with path filtering

## Testing

- **Vitest** -- Web unit tests (services, utilities, AI prompts)
- **Playwright** -- Web E2E tests (auth, navigation, tasks, health)
- **Flutter Test** -- Mobile unit tests (services, BLoC)
- **Flutter Integration Test** -- Mobile E2E tests (splash, login, navigation)

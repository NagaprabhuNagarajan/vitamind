'use client'

import posthog from 'posthog-js'

let initialized = false

export function initPostHog() {
  if (initialized) return
  if (typeof window === 'undefined') return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

  if (!key) return

  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
    autocapture: false, // We'll track specific events
  })

  initialized = true
}

/** Track a custom event */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

/** Identify a user after login */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(userId, traits)
}

/** Reset on logout */
export function resetAnalytics() {
  if (!initialized) return
  posthog.reset()
}

// Pre-defined event names for type safety
export const AnalyticsEvents = {
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  GOAL_CREATED: 'goal_created',
  HABIT_LOGGED: 'habit_logged',
  MOMENTUM_VIEWED: 'momentum_viewed',
  AI_CHAT_SENT: 'ai_chat_sent',
  AI_PLAN_GENERATED: 'ai_plan_generated',
  FOCUS_SESSION_STARTED: 'focus_session_started',
  FOCUS_SESSION_COMPLETED: 'focus_session_completed',
  CONTRACT_CREATED: 'contract_created',
  VOICE_LOG_RECORDED: 'voice_log_recorded',
} as const

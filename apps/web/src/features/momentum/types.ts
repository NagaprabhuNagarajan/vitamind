import type { UUID } from '@/lib/types'

// ─── Momentum Snapshot (matches momentum_snapshots table) ──────────────────

export interface MomentumSnapshot {
  id: UUID
  user_id: UUID
  date: string            // YYYY-MM-DD
  score: number           // 0–100
  task_velocity: number   // 0–100
  habit_consistency: number // 0–100
  goal_trajectory: number // 0–100
  overdue_pressure: number // 0–100
  burnout_risk: number    // 0–100
  created_at: string
}

// ─── API Response ──────────────────────────────────────────────────────────

export interface MomentumResponse {
  current: MomentumSnapshot
  history: MomentumSnapshot[]
  trend: {
    direction: 'up' | 'down' | 'stable'
    delta: number // absolute change vs last week
  }
}

// ─── Intermediate computation results (used by the scoring engine) ─────────

export interface MomentumComponents {
  taskVelocity: number
  habitConsistency: number
  goalTrajectory: number
  overduePressure: number
  burnoutRisk: number
}

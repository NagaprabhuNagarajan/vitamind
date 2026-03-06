import type { UUID } from '@/lib/types'

export interface BurnoutSignals {
  declining_velocity: boolean       // task velocity dropped >15pts in 7 days
  broken_streaks: number            // number of habits with broken streaks this week
  growing_backlog: boolean          // overdue tasks increased by 3+ in 7 days
  stalled_goals: number             // goals with 0% progress change in 14 days
  high_overdue_pressure: boolean    // overdue pressure > 60
  low_habit_consistency: boolean    // habit consistency < 30
}

export interface BurnoutAlert {
  id: UUID
  user_id: UUID
  date: string
  risk_level: number     // 0-100
  signals: BurnoutSignals
  recovery_plan: string | null
  acknowledged: boolean
  created_at: string
}

export interface BurnoutRadarResponse {
  current_risk: number
  signals: BurnoutSignals
  active_alert: BurnoutAlert | null
  history: { date: string; risk_level: number }[]
  recovery_plan: string | null
}

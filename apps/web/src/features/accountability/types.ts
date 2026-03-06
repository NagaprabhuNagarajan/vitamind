import type { UUID } from '@/lib/types'

export interface Contract {
  id: UUID
  user_id: UUID
  title: string
  description: string | null
  type: 'goal' | 'habit' | 'custom'
  target_id: UUID | null
  commitment: string
  stakes: string | null
  stake_amount_cents: number | null
  check_in_frequency: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'failed' | 'cancelled'
  progress: number
  misses: number
  created_at: string
}

export interface ContractCheckin {
  id: UUID
  contract_id: UUID
  user_id: UUID
  date: string
  met: boolean
  auto_tracked: boolean
  notes: string | null
  created_at: string
}

export interface ContractWithCheckins extends Contract {
  checkins: ContractCheckin[]
  streak: number
}

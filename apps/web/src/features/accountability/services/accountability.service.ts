import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import type { Contract, ContractCheckin, ContractWithCheckins } from '../types'

export class AccountabilityService {
  /** Get all contracts with recent check-ins */
  static async getAll(userId: string): Promise<ContractWithCheckins[]> {
    const supabase = await createClient()

    const { data: contracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!contracts?.length) return []

    const contractIds = contracts.map((c) => c.id)
    const { data: checkins } = await supabase
      .from('contract_checkins')
      .select('*')
      .in('contract_id', contractIds)
      .order('date', { ascending: false })
      .limit(100)

    const checkinMap = new Map<string, ContractCheckin[]>()
    for (const ci of (checkins ?? []) as ContractCheckin[]) {
      const list = checkinMap.get(ci.contract_id) ?? []
      list.push(ci)
      checkinMap.set(ci.contract_id, list)
    }

    return (contracts as Contract[]).map((c) => {
      const cis = checkinMap.get(c.id) ?? []
      // Compute current streak
      let streak = 0
      for (const ci of cis) {
        if (ci.met) streak++
        else break
      }
      return { ...c, checkins: cis, streak }
    })
  }

  /** Create a new accountability contract */
  static async create(
    userId: string,
    input: {
      title: string
      type: 'goal' | 'habit' | 'custom'
      target_id?: string
      commitment: string
      stakes?: string
      stake_amount_cents?: number
      check_in_frequency: 'daily' | 'weekly' | 'monthly'
      end_date: string
      description?: string
    },
  ): Promise<Contract> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        user_id: userId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        target_id: input.target_id ?? null,
        commitment: input.commitment,
        stakes: input.stakes ?? null,
        stake_amount_cents: input.stake_amount_cents ?? null,
        check_in_frequency: input.check_in_frequency,
        end_date: input.end_date,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as Contract
  }

  /** Auto-check-in: verify progress from actual data */
  static async autoCheckIn(userId: string, contractId: string): Promise<ContractCheckin> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('user_id', userId)
      .single()

    if (!contract) throw new Error('Contract not found')

    let met = false

    if (contract.type === 'habit' && contract.target_id) {
      // Check if habit was completed today
      const { data: log } = await supabase
        .from('habit_logs')
        .select('status')
        .eq('habit_id', contract.target_id)
        .eq('date', today)
        .single()

      met = log?.status === 'completed'
    } else if (contract.type === 'goal' && contract.target_id) {
      // Check if any tasks for this goal were completed today
      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('goal_id', contract.target_id)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`)

      met = (count ?? 0) > 0
    }

    const { data: checkin, error } = await supabase
      .from('contract_checkins')
      .upsert({
        contract_id: contractId,
        user_id: userId,
        date: today,
        met,
        auto_tracked: true,
      }, { onConflict: 'contract_id,date' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Update contract progress and misses
    const { count: metCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)
      .eq('met', true)

    const { count: totalCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)

    const { count: missCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)
      .eq('met', false)

    const progress = (totalCount ?? 0) > 0
      ? Math.round(((metCount ?? 0) / (totalCount ?? 1)) * 100)
      : 0

    await supabase
      .from('contracts')
      .update({ progress, misses: missCount ?? 0 })
      .eq('id', contractId)

    return checkin as ContractCheckin
  }

  /** Manual check-in */
  static async manualCheckIn(
    userId: string,
    contractId: string,
    met: boolean,
    notes?: string,
  ): Promise<ContractCheckin> {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('contract_checkins')
      .upsert({
        contract_id: contractId,
        user_id: userId,
        date: today,
        met,
        auto_tracked: false,
        notes: notes ?? null,
      }, { onConflict: 'contract_id,date' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Update progress
    const { count: metCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)
      .eq('met', true)

    const { count: totalCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)

    const { count: missCount } = await supabase
      .from('contract_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId)
      .eq('met', false)

    const progress = (totalCount ?? 0) > 0
      ? Math.round(((metCount ?? 0) / (totalCount ?? 1)) * 100)
      : 0

    await supabase
      .from('contracts')
      .update({ progress, misses: missCount ?? 0 })
      .eq('id', contractId)

    return data as ContractCheckin
  }

  /** Cancel a contract */
  static async cancel(userId: string, contractId: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('contracts')
      .update({ status: 'cancelled' })
      .eq('id', contractId)
      .eq('user_id', userId)
  }

  /** Generate AI accountability nudge for a struggling contract */
  static async getNudge(userId: string, contractId: string): Promise<string> {
    const supabase = await createClient()

    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('user_id', userId)
      .single()

    if (!contract) throw new Error('Contract not found')

    const { data: recentCheckins } = await supabase
      .from('contract_checkins')
      .select('date, met')
      .eq('contract_id', contractId)
      .order('date', { ascending: false })
      .limit(14)

    const metDays = (recentCheckins ?? []).filter((c) => c.met).length
    const totalDays = (recentCheckins ?? []).length

    const prompt = `You are VitaMind. Write a brief, warm accountability nudge for this contract:

CONTRACT: "${contract.title}"
COMMITMENT: "${contract.commitment}"
STAKES: "${contract.stakes ?? 'none'}"
PROGRESS: ${contract.progress}% (${metDays}/${totalDays} recent check-ins met)
MISSES: ${contract.misses} total

Write 2-3 sentences. Be encouraging but honest. If they're struggling, suggest one specific action. Under 80 words.`

    try {
      return await complete({ prompt, maxTokens: 150 })
    } catch {
      return `You've met ${metDays} of your last ${totalDays} check-ins for "${contract.title}". Keep going!`
    }
  }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { complete } from '@/features/ai/services/ai-provider'

export interface FutureMessage {
  id: string
  user_id: string
  message: string
  deliver_at: string    // YYYY-MM-DD
  delivered: boolean
  ai_forecast: string | null
  created_at: string
  days_until: number    // computed
  is_past: boolean      // deliver_at < today
}

export class FutureSelfService {
  static async getMessages(userId: string): Promise<FutureMessage[]> {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('future_messages')
      .select('*')
      .eq('user_id', userId)
      .order('deliver_at', { ascending: true })

    const today = new Date().toISOString().split('T')[0]

    return (data ?? []).map((m) => {
      const deliverAt = m.deliver_at as string
      const diffMs = new Date(deliverAt).getTime() - new Date(today).getTime()
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))
      return {
        id: m.id as string,
        user_id: m.user_id as string,
        message: m.message as string,
        deliver_at: deliverAt,
        delivered: m.delivered as boolean,
        ai_forecast: m.ai_forecast as string | null,
        created_at: m.created_at as string,
        days_until: daysUntil,
        is_past: daysUntil < 0,
      }
    })
  }

  static async createMessage(
    userId: string,
    message: string,
    deliverAt: string,
  ): Promise<FutureMessage> {
    const supabase = createAdminClient()

    // Fetch behavioral context for AI forecast
    const today = new Date()
    const sinceStr = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sinceDate = sinceStr.split('T')[0]
    const deliverDate = new Date(deliverAt)
    const monthsAhead = Math.round((deliverDate.getTime() - today.getTime()) / (30 * 24 * 60 * 60 * 1000))

    const [{ data: habits }, { data: habitLogs }, { data: tasks }, { data: goals }] = await Promise.all([
      supabase.from('habits').select('title').eq('user_id', userId).eq('is_active', true),
      supabase.from('habit_logs').select('habit_id, status').eq('user_id', userId).gte('date', sinceDate).eq('status', 'completed'),
      supabase.from('tasks').select('status').eq('user_id', userId).gte('created_at', sinceStr),
      supabase.from('goals').select('title, progress, domain').eq('user_id', userId).eq('is_completed', false).limit(4),
    ])

    const completedTasks = (tasks ?? []).filter((t: { status: string }) => t.status === 'completed').length
    const totalTasks = (tasks ?? []).length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const activeHabits = (habits ?? []).map((h: { title: string }) => h.title)
    const habitCompletions = (habitLogs ?? []).length
    const activeGoals = (goals ?? []).map((g: { title: string; progress: number; domain?: string }) =>
      `${g.title} (${g.progress}% done)`
    )

    const forecast = await this.generateForecast(
      message,
      monthsAhead,
      activeHabits,
      habitCompletions,
      completionRate,
      activeGoals,
    ).catch(() => null)

    const { data: row, error } = await supabase
      .from('future_messages')
      .insert({
        user_id: userId,
        message,
        deliver_at: deliverAt,
        ai_forecast: forecast,
      })
      .select()
      .single()

    if (error) throw error

    const diffMs = new Date(deliverAt).getTime() - new Date().getTime()
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))

    return {
      id: row.id as string,
      user_id: row.user_id as string,
      message: row.message as string,
      deliver_at: row.deliver_at as string,
      delivered: row.delivered as boolean,
      ai_forecast: row.ai_forecast as string | null,
      created_at: row.created_at as string,
      days_until: daysUntil,
      is_past: daysUntil < 0,
    }
  }

  static async deleteMessage(userId: string, messageId: string): Promise<void> {
    const supabase = createAdminClient()
    await supabase
      .from('future_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId)
  }

  private static async generateForecast(
    message: string,
    monthsAhead: number,
    activeHabits: string[],
    habitCompletions: number,
    taskCompletionRate: number,
    activeGoals: string[],
  ): Promise<string> {
    const prompt = `You are VitaMind's Future Self Oracle. A user is writing a message to their future self ${monthsAhead} month${monthsAhead !== 1 ? 's' : ''} from now.

Their message: "${message}"

Current behavioral data (last 30 days):
- Active habits: ${activeHabits.join(', ') || 'None'}
- Habit completions: ${habitCompletions} in 30 days
- Task completion rate: ${taskCompletionRate}%
- Active goals: ${activeGoals.join('; ') || 'None'}

Generate a short, warm, and honest behavioral forecast for what their life might look like in ${monthsAhead} month${monthsAhead !== 1 ? 's' : ''} IF they maintain their current trajectory. Be specific to their actual habits and goals. Be motivating but realistic. 2-3 sentences only.`

    return complete({ prompt, maxTokens: 200, temperature: 0.7 })
  }
}

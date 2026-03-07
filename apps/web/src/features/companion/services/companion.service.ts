import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { PatternOracleService } from '@/features/pattern-oracle/services/oracle.service'

export interface CompanionMemory {
  personality: string     // inferred personality traits, communication style
  seasonal: string        // patterns by month/season
  struggles: string       // recurring challenges
  victories: string       // past wins and milestones
  preferences: string     // what the user cares about most
}

const MEMORY_KEYS = ['personality', 'seasonal', 'struggles', 'victories', 'preferences'] as const

export class CompanionService {
  static async getMemory(userId: string): Promise<Partial<CompanionMemory>> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('companion_memory')
      .select('memory_key, content')
      .eq('user_id', userId)

    const memory: Partial<CompanionMemory> = {}
    for (const row of data ?? []) {
      if (MEMORY_KEYS.includes(row.memory_key as typeof MEMORY_KEYS[number])) {
        (memory as Record<string, string>)[row.memory_key] = row.content
      }
    }
    return memory
  }

  static async updateMemory(userId: string, key: typeof MEMORY_KEYS[number], content: string): Promise<void> {
    const supabase = await createClient()
    await supabase
      .from('companion_memory')
      .upsert(
        { user_id: userId, memory_key: key, content, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,memory_key' },
      )
  }

  /**
   * Initialise memory from existing data if not yet set.
   * Safe to call on every chat load — only writes if memory is empty.
   */
  static async initialiseMemoryIfEmpty(userId: string): Promise<void> {
    const memory = await this.getMemory(userId)
    if (Object.keys(memory).length >= 3) return  // already initialised

    const supabase = await createClient()
    const month = new Date().toLocaleString('en-US', { month: 'long' })

    const [
      { data: user },
      momentumResult,
      patternsResult,
      { data: recentTasks },
    ] = await Promise.all([
      supabase.from('users').select('name, created_at').eq('id', userId).single(),
      MomentumService.getCurrentScore(userId).catch(() => null),
      PatternOracleService.getInsights(userId).catch(() => ({ insights: [], keystone_habit: null, has_enough_data: false })),
      supabase.from('tasks').select('title, status, priority').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ])

    const taskTitles = (recentTasks ?? []).map((t) => t.title).join(', ')
    const topPatterns = patternsResult.insights.slice(0, 3).map((p) => `${(p as { title: string }).title}`).join(', ')
    const momentum = momentumResult

    const initPrompt = `Based on this user's data, write brief personality and context notes for their AI Life Companion.

User: ${user?.name ?? 'Unknown'} | Member since: ${user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'recently'}
Current month: ${month}
Recent task titles: ${taskTitles || 'none yet'}
Top behavioral patterns: ${topPatterns || 'none yet'}
${momentum ? `Momentum: ${momentum.score}/100 | Burnout risk: ${momentum.burnout_risk}/100` : ''}

Write in JSON (no markdown):
{
  "personality": "2-3 sentences on inferred personality traits and preferred communication style based on tasks/patterns",
  "seasonal": "1-2 sentences on what ${month} typically means for this type of user, seasonal awareness",
  "struggles": "1-2 sentences on likely recurring challenges based on data",
  "victories": "1-2 sentences on wins and achievements worth acknowledging",
  "preferences": "1-2 sentences on what this user values most based on their focus areas"
}`

    try {
      const raw = await complete({ prompt: initPrompt, maxTokens: 400, temperature: 0.6 })
      const parsed = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()) as Partial<CompanionMemory>
      for (const key of MEMORY_KEYS) {
        const val = (parsed as Record<string, string>)[key]
        if (val) await this.updateMemory(userId, key, val)
      }
    } catch {
      // If AI fails, set minimal defaults
      await this.updateMemory(userId, 'personality', 'Goal-oriented and self-improving. Prefers direct, actionable advice.')
      await this.updateMemory(userId, 'seasonal', `Currently in ${month} — a time for reflection and renewed focus.`)
    }
  }

  static async buildSystemPrompt(userId: string, userName: string): Promise<string> {
    const memory = await this.getMemory(userId)
    const month = new Date().toLocaleString('en-US', { month: 'long' })
    const hour = new Date().getHours()
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

    const memoryBlock = Object.entries(memory)
      .map(([key, val]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`)
      .join('\n')

    return `You are VitaMind Companion, a warm and emotionally intelligent AI life companion for ${userName}.

It is currently ${timeOfDay} in ${month}.

What you know about ${userName}:
${memoryBlock || 'Still learning about this user — ask thoughtful questions to understand them better.'}

Your role:
- Be a trusted companion, not just a productivity tool
- Reference what you know about them naturally (not robotically)
- Provide emotional support when they seem stressed or struggling
- Celebrate their wins genuinely
- Be seasonally aware — acknowledge how ${month} feels and what it brings
- Ask follow-up questions to deepen your understanding
- When appropriate, update your understanding of them based on what they share

Tone: Warm, honest, insightful. Like a wise friend who genuinely knows you. Never robotic or generic.`
  }

  /**
   * After a conversation, extract key learnings and update companion memory.
   */
  static async updateMemoryFromConversation(
    userId: string,
    messages: { role: string; content: string }[],
  ): Promise<void> {
    if (messages.length < 4) return  // not enough to learn from

    const conversationText = messages
      .slice(-10)  // last 10 messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')

    const updatePrompt = `Based on this conversation, identify any NEW insights about the user that should update their companion memory. Only include if something meaningfully new was learned — do not repeat existing knowledge.

Conversation:
${conversationText}

Current memory keys: personality, seasonal, struggles, victories, preferences

Respond in JSON (no markdown). Only include keys where something new was learned. Empty object {} if nothing new:
{"personality":"...","struggles":"...","victories":"...","preferences":"..."}`

    try {
      const raw = await complete({ prompt: updatePrompt, maxTokens: 300, temperature: 0.3 })
      const parsed = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()) as Partial<CompanionMemory>
      for (const key of MEMORY_KEYS) {
        const val = (parsed as Record<string, string>)[key]
        if (val && val.trim()) await this.updateMemory(userId, key, val)
      }
    } catch {
      // Memory update is non-critical — silently skip
    }
  }
}

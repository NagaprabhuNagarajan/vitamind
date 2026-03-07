import { createClient } from '@/lib/supabase/server'
import { complete } from '@/features/ai/services/ai-provider'
import { MomentumService } from '@/features/momentum/services/momentum.service'
import { PatternOracleService } from '@/features/pattern-oracle/services/oracle.service'

export interface DecisionOption {
  option: string
  pros: string[]
  cons: string[]
  goal_alignment: number    // 0–100
  risk_level: 'low' | 'medium' | 'high'
  effort_required: 'low' | 'medium' | 'high'
}

export interface DecisionAnalysis {
  recommendation: string          // which option + one-line reason
  options_analysis: DecisionOption[]
  key_considerations: string[]    // 3–5 things to weigh
  confidence: 'high' | 'medium' | 'low'
}

export interface Decision {
  id: string
  user_id: string
  question: string
  options: string[]
  analysis: DecisionAnalysis | null
  created_at: string
}

export class DecisionEngineService {
  static async analyze(
    userId: string,
    question: string,
    options: string[],
  ): Promise<Decision> {
    const supabase = await createClient()

    // Fetch user context to inform decision alignment with their goals/momentum
    const [
      { data: goals },
      momentumResult,
      patternsResult,
    ] = await Promise.all([
      supabase.from('goals').select('title, progress, domain').eq('user_id', userId).eq('is_active', true).limit(5),
      MomentumService.getCurrentScore(userId).catch(() => null),
      PatternOracleService.getInsights(userId).catch(() => ({ insights: [], keystone_habit: null, has_enough_data: false })),
    ])

    const goalsList = (goals ?? []).map((g) => `${g.title} (${g.progress ?? 0}% done${g.domain ? `, domain: ${g.domain}` : ''})`).join('; ')
    const topPatterns = patternsResult.insights.slice(0, 3).map((p) => `${(p as { title: string }).title}`).join(', ')
    const mom = momentumResult

    const prompt = `You are VitaMind's Decision Engine. Analyse this personal decision and provide structured, data-backed guidance.

DECISION: "${question}"

OPTIONS TO EVALUATE:
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

USER CONTEXT:
${goalsList ? `Active goals: ${goalsList}` : 'No active goals yet'}
${mom ? `Momentum: ${mom.score}/100 | Burnout risk: ${mom.burnout_risk}/100 | Energy: ${100 - mom.burnout_risk}/100` : ''}
${topPatterns ? `Key behavioural patterns: ${topPatterns}` : ''}

Evaluate each option against the user's goals, current energy level, and behavioural patterns.

Respond in JSON only (no markdown):
{
  "recommendation": "Recommend option X because...",
  "options_analysis": [
    {
      "option": "exact option text",
      "pros": ["pro 1", "pro 2", "pro 3"],
      "cons": ["con 1", "con 2"],
      "goal_alignment": 75,
      "risk_level": "medium",
      "effort_required": "high"
    }
  ],
  "key_considerations": ["consideration 1", "consideration 2", "consideration 3"],
  "confidence": "high"
}`

    const raw = await complete({ prompt, maxTokens: 900, temperature: 0.4 })
    const parsed = JSON.parse(raw.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()) as DecisionAnalysis

    const { data, error } = await supabase
      .from('decisions')
      .insert({
        user_id: userId,
        question,
        options,
        analysis: parsed,
      })
      .select()
      .single()

    if (error) throw error
    return data as Decision
  }

  static async getHistory(userId: string, limit = 20): Promise<Decision[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as Decision[]
  }

  static async deleteDecision(userId: string, id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('decisions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error
  }
}

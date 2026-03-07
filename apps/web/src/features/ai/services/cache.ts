import { createAdminClient } from '@/lib/supabase/admin'
import type { InsightType } from '@/lib/types'

const CACHE_TTL: Record<InsightType, number> = {
  daily_plan: 12 * 60 * 60 * 1000,        // 12 hours — one plan per half-day
  productivity: 6 * 60 * 60 * 1000,       // 6 hours
  life_optimization: 24 * 60 * 60 * 1000, // 24 hours
  life_coach: 24 * 60 * 60 * 1000,        // 24 hours
  cross_domain: 6 * 60 * 60 * 1000,       // 6 hours
  knowledge_graph: 24 * 60 * 60 * 1000,   // 24 hours
}

// Returns cached AI response if still fresh, null otherwise
export async function getCachedInsight(userId: string, type: InsightType): Promise<string | null> {
  const supabase = createAdminClient()
  const ttl = CACHE_TTL[type]
  const since = new Date(Date.now() - ttl).toISOString()

  const { data } = await supabase
    .from('ai_insights')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data?.content ?? null
}

// Saves a new AI insight — trims old ones to keep table lean (max 30 per type per user)
export async function saveInsight(
  userId: string,
  type: InsightType,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient()

  await supabase.from('ai_insights').insert({
    user_id: userId,
    type,
    content,
    metadata: metadata ?? {},
  })

  // Trim: keep only the last 30 insights of this type per user
  const { data: old } = await supabase
    .from('ai_insights')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .range(30, 1000)

  if (old?.length) {
    await supabase
      .from('ai_insights')
      .delete()
      .in('id', old.map((r) => r.id))
  }
}

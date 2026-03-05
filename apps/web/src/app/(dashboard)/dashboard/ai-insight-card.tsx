import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

export async function AIInsightCard({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: insight } = await supabase
    .from('ai_insights')
    .select('content, type, created_at')
    .eq('user_id', userId)
    .eq('type', 'daily_plan')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!insight) {
    return (
      <Link href="/planner" className="block group">
        <div className="relative rounded-xl overflow-hidden p-4 flex items-center gap-4 transition-all duration-200" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.08) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
          }}>
            <Sparkles className="w-4 h-4 text-primary-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">Generate today&apos;s AI plan</p>
            <p className="text-xs text-text-tertiary mt-0.5">VitaMind will analyse your tasks, goals, and habits</p>
          </div>
          <ArrowRight className="w-4 h-4 text-text-tertiary group-hover:text-primary-300 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>
      </Link>
    )
  }

  const preview = insight.content.split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 180)

  return (
    <div className="relative rounded-xl overflow-hidden p-5" style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.06) 60%, rgba(6,182,212,0.05) 100%)',
      border: '1px solid rgba(99,102,241,0.2)',
    }}>
      {/* Top glow */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6), rgba(168,85,247,0.4), transparent)',
      }} />

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
        }}>
          <Sparkles className="w-3.5 h-3.5 text-primary-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{
            background: 'linear-gradient(135deg, #818CF8, #C084FC)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            AI Daily Plan
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">{preview}&hellip;</p>
          <Link href="/planner" className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors">
            View full plan <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

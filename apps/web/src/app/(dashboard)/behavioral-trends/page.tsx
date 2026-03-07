import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { TrendsView } from './trends-view'

export const metadata = { title: 'Behavioral Trends' }
export const dynamic = 'force-dynamic'

export default async function BehavioralTrendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Behavioral Trends"
        description="Long-term patterns in your momentum, habits, and productivity over 90 days"
      />
      <TrendsView />
    </div>
  )
}

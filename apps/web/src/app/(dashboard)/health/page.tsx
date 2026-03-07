import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { HealthView } from './health-view'

export const metadata = { title: 'Health' }
export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health"
        description="Track sleep, steps, mood, and exercise — correlate health with productivity"
      />
      <HealthView />
    </div>
  )
}

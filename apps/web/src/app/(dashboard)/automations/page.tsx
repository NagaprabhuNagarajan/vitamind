import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AutomationsView } from './automations-view'

export const metadata = { title: 'Automations' }
export const dynamic = 'force-dynamic'

export default async function AutomationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Set up smart triggers to automatically create tasks, send notifications, or call webhooks"
      />
      <AutomationsView />
    </div>
  )
}

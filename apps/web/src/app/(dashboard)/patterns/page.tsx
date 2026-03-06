import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { PatternsList } from './patterns-list'

export const metadata = { title: 'Patterns' }
export const dynamic = 'force-dynamic'

export default async function PatternsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pattern Oracle"
        description="Hidden correlations discovered from your data"
      />
      <PatternsList />
    </div>
  )
}

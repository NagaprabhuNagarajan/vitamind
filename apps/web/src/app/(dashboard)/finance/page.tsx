import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { FinanceView } from './finance-view'

export const metadata = { title: 'Finance' }
export const dynamic = 'force-dynamic'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Track income, expenses, and monthly spending patterns"
      />
      <FinanceView />
    </div>
  )
}

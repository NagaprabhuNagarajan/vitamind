import { PageHeader } from '@/components/layout/page-header'
import { CompanionChat } from './companion-chat'

export const metadata = { title: 'AI Life Companion' }

export default function CompanionPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="AI Life Companion"
        description="A warm, emotionally intelligent companion who knows you and grows with you."
      />
      <CompanionChat />
    </div>
  )
}

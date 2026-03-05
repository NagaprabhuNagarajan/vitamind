import { PageHeader } from '@/components/layout/page-header'
import { ChatInterface } from './chat-interface'

export const metadata = { title: 'AI Assistant' }

export default function AIAssistantPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader
        title="AI Assistant"
        description="Ask anything about your tasks, goals, habits, or productivity."
      />
      <ChatInterface />
    </div>
  )
}

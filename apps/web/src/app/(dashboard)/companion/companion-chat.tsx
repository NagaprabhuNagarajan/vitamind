'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Heart } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const STARTER_PROMPTS = [
  'How am I doing lately?',
  'I\'m feeling overwhelmed today',
  'Help me reflect on this week',
  'What should I focus on for my wellbeing?',
]

export function CompanionChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }))
      const res = await fetch('/api/v1/ai/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      })
      const { data, error } = await res.json()
      if (error) throw new Error(error.message)

      setMessages((prev) => [
        ...prev,
        { ...data.message, timestamp: data.timestamp },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I\'m here, but ran into an issue. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 max-w-2xl">
      {/* Messages */}
      <div className="card flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[520px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <Heart className="w-5 h-5" style={{ color: '#A855F7' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary mb-1">Your AI Life Companion</p>
              <p className="text-xs text-text-tertiary max-w-xs">
                A warm, emotionally intelligent companion who remembers you and grows with you over time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center self-end" style={{ background: 'rgba(168,85,247,0.15)' }}>
                    <Heart className="w-3 h-3" style={{ color: '#A855F7' }} />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'text-text-primary rounded-bl-sm',
                  )}
                  style={msg.role === 'assistant' ? {
                    background: 'rgba(168,85,247,0.08)',
                    border: '1px solid rgba(168,85,247,0.15)',
                  } : {}}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 self-end flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
                  <Heart className="w-3 h-3" style={{ color: '#A855F7' }} />
                </div>
                <div className="rounded-xl rounded-bl-sm px-4 py-3" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <Spinner size="sm" className="text-text-tertiary" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input) }}
        className="flex gap-2 mt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share what's on your mind…"
          className="input flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3 rounded-lg transition-all disabled:opacity-40"
          style={{ background: 'rgba(168,85,247,0.8)' }}
          aria-label="Send"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  )
}

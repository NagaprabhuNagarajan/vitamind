// Unified AI provider — switches between OpenAI and Groq based on env config.
// Add new providers here without touching call sites.

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CompletionOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

export async function complete(options: CompletionOptions): Promise<string> {
  const provider = process.env.AI_PROVIDER ?? 'openai'

  if (provider === 'groq') {
    return completeWithGroq(options)
  }
  return completeWithOpenAI(options)
}

async function completeWithOpenAI({ messages, maxTokens = 800, temperature = 0.7 }: CompletionOptions): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',  // cost-optimised model
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}

async function completeWithGroq({ messages, maxTokens = 800, temperature = 0.7 }: CompletionOptions): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error: ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content as string
}

import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateArray, validateString, validateEnum, CHAT_ROLES } from '@/lib/api/validation'
import { complete } from '@/features/ai/services/ai-provider'
import { CompanionService } from '@/features/companion/services/companion.service'
import { createClient } from '@/lib/supabase/server'

interface Message { role: 'user' | 'assistant'; content: string }

export { OPTIONS }

export const POST = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const messages = validateArray<Message>(body.messages, 'messages', {
      required: true,
      maxLength: 20,
      itemValidator: (item, i) => {
        if (!item || typeof item !== 'object') {
          throw Errors.badRequest(`messages[${i}] must be an object with role and content`)
        }
        const msg = item as Record<string, unknown>
        const role = validateEnum(msg.role, `messages[${i}].role`, CHAT_ROLES, { required: true })!
        const content = validateString(msg.content, `messages[${i}].content`, { minLength: 1, maxLength: 4000, required: true })!
        return { role, content } as Message
      },
    })!

    const last = messages[messages.length - 1]
    if (last.role !== 'user') throw Errors.badRequest('Last message must be from user')

    // Fetch user's name
    const supabase = await createClient()
    const { data: userData } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()
    const userName = userData?.name ?? 'there'

    // Initialise companion memory on first use (no-op if already set)
    await CompanionService.initialiseMemoryIfEmpty(user.id)

    const systemPrompt = await CompanionService.buildSystemPrompt(user.id, userName)

    const reply = await complete({
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-12),
      ],
      maxTokens: 600,
      temperature: 0.75,
    })

    // Update memory from conversation asynchronously (non-blocking)
    const allMessages = [...messages, { role: 'assistant' as const, content: reply }]
    CompanionService.updateMemoryFromConversation(user.id, allMessages).catch(() => {})

    return successResponse({
      message: { role: 'assistant', content: reply },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[companion] error:', error instanceof Error ? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'ai-companion', tier: RateLimitTier.ai })))

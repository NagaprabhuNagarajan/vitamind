import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse, Errors } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { validateArray, validateString, validateEnum, CHAT_ROLES } from '@/lib/api/validation'
import { buildUserContext } from '@/features/ai/services/context'
import { buildChatSystemPrompt } from '@/features/ai/services/prompt-builder'
import { complete } from '@/features/ai/services/ai-provider'

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
        const content = validateString(msg.content, `messages[${i}].content`, { minLength: 1, maxLength: 2000, required: true })!
        return { role, content } as Message
      },
    })!

    // Validate last message is from user
    const last = messages[messages.length - 1]
    if (last.role !== 'user') throw Errors.badRequest('Last message must be from user')

    const ctx = await buildUserContext(user.id)
    const systemPrompt = buildChatSystemPrompt(ctx)

    const reply = await complete({
      messages: [
        { role: 'system', content: systemPrompt },
        // Include conversation history (max last 10 turns to cap tokens)
        ...messages.slice(-10),
      ],
      maxTokens: 400,
      temperature: 0.7,
    })

    return successResponse({
      message: { role: 'assistant', content: reply },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return errorResponse(error)
  }
}, { routeKey: 'ai-chat', tier: RateLimitTier.ai })))

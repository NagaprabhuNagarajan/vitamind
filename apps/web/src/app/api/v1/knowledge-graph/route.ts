import { requireAuth } from '@/lib/api/auth-guard'
import { errorResponse, successResponse } from '@/lib/api/errors'
import { withRateLimit, RateLimitTier } from '@/lib/api/rate-limit'
import { withCors, OPTIONS } from '@/lib/api/cors'
import { withLogging } from '@/lib/api/logger'
import { KnowledgeGraphService } from '@/features/knowledge-graph/services/knowledge-graph.service'

export { OPTIONS }

export const GET = withLogging(withCors(withRateLimit(async (request: Request) => {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const graph = await KnowledgeGraphService.getGraph(user.id, force)
    return successResponse(graph)
  } catch (error) {
    console.error('[knowledge-graph] error:', error instanceof Error ? error.stack ?? error.message : error)
    return errorResponse(error)
  }
}, { routeKey: 'knowledge-graph', tier: RateLimitTier.ai })))

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ConversationService } from '@/lib/services/conversation.service'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId') ?? undefined
  const projectId = searchParams.get('projectId') ?? undefined

  const result = await ConversationService.aggregateTokenUsage({ taskId, projectId })

  return NextResponse.json({
    totalInput: result.totalInput,
    totalOutput: result.totalOutput,
    totalTokens: result.totalTokens,
    conversationCount: result.conversationCount,
    byTask: result.byTask,
  })
})

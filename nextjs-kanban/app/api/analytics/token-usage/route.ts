import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ConversationService } from '@/lib/services/conversation.service'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId') ?? undefined
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const result = await ConversationService.aggregateTokenUsage({
    taskId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  })

  return NextResponse.json({
    summary: {
      totalConversations: result.conversationCount,
      conversationsWithUsage: result.conversationsWithUsage,
      totalInputTokens: result.totalInput,
      totalOutputTokens: result.totalOutput,
      totalTokens: result.totalTokens,
    },
    byTask: result.byTask.reduce((acc, e) => {
      acc[e.taskId] = { input: e.input, output: e.output, count: e.conversationCount }
      return acc
    }, {} as Record<string, { input: number; output: number; count: number }>),
  })
})

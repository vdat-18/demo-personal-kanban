import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ConversationService } from '@/lib/services/conversation.service'
import { createConversationSchema } from '@/lib/validations/schemas'
import type { ConversationMessage } from '@/lib/types/json-fields'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get('taskId') ?? undefined
  const limit = parseInt(searchParams.get('limit') || '10')
  const offset = parseInt(searchParams.get('offset') || '0')

  const conversations = await ConversationService.list(taskId, limit, offset)
  return NextResponse.json(conversations)
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = createConversationSchema.parse(body)

  const conversation = await ConversationService.create({
    ...data,
    messages: data.messages.map((m): ConversationMessage => ({
      ...m,
      toolCalls: m.toolCalls as ConversationMessage['toolCalls'],
      timestamp: m.timestamp ? new Date(m.timestamp as string) : new Date(),
    })),
  })
  return NextResponse.json(conversation, { status: 201 })
})

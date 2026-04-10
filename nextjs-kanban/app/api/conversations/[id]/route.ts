import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { ConversationService } from '@/lib/services/conversation.service'

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const conversation = await ConversationService.get(id)
  return NextResponse.json(conversation)
})

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  await ConversationService.delete(id)
  return new NextResponse(null, { status: 204 })
})

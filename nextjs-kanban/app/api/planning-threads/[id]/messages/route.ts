import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { uuidSchema, sendPlanningMessageSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  uuidSchema.parse(id)
  const messages = await PlanningService.listMessages(id)
  return NextResponse.json(messages)
})

export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Params }) => {
  const { id: threadId } = await params
  uuidSchema.parse(threadId)
  const body = await request.json()
  const { content } = sendPlanningMessageSchema.parse(body)

  const result = await PlanningService.sendMessage(threadId, content)
  return NextResponse.json(result)
})

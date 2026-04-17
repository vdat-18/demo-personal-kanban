import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { uuidSchema, mutationActionSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string; messageId: string }>

export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Params }) => {
  const { messageId } = await params
  uuidSchema.parse(messageId)

  const body = await request.json()
  const { mutationIndex, action } = mutationActionSchema.parse(body)

  const result = await PlanningService.persistMutationAction(
    messageId,
    mutationIndex,
    action,
  )

  return NextResponse.json(result)
})

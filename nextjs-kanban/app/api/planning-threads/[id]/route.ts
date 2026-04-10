import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { uuidSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  uuidSchema.parse(id)
  const thread = await PlanningService.getThread(id)
  return NextResponse.json(thread)
})

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  uuidSchema.parse(id)
  await PlanningService.deleteThread(id)
  return new NextResponse(null, { status: 204 })
})

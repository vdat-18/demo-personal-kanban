import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { PlanningService } from '@/lib/services/planning.service'
import { createPlanningThreadSchema, planningThreadQuerySchema } from '@/lib/validations/schemas'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const { projectId } = planningThreadQuerySchema.parse({
    projectId: searchParams.get('projectId'),
  })
  const threads = await PlanningService.listThreads(projectId)
  return NextResponse.json(threads)
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { projectId, title } = createPlanningThreadSchema.parse(body)
  const thread = await PlanningService.createThread(projectId, title)
  return NextResponse.json(thread, { status: 201 })
})

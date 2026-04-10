import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { runTasks } from '@/lib/agents/orchestrator'
import { runTasksSchema } from '@/lib/validations/schemas'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = runTasksSchema.parse(body)
  const result = await runTasks(data.tasks)
  return NextResponse.json(result)
})

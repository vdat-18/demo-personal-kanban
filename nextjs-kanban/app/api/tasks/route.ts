import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { TaskService } from '@/lib/services/task.service'
import { createTaskSchema, taskStatusSchema } from '@/lib/validations/schemas'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? undefined
  const projectId = searchParams.get('projectId') ?? undefined

  if (status) taskStatusSchema.parse(status)

  const tasks = await TaskService.list(status, projectId)
  return NextResponse.json(tasks)
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = createTaskSchema.parse(body)
  const task = await TaskService.create(data)
  return NextResponse.json(task, { status: 201 })
})

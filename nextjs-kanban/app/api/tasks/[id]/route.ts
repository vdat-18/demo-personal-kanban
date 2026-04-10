import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { TaskService } from '@/lib/services/task.service'
import { updateTaskSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  const task = await TaskService.get(id)
  return NextResponse.json(task)
})

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  const body = await request.json()
  const data = updateTaskSchema.parse(body)
  const task = await TaskService.update(id, data)
  return NextResponse.json(task)
})

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Params }) => {
  const { id } = await params
  await TaskService.delete(id)
  return NextResponse.json({ success: true })
})

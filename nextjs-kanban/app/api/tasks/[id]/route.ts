import { NextRequest, NextResponse } from 'next/server'
import { getTask, updateTask, deleteTask } from '@/lib/db/tasks'
import { z } from 'zod'

const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])
const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  projectId: z.string().uuid().optional().nullable(),
})

type Params = Promise<{ id: string }>

export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params
    const task = await getTask(id)

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    const task = await updateTask(id, validatedData)

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params
    await deleteTask(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}

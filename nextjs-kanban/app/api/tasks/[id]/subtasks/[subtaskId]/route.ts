import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { id, subtaskId } = await params
    const body = await request.json()

    // Validate if the subtask belongs to the task (optional safety check)
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId }
    })

    if (!subtask || subtask.taskId !== id) {
      return NextResponse.json({ error: 'Subtask not found or belongs to another task' }, { status: 404 })
    }

    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        completed: typeof body.completed === 'boolean' ? body.completed : undefined,
        title: body.title !== undefined ? body.title : undefined
      }
    })

    return NextResponse.json(updatedSubtask)
  } catch (error) {
    console.error('Error updating subtask:', error)
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
  }
}

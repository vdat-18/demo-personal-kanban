import { NextRequest, NextResponse } from 'next/server'
import { getThreadsByProject, createThread } from '@/lib/db/planning-threads'
import { z } from 'zod'
import {
  createPlanningThreadSchema,
  planningThreadQuerySchema,
} from '@/lib/validations/schemas'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { projectId } = planningThreadQuerySchema.parse({
      projectId: searchParams.get('projectId'),
    })

    const threads = await getThreadsByProject(projectId)

    // Include a preview of the last message for each thread
    const threadsWithPreview = threads.map((thread) => ({
      id: thread.id,
      projectId: thread.projectId,
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      lastMessage: thread.messages[0]?.content?.slice(0, 100) ?? null,
      lastMessageAt: thread.messages[0]?.createdAt ?? null,
    }))

    return NextResponse.json(threadsWithPreview)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error fetching planning threads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch planning threads' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title } = createPlanningThreadSchema.parse(body)

    const thread = await createThread(projectId, title)

    return NextResponse.json(thread, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error creating planning thread:', error)
    return NextResponse.json(
      { error: 'Failed to create planning thread' },
      { status: 500 },
    )
  }
}

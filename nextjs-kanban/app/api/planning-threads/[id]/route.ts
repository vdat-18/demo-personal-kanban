import { NextRequest, NextResponse } from 'next/server'
import { getThread, deleteThread } from '@/lib/db/planning-threads'
import { z } from 'zod'
import { uuidSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export async function GET(
  _request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { id } = await params
    uuidSchema.parse(id)

    const thread = await getThread(id)

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    return NextResponse.json(thread)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error fetching planning thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch planning thread' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { id } = await params
    uuidSchema.parse(id)

    await deleteThread(id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error deleting planning thread:', error)
    return NextResponse.json(
      { error: 'Failed to delete planning thread' },
      { status: 500 },
    )
  }
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { id } = await params
    uuidSchema.parse(id)

    const body = await request.json()
    const { title } = z.object({ title: z.string().min(1) }).parse(body)

    const { updateThread } = await import('@/lib/db/planning-threads')
    const thread = await updateThread(id, { title })

    return NextResponse.json(thread)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error updating planning thread:', error)
    return NextResponse.json(
      { error: 'Failed to update planning thread' },
      { status: 500 },
    )
  }
}

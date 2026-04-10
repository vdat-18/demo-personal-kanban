import { NextRequest, NextResponse } from 'next/server'
import { getConversations, createConversation } from '@/lib/db/conversations'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().or(z.date()),
  toolCalls: z.any().optional(),
})

const createConversationSchema = z.object({
  taskId: z.string().uuid().optional(),
  messages: z.array(messageSchema),
  result: z.any().optional(),
  tokenUsage: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const conversations = await getConversations(
      taskId || undefined,
      limit,
      offset
    )

    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createConversationSchema.parse(body)

    const conversation = await createConversation({
      ...validatedData,
      messages: validatedData.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

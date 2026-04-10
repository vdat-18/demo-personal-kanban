import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { uuidSchema } from '@/lib/validations/schemas'
import prisma from '@/lib/db/client'

const mutationActionSchema = z.object({
  mutationIndex: z.number().int().min(0),
  action: z.enum(['approved', 'dismissed']),
})

type Params = Promise<{ id: string; messageId: string }>

export async function POST(
  request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { messageId } = await params
    uuidSchema.parse(messageId)

    const body = await request.json()
    const { mutationIndex, action } = mutationActionSchema.parse(body)

    // Upsert: create or update the action for this message+index
    const result = await prisma.mutationAction.upsert({
      where: {
        messageId_mutationIndex: { messageId, mutationIndex },
      },
      update: { action },
      create: { messageId, mutationIndex, action },
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error saving mutation action:', error)
    return NextResponse.json(
      { error: 'Failed to save mutation action' },
      { status: 500 },
    )
  }
}

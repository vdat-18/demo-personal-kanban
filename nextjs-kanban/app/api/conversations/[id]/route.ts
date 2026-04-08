import { NextRequest, NextResponse } from 'next/server'
import { getConversation, updateConversation, deleteConversation } from '@/lib/db/conversations'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const conversation = await getConversation(id)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteConversation(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}

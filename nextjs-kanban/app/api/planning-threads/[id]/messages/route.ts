import { NextRequest, NextResponse } from 'next/server'
import { getMessagesByThread, createMessage, getRecentMessages } from '@/lib/db/planning-messages'
import { getThread, updateThread } from '@/lib/db/planning-threads'
import type { PlanningPhase } from '@/lib/db/planning-threads'
import { runAgent } from '@/lib/agents/orchestrator'
import { buildPlanPrompt, extractPhaseTransition, extractVisionDocument } from '@/lib/agents/prompts'
import { z } from 'zod'
import { uuidSchema, sendPlanningMessageSchema } from '@/lib/validations/schemas'

type Params = Promise<{ id: string }>

export async function GET(
  _request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { id } = await params
    uuidSchema.parse(id)

    const messages = await getMessagesByThread(id)

    return NextResponse.json(messages)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error fetching planning messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch planning messages' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params },
) {
  try {
    const { id: threadId } = await params
    uuidSchema.parse(threadId)

    const body = await request.json()
    const { content } = sendPlanningMessageSchema.parse(body)

    // Verify thread exists and get project info
    const thread = await getThread(threadId)
    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Persist the user message
    const userMessage = await createMessage(threadId, 'user', content)

    // Auto-title: if thread is "New Thread" and this is the first user message, update title
    const userMsgCount = thread.messages.filter((m) => m.role === 'user').length
    if (thread.title === 'New Thread' && userMsgCount === 0) {
      const autoTitle = content.slice(0, 80) + (content.length > 80 ? '…' : '')
      await updateThread(threadId, { title: autoTitle })
    }

    // Get recent messages for conversation history
    const recentMessages = await getRecentMessages(threadId, 20)
    const conversationHistory = recentMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Current phase context
    const currentPhase = (thread as any).phase as PlanningPhase ?? 'discovery'
    const currentVisionDoc = (thread as any).visionDocument as string | null ?? null

    // Build the prompt with phase awareness
    const prompt = await buildPlanPrompt(
      content,
      thread.projectId,
      conversationHistory,
      currentPhase,
      currentVisionDoc,
    )

    // Call the AI planning agent
    const agentResult = await runAgent('architect', prompt)
    const resultText = (agentResult as any)?.output ?? String(agentResult)
    const tokenUsage = (agentResult as any)?.tokenUsage ?? null

    // Auto-detect phase transition from AI response
    const newPhase = extractPhaseTransition(resultText, currentPhase)
    const newVisionDoc = extractVisionDocument(resultText, currentVisionDoc)

    // Persist updates to the thread (phase + vision doc)
    const threadUpdates: { phase?: PlanningPhase; visionDocument?: string } = {}
    if (newPhase && newPhase !== currentPhase) threadUpdates.phase = newPhase
    if (newVisionDoc !== null) threadUpdates.visionDocument = newVisionDoc
    if (Object.keys(threadUpdates).length > 0) {
      await updateThread(threadId, threadUpdates)
    }

    // Persist the assistant response
    const assistantMessage = await createMessage(threadId, 'assistant', resultText, tokenUsage)

    return NextResponse.json({
      userMessage,
      assistantMessage,
      tokenUsage,
      phase: newPhase ?? currentPhase,
      visionDocument: newVisionDoc ?? currentVisionDoc,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      )
    }

    console.error('Error sending planning message:', error)
    return NextResponse.json(
      { error: 'Failed to send planning message' },
      { status: 500 },
    )
  }
}

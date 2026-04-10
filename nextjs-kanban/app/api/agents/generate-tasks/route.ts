import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { AgentService } from '@/lib/services/agent.service'
import { generateTasksSchema } from '@/lib/validations/schemas'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { projectId, messages } = generateTasksSchema.parse(body)

  try {
    const result = await AgentService.generateTasks(
      projectId,
      messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    )
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'Failed to parse tasks from AI response') {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    throw err
  }
})

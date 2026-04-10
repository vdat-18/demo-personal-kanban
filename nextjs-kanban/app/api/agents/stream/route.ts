import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { AgentService } from '@/lib/services/agent.service'
import { chatStreamSchema } from '@/lib/validations/schemas'
import type { AgentRole } from '@/lib/agents/configs'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { role, userMessage, taskId, messages: existingMessages } = chatStreamSchema.parse(body)

  const stream = AgentService.createStream(
    role as AgentRole,
    userMessage,
    taskId,
    existingMessages,
  )

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})

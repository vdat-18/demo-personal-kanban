import { NextRequest } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { AgentService } from '@/lib/services/agent.service'
import { chatStreamSchema } from '@/lib/validations/schemas'
import type { AgentRole } from '@/lib/agents/configs'
import { isAgnoBackend, smartRunStream, AgnoServiceError } from '@/lib/agno-client'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { role, userMessage, taskId, messages: existingMessages } = chatStreamSchema.parse(body)

  // ── Agno backend (default) ────────────────────────────────────────────────
  if (isAgnoBackend()) {
    try {
      const agnoResponse = await smartRunStream({ message: userMessage, stream: true })

      return new Response(agnoResponse.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      })
    } catch (err) {
      if (err instanceof AgnoServiceError) {
        // Fallback to multi-agent system
        console.warn(`[stream] Agno unavailable (${err.code}), falling back to multi-agent`)
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
            'X-Agent-Fallback': 'true',
          },
        })
      }
      throw err
    }
  }

  // ── Multi-agent backend ───────────────────────────────────────────────────
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

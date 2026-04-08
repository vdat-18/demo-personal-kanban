import { NextRequest } from 'next/server'
import { runAgent } from '@/lib/agents/orchestrator'
import type { AgentRole } from '@/lib/agents/configs'
import { getAvailableAgents } from '@/lib/agents/configs'
import { z } from 'zod'

const streamAgentSchema = z.object({
  // Use z.enum with runtime values from getAvailableAgents()
  role: z.string().refine(
    (v): v is AgentRole => (getAvailableAgents() as string[]).includes(v),
    { message: 'Invalid agent role' }
  ),
  prompt: z.string().min(1, 'Prompt is required'),
  // Optional task context to include in progress events
  taskId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = streamAgentSchema.parse(body)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        // Emit a progress event as SSE
        const emit = (payload: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          } catch {
            // controller may already be closed if client disconnected
          }
        }

        const onProgress = (event: unknown) => {
          emit({ type: 'progress', ...(event as Record<string, unknown>) })
        }

        try {
          // Send an initial "started" event so the client knows the stream is live
          emit({ type: 'started', role: validatedData.role })

          const agentResult = await runAgent(
            validatedData.role as AgentRole,
            validatedData.prompt,
            onProgress
          )

          // Extract result and tokenUsage from agent response
          const result = (agentResult as any)?.output ?? agentResult
          const tokenUsage = (agentResult as any)?.tokenUsage ?? null

          emit({ type: 'complete', result, ...(tokenUsage ? { tokenUsage } : {}) })
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          emit({ type: 'error', error: errorMessage })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.error('Error streaming agent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to stream agent' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

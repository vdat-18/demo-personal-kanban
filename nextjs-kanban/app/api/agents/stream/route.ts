import { NextRequest } from 'next/server'
import {
  Agent,
  ToolRegistry,
  ToolExecutor,
  registerBuiltInTools,
} from '@jackchen_me/open-multi-agent'
import { buildChatPrompt } from '@/lib/agents/prompts'
import { agentConfigs } from '@/lib/agents/configs'
import type { AgentRole } from '@/lib/agents/configs'
import { allTools } from '@/lib/agents/tools'
import { z } from 'zod'
import { agentRoleSchema, uuidSchema } from '@/lib/validations/schemas'

const chatStreamSchema = z.object({
  role: agentRoleSchema,
  userMessage: z.string().min(1).max(10000),
  taskId: uuidSchema,
})

function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registerBuiltInTools(registry)
  for (const tool of allTools) registry.register(tool)
  return registry
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, userMessage, taskId } = chatStreamSchema.parse(body)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (payload: Record<string, unknown>) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          } catch {
            // client disconnected
          }
        }

        try {
          emit({ type: 'started', role })

          const prompt = await buildChatPrompt(role as AgentRole, userMessage, taskId)

          const registry = buildRegistry()
          const executor = new ToolExecutor(registry)
          const agent = new Agent(agentConfigs[role as AgentRole], registry, executor)

          // Stream token-by-token from the SDK
          for await (const event of agent.stream(prompt)) {
            if (event.type === 'text') {
              emit({ type: 'token', delta: event.data as string })
            } else if (event.type === 'tool_use') {
              emit({ type: 'progress', message: `Using tool: ${(event.data as any)?.name ?? '…'}` })
            } else if (event.type === 'done') {
              const llmResponse = event.data as any
              const tokenUsage = llmResponse?.usage
                ? { input: llmResponse.usage.input_tokens, output: llmResponse.usage.output_tokens }
                : null
              emit({ type: 'complete', ...(tokenUsage ? { tokenUsage } : {}) })
            } else if (event.type === 'error') {
              throw event.data instanceof Error ? event.data : new Error(String(event.data))
            }
          }

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
        'X-Accel-Buffering': 'no',
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

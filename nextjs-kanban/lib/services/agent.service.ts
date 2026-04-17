/**
 * Agent Service — business logic for agent operations.
 * Consolidates streaming, plan, and task generation logic.
 */

import {
  Agent,
  ToolRegistry,
  ToolExecutor,
  registerBuiltInTools,
} from '@jackchen_me/open-multi-agent'
import type { AgentRunResult } from '@jackchen_me/open-multi-agent'
import { buildChatPrompt, buildPlanPrompt, buildGenerateTasksPrompt, type ConversationMessage as PromptConversationMessage } from '@/lib/agents/prompts'
import { agentConfigs } from '@/lib/agents/configs'
import type { AgentRole } from '@/lib/agents/configs'
import { allTools } from '@/lib/agents/tools'
import { runAgent } from '@/lib/agents/orchestrator'
import { ConversationService } from './conversation.service'
import { TaskService } from './task.service'
import { NotFoundError } from '@/lib/api/errors'
import type { ConversationMessage } from '@/lib/types/json-fields'

function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registerBuiltInTools(registry)
  for (const tool of allTools) registry.register(tool)
  return registry
}

/**
 * Extract structured tasks from agent response text (JSON array in code fences).
 */
function extractJsonFromResponse(text: string): Array<{ title: string; description?: string }> {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonString = fenceMatch ? fenceMatch[1].trim() : text.trim()
  const parsed = JSON.parse(jsonString)

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array of tasks')
  }

  return parsed.map((item: unknown) => {
    if (typeof item !== 'object' || item === null || !('title' in item)) {
      throw new Error('Each task must have a title field')
    }
    const task = item as Record<string, unknown>
    return {
      title: String(task.title),
      description: task.description != null ? String(task.description) : undefined,
    }
  })
}

export const AgentService = {
  /**
   * Stream an agent response via SSE.
   * Returns a ReadableStream of SSE events.
   */
  createStream(
    role: AgentRole,
    userMessage: string,
    taskId: string,
    existingMessages?: Array<{ role: string; content: string }>,
  ): ReadableStream {
    const encoder = new TextEncoder()

    return new ReadableStream({
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

          const prompt = await buildChatPrompt(role, userMessage, taskId)
          const registry = buildRegistry()
          const executor = new ToolExecutor(registry)
          const agent = new Agent(agentConfigs[role], registry, executor)

          let accumulatedText = ''

          for await (const event of agent.stream(prompt)) {
            if (event.type === 'text') {
              accumulatedText += event.data as string
              emit({ type: 'token', delta: event.data as string })
            } else if (event.type === 'tool_use') {
              const toolData = event.data as Record<string, unknown> | null
              emit({ type: 'progress', message: `Using tool: ${toolData?.name ?? '…'}` })
            } else if (event.type === 'done') {
              const llmResponse = event.data as Record<string, unknown> | null
              const usage = llmResponse?.usage as { input_tokens?: number; output_tokens?: number } | undefined
              const tokenUsage = usage
                ? { input: usage.input_tokens ?? 0, output: usage.output_tokens ?? 0 }
                : null

              const now = new Date()
              const allMessages: ConversationMessage[] = [
                ...(existingMessages ?? []).map((m) => ({
                  role: m.role as ConversationMessage['role'],
                  content: m.content,
                  timestamp: now,
                })),
                { role: 'user' as const, content: userMessage, timestamp: now },
                { role: 'assistant' as const, content: accumulatedText, timestamp: now },
              ].filter((m) => m.content)

              let savedConversation = null
              try {
                savedConversation = await ConversationService.create({
                  taskId,
                  messages: allMessages,
                  result: accumulatedText,
                  ...(tokenUsage ? { tokenUsage } : {}),
                })
              } catch (dbError) {
                console.error('Failed to persist conversation:', dbError)
              }

              emit({
                type: 'complete',
                ...(tokenUsage ? { tokenUsage } : {}),
                ...(savedConversation ? { conversation: savedConversation } : {}),
              })
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
  },

  async runPlan(projectId: string, userMessage: string) {
    const prompt = await buildPlanPrompt(userMessage, projectId)
    const agentResult: AgentRunResult = await runAgent('architect', prompt)

    return {
      result: agentResult.output,
      tokenUsage: agentResult.tokenUsage
        ? { input: agentResult.tokenUsage.input_tokens, output: agentResult.tokenUsage.output_tokens }
        : null,
    }
  },

  async generateTasks(projectId: string, messages: PromptConversationMessage[]) {
    let prompt: string
    try {
      prompt = await buildGenerateTasksPrompt(messages, projectId)
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        throw new NotFoundError('Project', projectId)
      }
      throw err
    }

    const agentResult: AgentRunResult = await runAgent('architect', prompt)
    const responseText = agentResult.output

    let taskData: Array<{ title: string; description?: string }>
    try {
      taskData = extractJsonFromResponse(responseText)
    } catch {
      throw new Error('Failed to parse tasks from AI response')
    }

    if (taskData.length === 0) {
      throw new Error('Failed to parse tasks from AI response')
    }

    const createdTasks = await TaskService.createBatch(taskData, projectId)
    return { tasks: createdTasks }
  },
}

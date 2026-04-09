import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runAgent } from '@/lib/agents/orchestrator'
import { buildGenerateTasksPrompt } from '@/lib/agents/prompts'
import { createTasksBatch } from '@/lib/db/tasks'
import { generateTasksSchema } from '@/lib/validations/schemas'

// ── JSON extraction helper ────────────────────────────────────────────────────

function extractJsonFromResponse(text: string): Array<{ title: string; description?: string }> {
  // Match content inside ```json ... ``` or ``` ... ``` code fences
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

// ── POST /api/agents/generate-tasks ──────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, messages } = generateTasksSchema.parse(body)

    // Build the prompt with full conversation history + project context
    let prompt: string
    try {
      prompt = await buildGenerateTasksPrompt(messages, projectId)
    } catch (err) {
      if (err instanceof Error && err.message.includes('not found')) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      throw err
    }

    // Run architect agent
    const agentResult = await runAgent('architect', prompt)
    const responseText: string =
      typeof agentResult === 'string'
        ? agentResult
        : ((agentResult as any)?.output ?? String(agentResult))

    // Extract structured tasks from the response
    let taskData: Array<{ title: string; description?: string }>
    try {
      taskData = extractJsonFromResponse(responseText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse tasks from AI response' },
        { status: 422 }
      )
    }

    if (taskData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse tasks from AI response' },
        { status: 422 }
      )
    }

    // Bulk-create tasks in a single transaction
    const createdTasks = await createTasksBatch(taskData, projectId)

    return NextResponse.json({ tasks: createdTasks })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error generating tasks:', error)
    return NextResponse.json({ error: 'Failed to generate tasks' }, { status: 500 })
  }
}

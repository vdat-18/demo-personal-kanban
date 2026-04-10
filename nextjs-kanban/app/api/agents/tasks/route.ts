import { NextRequest, NextResponse } from 'next/server'
import { runTasks } from '@/lib/agents/orchestrator'
import type { AgentRole } from '@/lib/agents/configs'
import { z } from 'zod'

const agentRoleEnum = z.enum(['architect', 'developer', 'reviewer'])

const taskSchema = z.object({
  agent: agentRoleEnum,
  prompt: z.string().min(1, 'Prompt is required'),
  dependencies: z.array(z.string()).optional(),
})

const runTasksSchema = z.object({
  tasks: z.array(taskSchema).min(1, 'At least one task is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = runTasksSchema.parse(body)

    const result = await runTasks(validatedData.tasks)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error running tasks:', error)
    return NextResponse.json(
      { error: 'Failed to run tasks' },
      { status: 500 }
    )
  }
}

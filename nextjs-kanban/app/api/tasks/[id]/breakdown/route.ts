import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { runAgent } from '@/lib/agents/orchestrator'

type Params = Promise<{ id: string }>

/**
 * POST /api/tasks/:id/breakdown
 *
 * Generates and persists subtasks for a single task using AI.
 * Idempotent: if subtasks already exist, returns them immediately without calling AI.
 * Uses the project Vision Document (from latest planning thread) as context.
 */
export async function POST(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: true,
        project: {
          include: {
            planningThreads: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: { visionDocument: true },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Idempotent: already has subtasks → return them
    if (task.subtasks.length > 0) {
      return NextResponse.json({ subtasks: task.subtasks, generated: false })
    }

    // Build context from vision document or fallback to project description
    const visionDoc =
      task.project?.planningThreads?.[0]?.visionDocument ??
      task.project?.description ??
      `Project: ${task.project?.name ?? 'Unknown'}`

    const prompt = `You are an expert project manager breaking down a task into concrete subtasks.

Project context / Vision Document:
---
${visionDoc}
---

Task to break down:
- Title: ${task.title}
- Description: ${task.description ?? 'No description provided'}

Generate 3 to 5 concrete, actionable, sequential subtasks. Each subtask should be a complete unit of work that can be executed and verified independently.

Output ONLY a JSON array of strings. No markdown, no extra text.
Example: ["Research competitive landscape", "Draft initial copy", "Review and finalize"]
`

    const agentResult = await runAgent('architect', prompt)
    const responseText =
      typeof agentResult === 'string'
        ? agentResult
        : ((agentResult as any)?.output ?? String(agentResult))

    // Strip markdown fences if present
    const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonString = fenceMatch ? fenceMatch[1].trim() : responseText.trim()
    const subtaskTitles = JSON.parse(jsonString) as string[]

    if (!Array.isArray(subtaskTitles) || subtaskTitles.length === 0) {
      return NextResponse.json({ error: 'AI returned no subtasks' }, { status: 500 })
    }

    // Persist subtasks
    const created = await prisma.$transaction(
      subtaskTitles.map((title) =>
        prisma.subtask.create({
          data: { title: String(title).trim(), taskId: id },
        })
      )
    )

    return NextResponse.json({ subtasks: created, generated: true })
  } catch (error) {
    console.error('[breakdown] Error:', error)
    return NextResponse.json({ error: 'Failed to generate subtasks' }, { status: 500 })
  }
}

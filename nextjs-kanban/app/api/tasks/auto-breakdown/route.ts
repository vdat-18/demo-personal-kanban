import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'
import { runAgent } from '@/lib/agents/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    // 1. Fetch project and bare tasks (status TODO, no subtasks)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { status: 'TODO' },
          include: { subtasks: true }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Filter tasks that genuinely have no subtasks
    const tasksToBreakdown = project.tasks.filter(t => t.subtasks.length === 0)
    if (tasksToBreakdown.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // 2. Get context (Vision Document from the latest thread)
    const thread = await prisma.planningThread.findFirst({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      select: { visionDocument: true }
    })
    
    const visionDoc = thread?.visionDocument || project.description || `Project: ${project.name}`

    // 3. Generate structured breakdown using AI Native Orchestrator
    const prompt = `You are an expert technical project manager and architect. 
Project Context / Vision Document:
---
${visionDoc}
---

Your goal is to break down the following high-level tasks into 3-5 concrete, actionable, sequential subtasks. 
Make the subtasks practical and directly related to executing the task within the broader project context.

Tasks to break down:
${tasksToBreakdown.map(t => `- Task ID: ${t.id} | Title: ${t.title} | Desc: ${t.description || 'N/A'}`).join('\n')}

YOU MUST output strictly a JSON array. Do not include any other text except the JSON array.
Format requirement:
[
  {
    "taskId": "the exact UUID of the task",
    "subtasks": ["subtask 1", "subtask 2", "subtask 3"]
  }
]
`

    const agentResult = await runAgent('architect', prompt)
    const responseText = typeof agentResult === 'string' ? agentResult : ((agentResult as any)?.output ?? String(agentResult))
    
    // Parse the JSON array out of the response (handling markdown code blocks if any)
    const fenceMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonString = fenceMatch ? fenceMatch[1].trim() : responseText.trim()
    const parsed = JSON.parse(jsonString) as { taskId: string, subtasks: string[] }[]

    // 4. Update the database in a single transaction
    await prisma.$transaction(
      parsed.map((breakdown) => {
        return prisma.task.update({
          where: { id: breakdown.taskId },
          data: {
            subtasks: {
              create: breakdown.subtasks.map(st => ({ title: st }))
            }
          }
        })
      })
    )

    return NextResponse.json({ success: true, count: parsed.length })
  } catch (error) {
    console.error('Auto breakdown error:', error)
    return NextResponse.json({ error: 'Failed to auto-breakdown tasks' }, { status: 500 })
  }
}

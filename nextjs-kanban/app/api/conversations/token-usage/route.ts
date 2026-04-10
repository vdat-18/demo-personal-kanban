import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * GET /api/conversations/token-usage
 *
 * Returns aggregated token usage across all conversations.
 * Optionally filtered by taskId or projectId.
 *
 * Query params:
 *   taskId    — filter by task
 *   projectId — filter by project (joins through tasks)
 *
 * Response:
 *   {
 *     totalInput: number,
 *     totalOutput: number,
 *     totalTokens: number,
 *     conversationCount: number,
 *     byTask: Array<{ taskId, taskTitle, input, output, total, conversationCount }>
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId') ?? undefined
    const projectId = searchParams.get('projectId') ?? undefined

    const where: Record<string, unknown> = {}
    if (taskId) {
      where.taskId = taskId
    } else if (projectId) {
      where.task = { projectId }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        tokenUsage: true,
        task: { select: { id: true, title: true } },
      },
    })

    // Aggregate totals
    let totalInput = 0
    let totalOutput = 0

    // Per-task breakdown
    const taskMap = new Map<string, { taskId: string; taskTitle: string; input: number; output: number; count: number }>()

    for (const conv of conversations) {
      const tu = conv.tokenUsage as { input?: number; output?: number } | null
      const inp = tu?.input ?? 0
      const out = tu?.output ?? 0
      totalInput += inp
      totalOutput += out

      if (conv.taskId) {
        const key = conv.taskId
        const entry = taskMap.get(key) ?? {
          taskId: conv.taskId,
          taskTitle: conv.task?.title ?? conv.taskId,
          input: 0,
          output: 0,
          count: 0,
        }
        entry.input += inp
        entry.output += out
        entry.count += 1
        taskMap.set(key, entry)
      }
    }

    const byTask = Array.from(taskMap.values()).map((e) => ({
      taskId: e.taskId,
      taskTitle: e.taskTitle,
      input: e.input,
      output: e.output,
      total: e.input + e.output,
      conversationCount: e.count,
    }))

    return NextResponse.json({
      totalInput,
      totalOutput,
      totalTokens: totalInput + totalOutput,
      conversationCount: conversations.length,
      byTask,
    })
  } catch (error) {
    console.error('Error fetching token usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token usage' },
      { status: 500 }
    )
  }
}

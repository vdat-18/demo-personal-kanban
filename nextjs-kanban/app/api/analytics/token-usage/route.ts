import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

/**
 * GET /api/analytics/token-usage
 * Returns aggregated token usage across all conversations.
 *
 * Query params:
 *   taskId    — filter by task
 *   startDate — ISO date string, e.g. 2024-01-01
 *   endDate   — ISO date string
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (taskId) where.taskId = taskId
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    }

    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        tokenUsage: true,
        createdAt: true,
      },
    })

    // Aggregate token usage
    let totalInput = 0
    let totalOutput = 0
    let conversationsWithUsage = 0

    const byTask: Record<string, { input: number; output: number; count: number }> = {}

    for (const conv of conversations) {
      const usage = conv.tokenUsage as { input?: number; output?: number } | null
      if (usage?.input !== undefined || usage?.output !== undefined) {
        const input = usage.input ?? 0
        const output = usage.output ?? 0
        totalInput += input
        totalOutput += output
        conversationsWithUsage++

        if (conv.taskId) {
          if (!byTask[conv.taskId]) byTask[conv.taskId] = { input: 0, output: 0, count: 0 }
          byTask[conv.taskId].input += input
          byTask[conv.taskId].output += output
          byTask[conv.taskId].count++
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalConversations: conversations.length,
        conversationsWithUsage,
        totalInputTokens: totalInput,
        totalOutputTokens: totalOutput,
        totalTokens: totalInput + totalOutput,
      },
      byTask,
    })
  } catch (error) {
    console.error('Error fetching token usage:', error)
    return NextResponse.json({ error: 'Failed to fetch token usage' }, { status: 500 })
  }
}

import prisma from './client'
import type { TokenUsage, ConversationMessage } from '../types/json-fields'
import { Prisma } from '../generated/prisma'

export async function getConversations(taskId?: string, limit: number = 10, offset: number = 0) {
  const where: Prisma.ConversationWhereInput = {}
  if (taskId) where.taskId = taskId

  return prisma.conversation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}

export async function getConversation(id: string) {
  return prisma.conversation.findUnique({
    where: { id }
  })
}

export async function createConversation(data: {
  taskId?: string
  messages: ConversationMessage[]
  result?: string | null
  tokenUsage?: TokenUsage | null
}) {
  return prisma.conversation.create({
    data: {
      taskId: data.taskId,
      messages: data.messages as unknown as Prisma.InputJsonValue,
      result: data.result as Prisma.InputJsonValue ?? Prisma.JsonNull,
      tokenUsage: data.tokenUsage as unknown as Prisma.InputJsonValue ?? Prisma.JsonNull,
    }
  })
}

export async function updateConversation(
  id: string,
  data: Partial<{
    taskId?: string
    messages?: ConversationMessage[]
    result?: string | null
    tokenUsage?: TokenUsage | null
  }>
) {
  const updateData: Prisma.ConversationUpdateInput = {}
  if (data.taskId !== undefined) updateData.task = data.taskId ? { connect: { id: data.taskId } } : { disconnect: true }
  if (data.messages !== undefined) updateData.messages = data.messages as unknown as Prisma.InputJsonValue
  if (data.result !== undefined) updateData.result = data.result as Prisma.InputJsonValue ?? Prisma.JsonNull
  if (data.tokenUsage !== undefined) updateData.tokenUsage = data.tokenUsage as unknown as Prisma.InputJsonValue ?? Prisma.JsonNull

  return prisma.conversation.update({
    where: { id },
    data: updateData,
  })
}

export async function deleteConversation(id: string) {
  return prisma.conversation.delete({
    where: { id }
  })
}

/**
 * Aggregates token usage across conversations, optionally filtered by task or project.
 */
export async function getTokenUsageAggregation(filters?: {
  taskId?: string
  projectId?: string
  startDate?: Date
  endDate?: Date
}) {
  const where: Prisma.ConversationWhereInput = {}
  if (filters?.taskId) {
    where.taskId = filters.taskId
  } else if (filters?.projectId) {
    where.task = { projectId: filters.projectId }
  }
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    }
  }

  const conversations = await prisma.conversation.findMany({
    where,
    select: {
      id: true,
      taskId: true,
      tokenUsage: true,
      createdAt: true,
      task: { select: { id: true, title: true } },
    },
  })

  let totalInput = 0
  let totalOutput = 0
  let conversationsWithUsage = 0

  const taskMap = new Map<string, { taskId: string; taskTitle: string; input: number; output: number; count: number }>()

  for (const conv of conversations) {
    const tu = conv.tokenUsage as TokenUsage | null
    const inp = tu?.input ?? 0
    const out = tu?.output ?? 0

    if (tu) {
      totalInput += inp
      totalOutput += out
      conversationsWithUsage++
    }

    if (conv.taskId) {
      const entry = taskMap.get(conv.taskId) ?? {
        taskId: conv.taskId,
        taskTitle: conv.task?.title ?? conv.taskId,
        input: 0,
        output: 0,
        count: 0,
      }
      entry.input += inp
      entry.output += out
      entry.count += 1
      taskMap.set(conv.taskId, entry)
    }
  }

  return {
    totalInput,
    totalOutput,
    totalTokens: totalInput + totalOutput,
    conversationCount: conversations.length,
    conversationsWithUsage,
    byTask: Array.from(taskMap.values()).map((e) => ({
      taskId: e.taskId,
      taskTitle: e.taskTitle,
      input: e.input,
      output: e.output,
      total: e.input + e.output,
      conversationCount: e.count,
    })),
  }
}

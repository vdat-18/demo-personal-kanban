import prisma from './client'
import { Conversation, Task } from '../generated/prisma'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolCalls?: any
}

export async function getConversations(taskId?: string, limit: number = 10, offset: number = 0) {
  const where: any = {}
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
  messages: Message[]
  result?: any
  tokenUsage?: { input: number; output: number }
}) {
  return prisma.conversation.create({
    data: {
      ...data,
      messages: data.messages as any,
      result: data.result as any,
      tokenUsage: data.tokenUsage as any
    }
  })
}

export async function updateConversation(
  id: string,
  data: Partial<{
    taskId?: string
    messages?: Message[]
    result?: any
    tokenUsage?: { input: number; output: number }
  }>
) {
  return prisma.conversation.update({
    where: { id },
    data: {
      ...data,
      messages: data.messages as any,
      result: data.result as any,
      tokenUsage: data.tokenUsage as any
    }
  })
}

export async function deleteConversation(id: string) {
  return prisma.conversation.delete({
    where: { id }
  })
}

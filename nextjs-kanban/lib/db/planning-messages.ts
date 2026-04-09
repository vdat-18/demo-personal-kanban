import prisma from './client'
import type { PlanningMessageRole } from '../generated/prisma'

export async function getMessagesByThread(threadId: string) {
  return prisma.planningMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createMessage(
  threadId: string,
  role: PlanningMessageRole,
  content: string,
  tokenUsage?: { input: number; output: number } | null,
) {
  // Update the thread's updatedAt timestamp
  await prisma.planningThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  })

  return prisma.planningMessage.create({
    data: {
      threadId,
      role,
      content,
      tokenUsage: tokenUsage as any,
    },
  })
}

export async function getRecentMessages(threadId: string, limit: number = 20) {
  const messages = await prisma.planningMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  // Return in chronological order
  return messages.reverse()
}

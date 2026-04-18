import prisma from './client'
import { Prisma } from '../generated/prisma'
import type { PlanningMessageRole, MutationActionType } from '../generated/prisma'
import type { TokenUsage } from '../types/json-fields'

export async function getMessagesByThread(threadId: string) {
  return prisma.planningMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    include: {
      mutationActions: {
        select: { mutationIndex: true, action: true },
      },
    },
  })
}

export async function createMessage(
  threadId: string,
  role: PlanningMessageRole,
  content: string,
  tokenUsage?: TokenUsage | null,
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
      tokenUsage: tokenUsage as unknown as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  })
}

export async function getRecentMessages(threadId: string, limit: number = 20) {
  const messages = await prisma.planningMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      mutationActions: {
        select: { mutationIndex: true, action: true },
      },
    },
  })
  // Return in chronological order
  return messages.reverse()
}

/**
 * Persist a mutation action (approve/dismiss) for a specific mutation in a message.
 */
export async function persistMutationAction(
  messageId: string,
  mutationIndex: number,
  action: MutationActionType,
) {
  return prisma.mutationAction.upsert({
    where: {
      messageId_mutationIndex: { messageId, mutationIndex },
    },
    update: { action },
    create: { messageId, mutationIndex, action },
  })
}

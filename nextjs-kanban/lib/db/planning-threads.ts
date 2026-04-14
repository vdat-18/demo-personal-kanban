import prisma from './client'

export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'

export async function getThreadsByProject(projectId: string) {
  return prisma.planningThread.findMany({
    where: { projectId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
  }).then((threads) =>
    threads.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      phase: t.phase,
      visionDocument: t.visionDocument,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessage: t.messages[0]?.content?.slice(0, 100) ?? null,
      lastMessageAt: t.messages[0]?.createdAt ?? null,
    }))
  )
}

export async function getThread(id: string) {
  return prisma.planningThread.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function createThread(projectId: string, title?: string) {
  return prisma.planningThread.create({
    data: {
      projectId,
      title: title || 'New Thread',
      phase: 'discovery',
    },
  })
}

export async function updateThread(
  id: string,
  data: { title?: string; phase?: PlanningPhase; visionDocument?: string },
) {
  return prisma.planningThread.update({
    where: { id },
    data,
  })
}

export async function deleteThread(id: string) {
  // Messages are cascade-deleted via onDelete: Cascade in the schema
  return prisma.planningThread.delete({
    where: { id },
  })
}

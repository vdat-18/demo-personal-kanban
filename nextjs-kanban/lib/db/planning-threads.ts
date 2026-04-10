import prisma from './client'

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
  })
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
    },
  })
}

export async function updateThread(id: string, data: { title?: string }) {
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

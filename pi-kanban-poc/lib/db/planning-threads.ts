import prisma from './client'

export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'

export async function getThreadsByProject(projectId: string) {
  // Use a single raw query with LATERAL JOIN to fetch threads + last message
  // efficiently. This avoids Prisma's IN(...) subquery approach which hits
  // PostgreSQL's bind-parameter limit (P2029) when there are many threads.
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      projectId: string
      title: string
      phase: string
      visionDocument: string | null
      createdAt: Date
      updatedAt: Date
      lastMessage: string | null
      lastMessageAt: Date | null
    }>
  >`
    SELECT
      t."id",
      t."projectId",
      t."title",
      t."phase",
      t."visionDocument",
      t."createdAt",
      t."updatedAt",
      LEFT(lm."content", 100) AS "lastMessage",
      lm."createdAt"          AS "lastMessageAt"
    FROM "PlanningThread" t
    LEFT JOIN LATERAL (
      SELECT m."content", m."createdAt"
      FROM "PlanningMessage" m
      WHERE m."threadId" = t."id"
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) lm ON true
    WHERE t."projectId" = ${projectId}
    ORDER BY t."updatedAt" DESC
  `

  return rows
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

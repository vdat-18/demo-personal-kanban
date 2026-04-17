import prisma from './client'
import { TaskStatus, TaskPriority, Prisma } from '../generated/prisma'
import { validateTransition, InvalidTransitionError } from '../status-lifecycle'
import type { TaskStatusValue } from '../status-lifecycle'

export async function getTasks(status?: TaskStatus, projectId?: string) {
  const where: Prisma.TaskWhereInput = {}
  if (status) where.status = status
  if (projectId) where.projectId = projectId

  return prisma.task.findMany({
    where,
    include: { project: true, subtasks: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTask(id: string) {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          planningThreads: {
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { visionDocument: true },
          },
        },
      },
      subtasks: {
        orderBy: { createdAt: 'asc' },
      },
      // ── Conversation pruning ────────────────────────────────────────────
      // Fetch the most recent 20 conversations only to prevent context bloat.
      // When subtask.output fields are populated, older conversation turns are
      // redundant — output is the canonical source of truth for the prompt builder.
      conversations: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!task) return null

  // Re-order conversations to chronological (asc) after the DESC + LIMIT fetch
  task.conversations = task.conversations.reverse()

  return task
}

export async function createTask(data: {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  projectId?: string
}) {
  return prisma.task.create({
    data: {
      ...data,
      status: data.status || TaskStatus.TODO,
      priority: data.priority || TaskPriority.MEDIUM
    }
  })
}

export async function updateTask(
  id: string,
  data: Partial<{
    title?: string
    description?: string
    status?: TaskStatus
    priority?: TaskPriority
    projectId?: string | null
  }>,
  currentStatus?: TaskStatus,
) {
  // Validate status transition when both current and new status are provided
  if (data.status && currentStatus && data.status !== currentStatus) {
    const result = validateTransition(
      currentStatus as TaskStatusValue,
      data.status as TaskStatusValue,
    )
    if (!result.valid) {
      throw new InvalidTransitionError(
        currentStatus as TaskStatusValue,
        data.status as TaskStatusValue,
        result.allowed,
      )
    }
  }

  return prisma.task.update({
    where: { id },
    data
  })
}

export async function deleteTask(id: string) {
  return prisma.task.delete({
    where: { id }
  })
}

export async function createTasksBatch(
  tasks: Array<{ title: string; description?: string; subtasks?: string[] }>,
  projectId: string
) {
  if (tasks.length === 0) return []

  return prisma.$transaction(
    tasks.map((task) =>
      prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          status: TaskStatus.TODO,
          priority: TaskPriority.MEDIUM,
          projectId,
          ...(task.subtasks && task.subtasks.length > 0
            ? {
                subtasks: {
                  create: task.subtasks.map((st) => ({
                    title: st,
                  })),
                },
              }
            : {}),
        },
        include: { subtasks: true },
      })
    )
  )
}

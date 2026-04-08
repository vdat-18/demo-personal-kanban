import prisma from './client'
import { Task, TaskStatus, TaskPriority } from '../generated/prisma'

export async function getTasks(status?: TaskStatus, projectId?: string) {
  const where: any = {}
  if (status) where.status = status
  if (projectId) where.projectId = projectId

  return prisma.task.findMany({
    where,
    include: { project: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getTask(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: { project: true, conversations: true }
  })
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
  }>
) {
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

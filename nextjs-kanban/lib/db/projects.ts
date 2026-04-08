import prisma from './client'
import { Project } from '../generated/prisma'

export async function getProjects() {
  return prisma.project.findMany({
    include: { tasks: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { tasks: true }
  })
}

export async function createProject(data: { name: string; description?: string }) {
  return prisma.project.create({
    data
  })
}

export async function updateProject(
  id: string,
  data: Partial<{ name?: string; description?: string }>
) {
  return prisma.project.update({
    where: { id },
    data
  })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({
    where: { id }
  })
}

export async function getProjectWithTaskCount(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tasks: true }
      }
    }
  })

  return project
}

/**
 * Project Service — business logic for project operations.
 */

import { getProjects, getProject, createProject, updateProject, deleteProject } from '@/lib/db/projects'
import { NotFoundError } from '@/lib/api/errors'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations/schemas'
import type { z } from 'zod'

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>

export const ProjectService = {
  async list() {
    return getProjects()
  },

  async get(id: string) {
    const project = await getProject(id)
    if (!project) throw new NotFoundError('Project', id)
    return project
  },

  async create(data: CreateProjectInput) {
    return createProject(data as Parameters<typeof createProject>[0])
  },

  async update(id: string, data: UpdateProjectInput) {
    return updateProject(id, data as Parameters<typeof updateProject>[1])
  },

  async delete(id: string) {
    return deleteProject(id)
  },
}

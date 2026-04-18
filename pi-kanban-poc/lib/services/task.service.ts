/**
 * Task Service — business logic for task operations.
 * Sits between API routes and the DB layer.
 */

import { getTasks, getTask, createTask, updateTask, deleteTask, createTasksBatch } from '@/lib/db/tasks'
import { NotFoundError } from '@/lib/api/errors'
import { createTaskSchema, updateTaskSchema } from '@/lib/validations/schemas'
import type { z } from 'zod'
import type { TaskStatus } from '@/lib/generated/prisma'

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export const TaskService = {
  async list(status?: string, projectId?: string) {
    return getTasks(status as TaskStatus | undefined, projectId)
  },

  async get(id: string) {
    const task = await getTask(id)
    if (!task) throw new NotFoundError('Task', id)
    return task
  },

  async create(data: CreateTaskInput) {
    return createTask(data as Parameters<typeof createTask>[0])
  },

  /**
   * Update a task. If status is being changed, validates the transition.
   * Throws InvalidTransitionError on illegal transitions.
   */
  async update(id: string, data: UpdateTaskInput) {
    let currentStatus: TaskStatus | undefined
    if (data.status) {
      const existing = await getTask(id)
      if (!existing) throw new NotFoundError('Task', id)
      currentStatus = existing.status as TaskStatus
    }
    return updateTask(id, data as Parameters<typeof updateTask>[1], currentStatus)
  },

  async delete(id: string) {
    return deleteTask(id)
  },

  async createBatch(tasks: Array<{ title: string; description?: string }>, projectId: string) {
    return createTasksBatch(tasks, projectId)
  },
}

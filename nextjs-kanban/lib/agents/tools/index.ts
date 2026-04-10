import { defineTool } from '@jackchen_me/open-multi-agent'
import type { ToolUseContext } from '@jackchen_me/open-multi-agent'
import { z } from 'zod'
import prisma from '../../db/client'
import { TaskStatus, TaskPriority } from '../../generated/prisma'
import { validateTransition } from '../../status-lifecycle'
import type { TaskStatusValue } from '../../status-lifecycle'

export const dbQueryTool = defineTool({
  name: 'db_query',
  description: 'Query the database for tasks, projects, or conversations. Use this to fetch data from the database.',
  inputSchema: z.object({
    table: z.enum(['tasks', 'projects', 'conversations']).describe('The table to query'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Filter conditions (e.g., { status: "TODO" })'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { table, filter, limit } = input as { table: 'tasks' | 'projects' | 'conversations'; filter?: Record<string, unknown>; limit?: number }
    try {
      const where = filter || {}
      const queryOptions = { where, take: limit }

      let result
      switch (table) {
        case 'tasks':
          result = await prisma.task.findMany({
            ...queryOptions,
            include: { project: true },
            orderBy: { createdAt: 'desc' },
          })
          break
        case 'projects':
          result = await prisma.project.findMany({
            ...queryOptions,
            include: { tasks: true },
            orderBy: { createdAt: 'desc' },
          })
          break
        case 'conversations':
          result = await prisma.conversation.findMany({
            ...queryOptions,
            orderBy: { createdAt: 'desc' },
          })
          break
        default:
          throw new Error(`Unknown table: ${table}`)
      }

      return {
        data: JSON.stringify({ success: true, count: result.length, items: result }),
      }
    } catch (error) {
      return {
        data: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        isError: true,
      }
    }
  },
})

export const taskCreateTool = defineTool({
  name: 'task_create',
  description: 'Create a new task in the database. Use this to add tasks to a project.',
  inputSchema: z.object({
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    status: z.nativeEnum(TaskStatus).optional().describe('Task status (TODO, IN_PROGRESS, DONE)'),
    priority: z.nativeEnum(TaskPriority).optional().describe('Task priority (LOW, MEDIUM, HIGH, URGENT)'),
    projectId: z.string().optional().describe('Project ID to associate task with'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { title, description, status, priority, projectId } = input as { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; projectId?: string }
    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || TaskStatus.TODO,
          priority: priority || TaskPriority.MEDIUM,
          projectId,
        },
        include: { project: true },
      })

      return {
        data: JSON.stringify({ success: true, message: `Task "${title}" created successfully`, task }),
      }
    } catch (error) {
      return {
        data: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        isError: true,
      }
    }
  },
})

export const taskUpdateTool = defineTool({
  name: 'task_update',
  description: 'Update an existing task in the database. Use this to modify task properties.',
  inputSchema: z.object({
    id: z.string().describe('Task ID to update'),
    title: z.string().optional().describe('New task title'),
    description: z.string().optional().describe('New task description'),
    status: z.nativeEnum(TaskStatus).optional().describe('New task status'),
    priority: z.nativeEnum(TaskPriority).optional().describe('New task priority'),
    projectId: z.string().optional().describe('New project ID'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { id, title, description, status, priority, projectId } = input as { id: string; title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority; projectId?: string }
    const updates: Record<string, string | TaskStatus | TaskPriority> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (priority !== undefined) updates.priority = priority
    if (projectId !== undefined) updates.projectId = projectId

    try {
      // Validate status transition before updating
      if (status) {
        const existing = await prisma.task.findUnique({ where: { id } })
        if (!existing) {
          return {
            data: JSON.stringify({ success: false, error: `Task with id "${id}" not found` }),
            isError: true,
          }
        }
        const result = validateTransition(
          existing.status as TaskStatusValue,
          status as TaskStatusValue,
        )
        if (!result.valid) {
          return {
            data: JSON.stringify({
              success: false,
              error: result.message,
              allowed: result.allowed,
            }),
            isError: true,
          }
        }
      }

      const task = await prisma.task.update({
        where: { id },
        data: updates,
        include: { project: true },
      })

      return {
        data: JSON.stringify({ success: true, message: `Task "${task.title}" updated successfully`, task }),
      }
    } catch (error) {
      return {
        data: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        isError: true,
      }
    }
  },
})

export const taskDeleteTool = defineTool({
  name: 'task_delete',
  description: 'Delete a task from the database. Use this to remove tasks.',
  inputSchema: z.object({
    id: z.string().describe('Task ID to delete'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { id } = input as { id: string }
    try {
      await prisma.task.delete({
        where: { id },
      })

      return {
        data: JSON.stringify({ success: true, message: 'Task deleted successfully' }),
      }
    } catch (error) {
      return {
        data: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        isError: true,
      }
    }
  },
})

export const projectCreateTool = defineTool({
  name: 'project_create',
  description: 'Create a new project in the database. Use this to organize tasks.',
  inputSchema: z.object({
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { name, description } = input as { name: string; description?: string }
    try {
      const project = await prisma.project.create({
        data: {
          name,
          description,
        },
      })

      return {
        data: JSON.stringify({ success: true, message: `Project "${name}" created successfully`, project }),
      }
    } catch (error) {
      return {
        data: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
        isError: true,
      }
    }
  },
})

export const allTools = [
  dbQueryTool,
  taskCreateTool,
  taskUpdateTool,
  taskDeleteTool,
  projectCreateTool,
]

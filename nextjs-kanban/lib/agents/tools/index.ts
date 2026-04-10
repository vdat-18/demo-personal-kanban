import { defineTool } from '@jackchen_me/open-multi-agent'
import type { ToolUseContext } from '@jackchen_me/open-multi-agent'
import { z } from 'zod'
import prisma from '../../db/client'
import { TaskStatus, TaskPriority } from '../../generated/prisma'
import { validateTransition } from '../../status-lifecycle'
import type { TaskStatusValue } from '../../status-lifecycle'

// NOTE: `as unknown as ZodSchema` is required because this project uses Zod v4
// while @jackchen_me/open-multi-agent's defineTool expects Zod v3's ZodSchema type.
// The runtime behaviour is correct — both versions produce compatible schema objects.

export const dbQueryTool = defineTool({
  name: 'db_query',
  description: 'Query the database for tasks, projects, or conversations. Use this to fetch data from the database.',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod v4 schema incompatible with library's Zod v3 ZodSchema type
  inputSchema: z.object({
    table: z.enum(['tasks', 'projects', 'conversations']).describe('The table to query'),
    filter: z.record(z.string(), z.unknown()).optional().describe('Filter conditions (e.g., { status: "TODO" })'),
    limit: z.number().optional().describe('Maximum number of results to return'),
  }) as any,
  execute: async (input: { table: 'tasks' | 'projects' | 'conversations'; filter?: Record<string, unknown>; limit?: number }, context: ToolUseContext) => {
    void context
    const { table, filter, limit } = input
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod v4 schema incompatible with library's Zod v3 ZodSchema type
  inputSchema: z.object({
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    status: z.nativeEnum(TaskStatus).optional().describe('Task status (TODO, IN_PROGRESS, DONE)'),
    priority: z.nativeEnum(TaskPriority).optional().describe('Task priority (LOW, MEDIUM, HIGH, URGENT)'),
    projectId: z.string().optional().describe('Project ID to associate task with'),
  }) as any,
  execute: async (input: { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; projectId?: string }, context: ToolUseContext) => {
    void context
    const { title, description, status, priority, projectId } = input
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod v4 schema incompatible with library's Zod v3 ZodSchema type
  inputSchema: z.object({
    id: z.string().describe('Task ID to update'),
    title: z.string().optional().describe('New task title'),
    description: z.string().optional().describe('New task description'),
    status: z.nativeEnum(TaskStatus).optional().describe('New task status'),
    priority: z.nativeEnum(TaskPriority).optional().describe('New task priority'),
    projectId: z.string().optional().describe('New project ID'),
  }) as any,
  execute: async (input: { id: string; title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority; projectId?: string }, context: ToolUseContext) => {
    void context
    const { id, title, description, status, priority, projectId } = input
    const updates: Record<string, string | TaskStatus | TaskPriority> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (status !== undefined) updates.status = status
    if (priority !== undefined) updates.priority = priority
    if (projectId !== undefined) updates.projectId = projectId

    try {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod v4 schema incompatible with library's Zod v3 ZodSchema type
  inputSchema: z.object({
    id: z.string().describe('Task ID to delete'),
  }) as any,
  execute: async (input: { id: string }, context: ToolUseContext) => {
    void context
    const { id } = input
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Zod v4 schema incompatible with library's Zod v3 ZodSchema type
  inputSchema: z.object({
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
  }) as any,
  execute: async (input: { name: string; description?: string }, context: ToolUseContext) => {
    void context
    const { name, description } = input
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

export const subtaskUpdateTool = defineTool({
  name: 'subtask_update',
  description: 'Mark a subtask as completed. Call this after you finish working on a subtask. Pass the subtask UUID from the "ID:" field in your context. The "completed" field defaults to true — you can omit it.',
  inputSchema: z.object({
    id: z.string().describe('The EXACT UUID of the subtask to update, from the "ID:" field in the subtask list. Example: "3f2b1a00-abcd-1234-efgh-000000000000"'),
    // Accept boolean OR string — LLMs sometimes emit "true"/"false" strings. Default to true so omitting it still works.
    completed: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional().default(true).describe('Set to true to mark complete (default). Omit or pass true — do not pass the subtask title here.'),
    title: z.string().optional().describe('Optionally update the subtask title. Leave out if you just want to mark it complete.'),
  }) as any,
  execute: async (input: unknown, context: ToolUseContext) => {
    void context
    const { id, completed, title } = input as any
    // Sanitize ID: keep only valid UUID characters (alphanumeric + hyphens)
    const rawId = String(id ?? '').trim()
    const safeId = rawId.replace(/[^a-zA-Z0-9-]/g, '')
    const isCompleted = completed === true || completed === 'true'

    // Validate that the id looks like a UUID (must be exactly 36 chars with hyphens at correct positions)
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(safeId)) {
      return {
        data: JSON.stringify({
          success: false,
          error: `Invalid subtask id "${rawId}" — this does not look like a UUID. You must pass the exact ID value from the "ID:" field in the subtasks list (e.g. "3f2b1a00-..."), NOT the subtask title. Do NOT retry with the same value.`,
        }),
        isError: true,
      }
    }

    try {
      // Verify subtask exists before updating
      const existing = await prisma.subtask.findUnique({ where: { id: safeId } })
      if (!existing) {
        return {
          data: JSON.stringify({
            success: false,
            error: `Subtask with id "${safeId}" not found in the database. Do NOT retry — the subtask ID may be wrong. Re-read the subtasks list in your context carefully.`,
          }),
          isError: true,
        }
      }

      const updateData: Record<string, unknown> = { completed: isCompleted }
      // Only update title if explicitly provided
      if (title !== undefined && title !== null) {
        updateData.title = title
      }

      const subtask = await prisma.subtask.update({
        where: { id: safeId },
        data: updateData,
      })

      return {
        data: JSON.stringify({ success: true, message: `Subtask "${subtask.title}" marked as ${isCompleted ? 'completed' : 'pending'} successfully.`, subtask }),
      }
    } catch (error) {
      const errStr = error instanceof Error ? error.message : 'Unknown error'
      console.error('[subtask_update tool] Prisma error:', errStr)
      return {
        data: JSON.stringify({
          success: false,
          error: `Database error: ${errStr}. Do NOT retry this tool call. Please inform the user that the subtask status could not be updated due to a technical issue.`,
        }),
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
  subtaskUpdateTool,
]

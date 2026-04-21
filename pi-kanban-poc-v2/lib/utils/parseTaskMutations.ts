/**
 * Parse task-mutations fenced code blocks from AI markdown responses.
 *
 * Expected format in the markdown:
 * ```task-mutations
 * [ { "action": "add", "title": "...", "description": "..." }, ... ]
 * ```
 */

export interface TaskMutationAdd {
  action: 'add'
  title: string
  description?: string
  priority?: string
}

export interface TaskMutationUpdate {
  action: 'update'
  id: string
  fields: {
    title?: string
    description?: string
    status?: string
    priority?: string
  }
}

export interface TaskMutationDelete {
  action: 'delete'
  id: string
  reason?: string
}

export type TaskMutation = TaskMutationAdd | TaskMutationUpdate | TaskMutationDelete

export interface ParsedContent {
  /** The markdown with task-mutations blocks removed */
  cleanContent: string
  /** Extracted task mutations */
  mutations: TaskMutation[]
}

export function parseTaskMutations(content: string): ParsedContent {
  const regex = /```task-mutations\s*\n([\s\S]*?)```/g
  const mutations: TaskMutation[] = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === 'object' && item.action) {
            mutations.push(item as TaskMutation)
          }
        }
      }
    } catch {
      // Skip malformed blocks
      console.warn('Failed to parse task-mutations block:', match[1])
    }
  }

  // Remove the task-mutations blocks from the rendered markdown
  const cleanContent = content.replace(/```task-mutations\s*\n[\s\S]*?```/g, '').trim()

  return { cleanContent, mutations }
}

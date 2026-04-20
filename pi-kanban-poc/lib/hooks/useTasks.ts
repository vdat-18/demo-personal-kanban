/**
 * Hooks for Tasks, backed by localStorage store.
 * API surface kept compatible with the old React-Query version so existing
 * components don't need to change.
 */
'use client'

import { useCallback, useMemo } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { Task as StoreTask, TaskStatus, TaskPriority } from '@/types/domain'
import { validateTransition, getAllowedTransitions } from '@/lib/status-lifecycle'

export type Task = StoreTask
export type { TaskStatus, TaskPriority }

export class TransitionError extends Error {
  public readonly from: string
  public readonly to: string
  public readonly allowed: string[]

  constructor(from: string, to: string, allowed: string[]) {
    super(`Invalid status transition from ${from} to ${to}`)
    this.name = 'TransitionError'
    this.from = from
    this.to = to
    this.allowed = allowed
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useTasks(params?: { status?: TaskStatus; projectId?: string }) {
  const tasks = useKanbanStore((s) => s.tasks)
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (t.deletedAt) return false
      if (params?.status && t.status !== params.status) return false
      if (params?.projectId && t.projectId !== params.projectId) return false
      return true
    })
  }, [tasks, params?.status, params?.projectId])

  return {
    data: filtered,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
    refetch: () => Promise.resolve({ data: filtered }),
  }
}

export function useTask(id: string) {
  const tasks = useKanbanStore((s) => s.tasks)
  const task = useMemo(
    () => tasks.find((t) => t.id === id && !t.deletedAt),
    [tasks, id],
  )
  return {
    data: task,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTask() {
  const createTask = useKanbanStore((s) => s.createTask)
  const mutateAsync = useCallback(
    async (data: {
      title: string
      description?: string
      status?: TaskStatus
      priority?: TaskPriority
      projectId: string
    }) => createTask(data),
    [createTask],
  )
  return {
    mutate: (data: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(data)
    },
    mutateAsync,
    isPending: false,
  }
}

export function useUpdateTask() {
  const tasks = useKanbanStore((s) => s.tasks)
  const updateTask = useKanbanStore((s) => s.updateTask)

  const mutateAsync = useCallback(
    async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const current = tasks.find((t) => t.id === id)
      if (!current) throw new Error('Task not found')

      // Enforce status lifecycle on the client (replaces server 422)
      if (patch.status && patch.status !== current.status) {
        const result = validateTransition(current.status, patch.status)
        if (!result.valid) {
          throw new TransitionError(
            current.status,
            patch.status,
            getAllowedTransitions(current.status),
          )
        }
      }
      const updated = updateTask(id, patch as Partial<Omit<Task, 'id' | 'createdAt' | 'projectId'>>)
      if (!updated) throw new Error('Task not found')
      return updated
    },
    [tasks, updateTask],
  )

  return {
    mutate: (data: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(data)
    },
    mutateAsync,
    isPending: false,
  }
}

export function useDeleteTask() {
  const deleteTask = useKanbanStore((s) => s.deleteTask)
  const mutateAsync = useCallback(async (id: string) => {
    deleteTask(id)
  }, [deleteTask])
  return {
    mutate: (id: string) => {
      void mutateAsync(id)
    },
    mutateAsync,
    isPending: false,
  }
}

/**
 * React Query hooks for Tasks API
 * Provides: useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// ─── Transition error (422 from status-lifecycle validation) ─────────────────

export class TransitionError extends Error {
  public readonly from: string
  public readonly to: string
  public readonly allowed: string[]

  constructor(body: { error: string; from: string; to: string; allowed: string[] }) {
    super(body.error)
    this.name = 'TransitionError'
    this.from = body.from
    this.to = body.to
    this.allowed = body.allowed
  }
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  projectId: string | null
  createdAt: string
  updatedAt: string
}

async function fetchTasks(params?: { status?: TaskStatus; projectId?: string }): Promise<Task[]> {
  const url = new URL('/api/tasks', window.location.origin)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.projectId) url.searchParams.set('projectId', params.projectId)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}

async function fetchTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`)
  if (!res.ok) throw new Error('Failed to fetch task')
  return res.json()
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useTasks(params?: { status?: TaskStatus; projectId?: string }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => fetchTasks(params),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { title: string; description?: string; status?: TaskStatus; priority?: TaskPriority; projectId?: string }) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create task')
      return res.json() as Promise<Task>
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      if (task.projectId) qc.invalidateQueries({ queryKey: ['projects', task.projectId] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Task> & { id: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        // Parse 422 transition errors into a structured TransitionError
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          if (body.from && body.to && body.allowed) {
            throw new TransitionError(body)
          }
        }
        throw new Error('Failed to update task')
      }
      return res.json() as Promise<Task>
    },
    onMutate: async ({ id, ...data }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['tasks', id] })
      const prev = qc.getQueryData<Task>(['tasks', id])
      if (prev) qc.setQueryData(['tasks', id], { ...prev, ...data })
      return { prev }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks', id], ctx.prev)
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete task')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

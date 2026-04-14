/**
 * React Query hooks for Planning Threads API
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'

export interface PlanningThread {
  id: string
  projectId: string
  title: string
  phase: PlanningPhase
  visionDocument: string | null
  createdAt: string
  updatedAt: string
  lastMessage: string | null
  lastMessageAt: string | null
}

async function fetchThreads(projectId: string): Promise<PlanningThread[]> {
  const res = await fetch(`/api/planning-threads?projectId=${projectId}`)
  if (!res.ok) throw new Error('Failed to fetch threads')
  return res.json()
}

export function usePlanningThreads(projectId: string) {
  return useQuery({
    queryKey: ['planning-threads', projectId],
    queryFn: () => fetchThreads(projectId),
    enabled: !!projectId,
  })
}

export function useCreatePlanningThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { projectId: string; title?: string }) => {
      const res = await fetch('/api/planning-threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create thread')
      return res.json() as Promise<PlanningThread>
    },
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ['planning-threads', thread.projectId] })
    },
  })
}

export function useDeletePlanningThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const res = await fetch(`/api/planning-threads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete thread')
      return { id, projectId }
    },
    onSuccess: (_, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['planning-threads', projectId] })
    },
  })
}

export function useUpdatePlanningThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      title,
      phase,
      visionDocument,
    }: {
      id: string
      projectId: string
      title?: string
      phase?: PlanningPhase
      visionDocument?: string
    }) => {
      const res = await fetch(`/api/planning-threads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, phase, visionDocument }),
      })
      if (!res.ok) throw new Error('Failed to update thread')
      return res.json() as Promise<PlanningThread>
    },
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ['planning-threads', thread.projectId] })
    },
  })
}

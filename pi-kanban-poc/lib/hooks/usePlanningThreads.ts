/**
 * Hooks for Planning Threads, backed by localStorage store.
 */
'use client'

import { useCallback, useMemo } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { PlanningThread as StoreThread, PlanningPhase } from '@/types/domain'

export type { PlanningPhase }
export type PlanningThread = StoreThread

export function usePlanningThreads(projectId: string) {
  const threads = useKanbanStore((s) => s.planningThreads)
  const data = useMemo(
    () =>
      threads
        .filter((t) => t.projectId === projectId)
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt ?? b.updatedAt).getTime() -
            new Date(a.lastMessageAt ?? a.updatedAt).getTime(),
        ),
    [threads, projectId],
  )
  return {
    data,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useCreatePlanningThread() {
  const createThread = useKanbanStore((s) => s.createPlanningThread)
  const mutateAsync = useCallback(
    async (data: { projectId: string; title?: string }) => createThread(data),
    [createThread],
  )
  return {
    mutate: (
      data: Parameters<typeof mutateAsync>[0],
      options?: { onSuccess?: (thread: StoreThread) => void; onError?: (err: Error) => void },
    ) => {
      mutateAsync(data)
        .then((thread) => options?.onSuccess?.(thread))
        .catch((err) => options?.onError?.(err instanceof Error ? err : new Error(String(err))))
    },
    mutateAsync,
    isPending: false,
  }
}

export function useDeletePlanningThread() {
  const deleteThread = useKanbanStore((s) => s.deletePlanningThread)
  const mutateAsync = useCallback(
    async ({ id }: { id: string; projectId: string }) => {
      deleteThread(id)
    },
    [deleteThread],
  )
  return {
    mutate: (
      data: Parameters<typeof mutateAsync>[0],
      options?: { onSuccess?: () => void; onError?: (err: Error) => void },
    ) => {
      mutateAsync(data)
        .then(() => options?.onSuccess?.())
        .catch((err) => options?.onError?.(err instanceof Error ? err : new Error(String(err))))
    },
    mutateAsync,
    isPending: false,
  }
}

export function useUpdatePlanningThread() {
  const updateThread = useKanbanStore((s) => s.updatePlanningThread)
  const mutateAsync = useCallback(
    async ({
      id,
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
      const result = updateThread(id, {
        ...(title !== undefined ? { title } : {}),
        ...(phase !== undefined ? { phase } : {}),
        ...(visionDocument !== undefined ? { visionDocument } : {}),
      })
      if (!result) throw new Error('Thread not found')
      return result
    },
    [updateThread],
  )
  return {
    mutate: (
      data: Parameters<typeof mutateAsync>[0],
      options?: { onSuccess?: (thread: StoreThread) => void; onError?: (err: Error) => void },
    ) => {
      mutateAsync(data)
        .then((thread) => options?.onSuccess?.(thread))
        .catch((err) => options?.onError?.(err instanceof Error ? err : new Error(String(err))))
    },
    mutateAsync,
    isPending: false,
  }
}

/**
 * Hooks for Projects, backed by localStorage store.
 * API surface kept compatible with the prior React-Query version.
 */
'use client'

import { useCallback, useMemo } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { Project as StoreProject, ProjectDomain } from '@/types/domain'

export interface Project extends StoreProject {
  tasks?: Array<{ id: string; title: string; status: string; priority: string }>
}

export function useProjects() {
  const projects = useKanbanStore((s) => s.projects)
  const tasks = useKanbanStore((s) => s.tasks)

  const data = useMemo<Project[]>(
    () =>
      projects.map((p) => ({
        ...p,
        tasks: tasks
          .filter((t) => t.projectId === p.id)
          .map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
      })),
    [projects, tasks],
  )

  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useProject(id: string) {
  const projects = useKanbanStore((s) => s.projects)
  const allTasks = useKanbanStore((s) => s.tasks)
  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id])
  const tasks = useMemo(() => allTasks.filter((t) => t.projectId === id), [allTasks, id])
  const data = useMemo<Project | undefined>(
    () =>
      project
        ? {
            ...project,
            tasks: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
            })),
          }
        : undefined,
    [project, tasks],
  )
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useCreateProject() {
  const createProject = useKanbanStore((s) => s.createProject)
  const mutateAsync = useCallback(
    async (data: { name: string; description?: string; domain?: ProjectDomain }) =>
      createProject(data),
    [createProject],
  )
  return {
    mutate: (data: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(data)
    },
    mutateAsync,
    isPending: false,
  }
}

export function useUpdateProject() {
  const updateProject = useKanbanStore((s) => s.updateProject)
  const mutateAsync = useCallback(
    async ({ id, ...patch }: Partial<Project> & { id: string }) => {
      const result = updateProject(id, patch as Partial<StoreProject>)
      if (!result) throw new Error('Project not found')
      return result
    },
    [updateProject],
  )
  return {
    mutate: (data: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(data)
    },
    mutateAsync,
    isPending: false,
  }
}

export function useDeleteProject() {
  const deleteProject = useKanbanStore((s) => s.deleteProject)
  const mutateAsync = useCallback(async (id: string) => {
    deleteProject(id)
  }, [deleteProject])
  return {
    mutate: (id: string) => {
      void mutateAsync(id)
    },
    mutateAsync,
    isPending: false,
  }
}

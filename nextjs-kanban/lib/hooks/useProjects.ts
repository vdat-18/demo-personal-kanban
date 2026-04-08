/**
 * React Query hooks for Projects API
 * Provides: useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Project {
  id: string
  name: string
  description: string | null
  status: string | null
  createdAt: string
  updatedAt: string
  tasks?: Array<{ id: string; title: string; status: string; priority: string }>
}

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`)
  if (!res.ok) throw new Error('Failed to fetch project')
  return res.json()
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => fetchProject(id),
    enabled: !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create project')
      return res.json() as Promise<Project>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Project> & { id: string }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update project')
      return res.json() as Promise<Project>
    },
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ['projects', id] })
      const prev = qc.getQueryData<Project>(['projects', id])
      if (prev) qc.setQueryData(['projects', id], { ...prev, ...data })
      return { prev }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects', id], ctx.prev)
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['projects', id] })
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

/**
 * React Query hooks for Conversations API
 * Provides: useConversations, useConversation, useCreateConversation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Conversation {
  id: string
  taskId: string
  messages: Array<{ role: string; content: string }>
  result: string | null
  tokenUsage: unknown
  createdAt: string
  updatedAt: string
}

async function fetchConversations(taskId?: string): Promise<Conversation[]> {
  const url = new URL('/api/conversations', window.location.origin)
  if (taskId) url.searchParams.set('taskId', taskId)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to fetch conversations')
  return res.json()
}

async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`/api/conversations/${id}`)
  if (!res.ok) throw new Error('Failed to fetch conversation')
  return res.json()
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useConversations(taskId?: string) {
  return useQuery({
    queryKey: ['conversations', taskId],
    queryFn: () => fetchConversations(taskId),
  })
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversations', 'single', id],
    queryFn: () => fetchConversation(id),
    enabled: !!id,
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      taskId: string
      messages: Array<{ role: string; content: string }>
      result?: string
      tokenUsage?: unknown
    }) => {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create conversation')
      return res.json() as Promise<Conversation>
    },
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['conversations', conv.taskId] })
      qc.invalidateQueries({ queryKey: ['tasks', conv.taskId] })
    },
  })
}

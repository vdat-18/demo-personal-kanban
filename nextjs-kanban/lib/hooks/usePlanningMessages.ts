/**
 * React Query hooks for Planning Messages API
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface MutationActionState {
  mutationIndex: number
  action: 'approved' | 'dismissed'
}

export interface PlanningMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokenUsage: { input: number; output: number } | null
  createdAt: string
  mutationActions?: MutationActionState[]
}

class FetchError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FetchError'
    this.status = status
  }
}

export { FetchError }

async function fetchMessages(threadId: string): Promise<PlanningMessage[]> {
  const res = await fetch(`/api/planning-threads/${threadId}/messages`)
  if (!res.ok) throw new FetchError('Failed to fetch messages', res.status)
  return res.json()
}

export function usePlanningMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['planning-messages', threadId],
    queryFn: () => fetchMessages(threadId!),
    enabled: !!threadId,
    retry: false,   // fail fast so stale thread IDs are detected immediately
  })
}

export function useSendPlanningMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const res = await fetch(`/api/planning-threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      return res.json() as Promise<{
        userMessage: PlanningMessage
        assistantMessage: PlanningMessage
        tokenUsage: { input: number; output: number } | null
        phase: string
        visionDocument: string | null
      }>
    },
    onMutate: async ({ threadId, content }) => {
      // Optimistic update: add user message immediately
      await qc.cancelQueries({ queryKey: ['planning-messages', threadId] })
      const prev = qc.getQueryData<PlanningMessage[]>(['planning-messages', threadId])
      if (prev) {
        qc.setQueryData<PlanningMessage[]>(['planning-messages', threadId], [
          ...prev,
          {
            id: `optimistic-${Date.now()}`,
            threadId,
            role: 'user',
            content,
            tokenUsage: null,
            createdAt: new Date().toISOString(),
            mutationActions: [],
          },
        ])
      }
      return { prev }
    },
    onError: (_err, { threadId }, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['planning-messages', threadId], ctx.prev)
      }
    },
    onSuccess: (data, { threadId }) => {
      // Replace optimistic data with real data
      qc.invalidateQueries({ queryKey: ['planning-messages', threadId] })
      // Also refresh threads list for updated title and timestamp
      qc.invalidateQueries({ queryKey: ['planning-threads'] })
    },
  })
}

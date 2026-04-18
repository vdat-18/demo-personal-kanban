/**
 * Hooks for Planning Messages, backed by localStorage store.
 * Sending a message triggers the agent via /api/agent (pi-coding-agent SDK)
 * and persists both user and assistant messages locally.
 */
'use client'

import { useCallback, useMemo, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type {
  PlanningMessage as StoreMessage,
  MutationActionState,
} from '@/types/domain'

export type { MutationActionState }
export type PlanningMessage = StoreMessage

export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'FetchError'
    this.status = status
  }
}

export function usePlanningMessages(threadId: string | null) {
  const messages = useKanbanStore((s) => s.planningMessages)
  const data = useMemo(
    () =>
      threadId
        ? messages
            .filter((m) => m.threadId === threadId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [messages, threadId],
  )
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useSendPlanningMessage() {
  const createMessage = useKanbanStore((s) => s.createPlanningMessage)
  const threads = useKanbanStore((s) => s.planningThreads)
  const messagesAll = useKanbanStore((s) => s.planningMessages)
  const updateThread = useKanbanStore((s) => s.updatePlanningThread)

  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)

  const mutateAsync = useCallback(
    async ({ threadId, content }: { threadId: string; content: string }) => {
      const thread = threads.find((t) => t.id === threadId)
      if (!thread) throw new FetchError('Thread not found', 404)

      setIsPending(true)
      setIsError(false)
      try {
        // 1) Persist user message immediately
        const userMessage = createMessage({ threadId, role: 'user', content })

        // 2) Build chat history for the agent
        const history = messagesAll
          .filter((m) => m.threadId === threadId)
          .concat(userMessage)
          .map((m) => ({ role: m.role, content: m.content }))

        // 3) Call the unified agent endpoint
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'plan',
            phase: thread.phase,
            visionDocument: thread.visionDocument,
            messages: history,
          }),
        })
        if (!res.ok) throw new FetchError('Agent request failed', res.status)
        const data = (await res.json()) as {
          content: string
          tokenUsage: { input: number; output: number } | null
          phase?: string
          visionDocument?: string | null
        }

        // 4) Persist assistant message
        const assistantMessage = createMessage({
          threadId,
          role: 'assistant',
          content: data.content,
          tokenUsage: data.tokenUsage ?? null,
        })

        // 5) Update thread phase / vision if agent reported transitions
        if (data.phase || data.visionDocument !== undefined) {
          updateThread(threadId, {
            ...(data.phase ? { phase: data.phase as never } : {}),
            ...(data.visionDocument !== undefined
              ? { visionDocument: data.visionDocument }
              : {}),
          })
        }

        return {
          userMessage,
          assistantMessage,
          tokenUsage: data.tokenUsage ?? null,
          phase: data.phase ?? thread.phase,
          visionDocument: data.visionDocument ?? thread.visionDocument,
        }
      } finally {
        setIsPending(false)
      }
    },
    [createMessage, messagesAll, threads, updateThread],
  )

  type SendResult = Awaited<ReturnType<typeof mutateAsync>>

  const wrapped = useCallback(
    async (data: { threadId: string; content: string }) => {
      try {
        return await mutateAsync(data)
      } catch (e) {
        setIsError(true)
        throw e
      }
    },
    [mutateAsync],
  )

  return {
    mutate: (
      data: Parameters<typeof wrapped>[0],
      options?: { onSuccess?: (data: SendResult) => void; onError?: (err: Error) => void },
    ) => {
      wrapped(data)
        .then((result) => options?.onSuccess?.(result))
        .catch((err) => options?.onError?.(err instanceof Error ? err : new Error(String(err))))
    },
    mutateAsync: wrapped,
    isPending,
    isError,
  }
}

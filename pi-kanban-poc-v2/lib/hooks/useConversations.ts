/**
 * Hooks for Conversations, backed by localStorage store.
 */
'use client'

import { useCallback, useMemo } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { Conversation as StoreConversation, ConversationMessage, TokenUsage } from '@/types/domain'

export type Conversation = StoreConversation

export function useConversations(taskId?: string) {
  const conversations = useKanbanStore((s) => s.conversations)
  const data = useMemo(
    () => (taskId ? conversations.filter((c) => c.taskId === taskId) : conversations),
    [conversations, taskId],
  )
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useConversation(id: string) {
  const conversations = useKanbanStore((s) => s.conversations)
  const data = useMemo(() => conversations.find((c) => c.id === id), [conversations, id])
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null as Error | null,
  }
}

export function useCreateConversation() {
  const createConversation = useKanbanStore((s) => s.createConversation)
  const mutateAsync = useCallback(
    async (data: {
      taskId: string
      messages: ConversationMessage[]
      result?: string | null
      tokenUsage?: TokenUsage | null
    }) => createConversation(data),
    [createConversation],
  )
  return {
    mutate: (data: Parameters<typeof mutateAsync>[0]) => {
      void mutateAsync(data)
    },
    mutateAsync,
    isPending: false,
  }
}

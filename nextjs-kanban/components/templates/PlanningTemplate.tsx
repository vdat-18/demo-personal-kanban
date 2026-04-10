'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { ThreadListSidebar } from '@/components/organisms/ThreadListSidebar'
import { PlanningChatPanel } from '@/components/organisms/PlanningChatPanel'
import { TaskPanel } from '@/components/organisms/TaskPanel'
import {
  usePlanningThreads,
  useCreatePlanningThread,
  useDeletePlanningThread,
} from '@/lib/hooks/usePlanningThreads'
import { usePlanningMessages, useSendPlanningMessage } from '@/lib/hooks/usePlanningMessages'
import type { PlanningMessage } from '@/lib/hooks/usePlanningMessages'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
}

interface Project {
  id: string
  name: string
  description: string | null
  tasks: Task[]
}

export interface PlanningTemplateProps {
  project: Project
}

export function PlanningTemplate({ project: initialProject }: PlanningTemplateProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const { data: threads = [], isLoading: threadsLoading } = usePlanningThreads(initialProject.id)
  const createThread = useCreatePlanningThread()
  const deleteThread = useDeletePlanningThread()
  const { data: messages = [], isLoading: messagesLoading } = usePlanningMessages(activeThreadId)
  const sendMessage = useSendPlanningMessage()

  useEffect(() => {
    if (threadsLoading) return
    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id)
    } else if (threads.length === 0 && !createThread.isPending) {
      createThread.mutate(
        { projectId: initialProject.id },
        { onSuccess: (thread) => setActiveThreadId(thread.id) },
      )
    }
  }, [threads, threadsLoading, activeThreadId, initialProject.id, createThread])

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !activeThreadId || sendMessage.isPending) return
    sendMessage.mutate({ threadId: activeThreadId, content: input.trim() })
    setInput('')
  }, [input, activeThreadId, sendMessage])

  const handleNewThread = useCallback(() => {
    createThread.mutate(
      { projectId: initialProject.id },
      { onSuccess: (thread) => setActiveThreadId(thread.id) },
    )
  }, [createThread, initialProject.id])

  const handleDeleteThread = useCallback(
    (id: string) => {
      deleteThread.mutate(
        { id, projectId: initialProject.id },
        {
          onSuccess: () => {
            if (activeThreadId === id) {
              const remaining = threads.filter((t) => t.id !== id)
              setActiveThreadId(remaining[0]?.id ?? null)
            }
          },
        },
      )
    },
    [deleteThread, initialProject.id, activeThreadId, threads],
  )

  const handleApproveMutation = useCallback(
    async (mutation: TaskMutation) => {
      if (mutation.action === 'add') {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: mutation.title,
            description: mutation.description,
            priority: mutation.priority || 'MEDIUM',
            projectId: initialProject.id,
          }),
        })
        if (!res.ok) throw new Error('Failed to create task')
      } else if (mutation.action === 'update') {
        const res = await fetch(`/api/tasks/${mutation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.fields),
        })
        if (!res.ok) throw new Error('Failed to update task')
      } else if (mutation.action === 'delete') {
        const res = await fetch(`/api/tasks/${mutation.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to delete task')
      }
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    [initialProject.id, qc],
  )

  const handlePersistMutationAction = useCallback(
    async (threadId: string, messageId: string, mutationIndex: number, action: string) => {
      await fetch(
        `/api/planning-threads/${threadId}/messages/${messageId}/mutations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mutationIndex, action }),
        },
      )
    },
    [],
  )

  const chatMessages = messages
    .filter((m: PlanningMessage) => m.role === 'user' || m.role === 'assistant')
    .map((m: PlanningMessage) => ({ role: m.role, content: m.content }))

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
      <div className="w-64 shrink-0">
        <ThreadListSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          isCreating={createThread.isPending}
          isLoading={threadsLoading}
        />
      </div>

      <PlanningChatPanel
        projectName={initialProject.name}
        messages={messages}
        messagesLoading={messagesLoading}
        input={input}
        onInputChange={setInput}
        onSend={handleSendMessage}
        isSending={sendMessage.isPending}
        sendError={sendMessage.isError}
        activeThreadId={activeThreadId}
        onBack={() => router.push('/')}
        onApproveMutation={handleApproveMutation}
        onPersistMutationAction={handlePersistMutationAction}
      />

      <div className="w-[420px] shrink-0">
        <TaskPanel
          projectId={initialProject.id}
          projectName={initialProject.name}
          messages={chatMessages}
        />
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, use } from 'react'
import { notFound } from 'next/navigation'
import { SummaryTemplate } from '@/components/templates/SummaryTemplate'
import { useStoreHydrated, useKanbanStore } from '@/lib/storage/kanbanStore'

interface Props {
  params: Promise<{ id: string }>
}

export default function TaskSummaryPage({ params }: Props) {
  const { id } = use(params)
  const hydrated = useStoreHydrated()
  const tasks = useKanbanStore((s) => s.tasks)
  const allConversations = useKanbanStore((s) => s.conversations)
  const allSubtasks = useKanbanStore((s) => s.subtasks)
  const task = useMemo(() => tasks.find((t) => t.id === id), [tasks, id])
  const conversations = useMemo(
    () => allConversations.filter((c) => c.taskId === id),
    [allConversations, id],
  )
  const subtasks = useMemo(
    () => allSubtasks.filter((s) => s.taskId === id),
    [allSubtasks, id],
  )

  const serialized = useMemo(() => {
    if (!task) return null
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId,
      conversations: conversations.map((c) => ({
        id: c.id,
        messages: c.messages,
        result: c.result,
        tokenUsage: c.tokenUsage,
        createdAt: c.createdAt,
      })),
      subtasks: subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        completed: s.completed,
        approvalStatus: s.approvalStatus ?? null,
        doerResult: s.doerResult ?? null,
        reviewResult: s.reviewResult ?? null,
      })),
    }
  }, [task, conversations, subtasks])

  useEffect(() => {
    if (hydrated && !task) notFound()
  }, [hydrated, task])

  if (!hydrated || !serialized) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading summary…
      </div>
    )
  }

  return <SummaryTemplate task={serialized} />
}

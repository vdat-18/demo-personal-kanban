import { getTask } from '@/lib/db/tasks'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TaskSummaryClient } from '@/components/task-summary/TaskSummaryClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  let title = 'Task Summary'
  try {
    const task = await getTask(id)
    if (task) title = task.title
  } catch {}
  return {
    title: `Summary: ${title} | Personal Kanban`,
    description: `Execution summary for task: ${title}`,
  }
}

type TaskRow = NonNullable<Awaited<ReturnType<typeof getTask>>>
type ConvRow = TaskRow['conversations'][number]

export default async function TaskSummaryPage({ params }: Props) {
  const { id } = await params
  let task: TaskRow | null = null
  try {
    task = await getTask(id)
  } catch {}
  if (!task) notFound()

  const serialized = {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    projectId: task.projectId ?? null,
    conversations: (task.conversations ?? []).map((c: ConvRow) => ({
      id: c.id,
      messages: c.messages as unknown as Array<{ role: string; content: string }>,
      result: c.result != null ? (typeof c.result === 'string' ? c.result : JSON.stringify(c.result)) : null,
      tokenUsage: c.tokenUsage ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
  }

  return <TaskSummaryClient task={serialized} />
}

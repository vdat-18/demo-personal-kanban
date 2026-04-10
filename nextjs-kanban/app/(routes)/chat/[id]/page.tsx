import { getTask } from '@/lib/db/tasks'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ChatTemplate } from '@/components/templates/ChatTemplate'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  let title = 'Task Chat'
  try {
    const task = await getTask(id)
    if (task) title = task.title
  } catch {}
  return {
    title: `Chat: ${title} | Personal Kanban`,
    description: `AI agent chat for task: ${title}`,
  }
}

type TaskRow = NonNullable<Awaited<ReturnType<typeof getTask>>>
type ConvRow = TaskRow['conversations'][number]

export default async function TaskChatPage({ params }: Props) {
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
    conversations: (task.conversations ?? []).map((c: ConvRow) => {
      let tokenUsage: { input: number; output: number } | null = null
      if (c.tokenUsage) {
        const tu = typeof c.tokenUsage === 'string' ? JSON.parse(c.tokenUsage) : c.tokenUsage
        if (tu && typeof tu === 'object' && 'input' in tu && 'output' in tu) {
          tokenUsage = { input: Number(tu.input), output: Number(tu.output) }
        }
      }
      return {
        id: c.id,
        messages: c.messages as unknown as Array<{ role: string; content: string }>,
        result: c.result != null ? (typeof c.result === 'string' ? c.result : JSON.stringify(c.result)) : null,
        tokenUsage,
        createdAt: c.createdAt.toISOString(),
      }
    }),
  }

  return <ChatTemplate task={serialized} />
}

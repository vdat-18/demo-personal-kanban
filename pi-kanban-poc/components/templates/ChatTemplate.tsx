'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChatPanel } from '@/components/organisms/ChatPanel'
import { TaskInfoSidebar } from '@/components/organisms/TaskInfoSidebar'
import { TodoStepPlannerPanel } from '@/components/task-chat/TodoStepPlannerPanel'
import { TaskActivityTimeline } from '@/components/molecules/TaskActivityTimeline'
import { AGENT_OPTIONS } from '@/components/molecules/AgentSelector'
import type { UITaskStatus, UIConversation, ChatMsg } from '@/types/domain'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { validateTransition } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  projectId: string | null
  conversations: UIConversation[]
}

export interface ChatTemplateProps {
  task: Task
}

function getDefaultAgentIndex(status: UITaskStatus): number {
  if (status === 'TODO') return 0
  if (status === 'IN_REVIEW') return 2
  return 1
}

export function ChatTemplate({ task: initialTask }: ChatTemplateProps) {
  const router = useRouter()
  const [task, setTask] = useState(initialTask)
  const createConversationInStore = useKanbanStore((s) => s.createConversation)
  const updateTaskInStore = useKanbanStore((s) => s.updateTask)
  const allSubtasks = useKanbanStore((s) => s.subtasks)
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const last = initialTask.conversations[initialTask.conversations.length - 1]
    if (last?.messages?.length) {
      return last.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    }
    return [
      {
        role: 'assistant',
        content: `I'm your AI agent for task: **${initialTask.title}**.\n\nStatus: \`${initialTask.status}\`\n\nHow can I help? I can:\n- Break it down into subtasks\n- Research and analyse\n- Generate implementation plans\n- Review and provide feedback`,
      },
    ]
  })
  const [input, setInput] = useState('')
  const [activeAgentIdx, setActiveAgentIdx] = useState(() => getDefaultAgentIndex(initialTask.status))
  const [progressEvents, setProgressEvents] = useState<StreamEvent[]>([])

  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  const { startStream, abort, isStreaming, streamingContent, error: streamError } = useAgentStream({
    onProgress: (ev) => {
      setProgressEvents((prev) => [...prev.slice(-4), ev])
    },
    onComplete: async (result, tokenUsage) => {
      // Append final assistant message
      const newAssistant: ChatMsg = { role: 'assistant', content: result }
      setMessages((prev) => [...prev, newAssistant])
      setProgressEvents([])

      // Persist the full transcript as a Conversation in the local store
      const transcript = [...messages, newAssistant].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
      const conv = createConversationInStore({
        taskId: task.id,
        messages: transcript,
        result,
        tokenUsage: tokenUsage ?? null,
      })
      setTask((prev) => ({
        ...prev,
        conversations: [
          ...prev.conversations,
          {
            id: conv.id,
            messages: conv.messages,
            result: conv.result,
            tokenUsage: conv.tokenUsage,
            createdAt: conv.createdAt,
          },
        ],
      }))
    },
    onError: (msg) => {
      setProgressEvents([])
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Stream error: ${msg}. Please try again or check your API configuration.`,
        },
      ])
    },
  })

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const userContent = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userContent }])
    setInput('')
    setProgressEvents([])
    await startStream(activeOption.role, userContent, task.id, messages)
  }, [input, isStreaming, task.id, activeOption.role, startStream, messages])

  const updateTaskStatus = useCallback(
    async (status: UITaskStatus) => {
      const result = validateTransition(task.status as TaskStatusValue, status as TaskStatusValue)
      if (!result.valid && task.status !== status) {
        console.warn(result.message)
        return
      }
      const updated = updateTaskInStore(task.id, { status })
      if (updated) setTask((prev) => ({ ...prev, status: updated.status }))
    },
    [task.id, task.status, updateTaskInStore],
  )

  const taskSubtasks = useMemo(
    () => allSubtasks.filter((sub) => sub.taskId === task.id),
    [allSubtasks, task.id],
  )

  const topPanel =
    task.status === 'TODO' ? (
      <TodoStepPlannerPanel
        taskId={task.id}
        taskTitle={task.title}
        taskStatus={task.status}
        onMoveToInProgress={() => updateTaskStatus('IN_PROGRESS')}
      />
    ) : null

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
      <ChatPanel
        taskTitle={task.title}
        taskStatus={task.status}
        taskProjectId={task.projectId}
        topPanel={topPanel}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        activeAgentIdx={activeAgentIdx}
        onAgentChange={setActiveAgentIdx}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        streamError={streamError}
        progressEvents={progressEvents}
        onAbort={abort}
        onBack={() =>
          task.projectId
            ? router.push(`/mission-control/${task.projectId}`)
            : router.push('/')
        }
        onViewSummary={() => router.push(`/summary/${task.id}`)}
        isDone={task.status === 'DONE'}
      />

      <TaskInfoSidebar
        taskTitle={task.title}
        taskDescription={task.description}
        taskStatus={task.status}
        taskPriority={task.priority}
        subtasks={taskSubtasks}
        conversations={task.conversations}
        isStreaming={isStreaming}
        activeAgentLabel={activeOption.label}
        onUpdateStatus={updateTaskStatus}
        onAbort={abort}
        activityTimeline={<TaskActivityTimeline taskId={task.id} />}
      />
    </div>
  )
}

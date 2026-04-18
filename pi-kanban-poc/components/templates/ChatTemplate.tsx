'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChatPanel } from '@/components/organisms/ChatPanel'
import { TaskInfoSidebar } from '@/components/organisms/TaskInfoSidebar'
import { AGENT_OPTIONS } from '@/components/molecules/AgentSelector'
import type { UITaskStatus, UIConversation, ChatMsg } from '@/types/domain'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'

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

export function ChatTemplate({ task: initialTask }: ChatTemplateProps) {
  const router = useRouter()
  const [task, setTask] = useState(initialTask)
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
  const [activeAgentIdx, setActiveAgentIdx] = useState(1)
  const [progressEvents, setProgressEvents] = useState<StreamEvent[]>([])

  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  const { startStream, abort, isStreaming, streamingContent, error: streamError } = useAgentStream({
    onProgress: (ev) => {
      setProgressEvents((prev) => [...prev.slice(-4), ev])
    },
    onComplete: async (result, _tokenUsage, conversation) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: result }])
      setProgressEvents([])

      if (conversation) {
        setTask((prev) => ({
          ...prev,
          conversations: [
            ...prev.conversations,
            {
              id: conversation.id,
              messages: conversation.messages,
              result: typeof conversation.result === 'string' ? conversation.result : conversation.result ? JSON.stringify(conversation.result) : null,
              tokenUsage: conversation.tokenUsage as { input: number; output: number } | null,
              createdAt: conversation.createdAt,
            },
          ],
        }))
      }
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

  const updateTaskStatus = useCallback(async (status: UITaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTask((prev) => ({ ...prev, ...updated }))
      } else if (res.status === 422) {
        const body = await res.json().catch(() => ({}))
        console.warn(`Invalid transition: ${body.from} → ${body.to}. Allowed: ${body.allowed?.join(', ')}`)
      }
    } catch (err) {
      console.error(err)
    }
  }, [task.id])

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
      <ChatPanel
        taskTitle={task.title}
        taskStatus={task.status}
        taskProjectId={task.projectId}
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
        conversations={task.conversations}
        isStreaming={isStreaming}
        activeAgentLabel={activeOption.label}
        onUpdateStatus={updateTaskStatus}
        onAbort={abort}
      />
    </div>
  )
}

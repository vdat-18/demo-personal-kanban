'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQueryClient } from '@tanstack/react-query'

import { ThreadListSidebar } from './ThreadListSidebar'
import { TaskPanel } from './TaskPanel'
import { TaskMutationCard } from './TaskMutationCard'
import type { MutationCardStatus } from './TaskMutationCard'
import { parseTaskMutations } from '@/lib/utils/parseTaskMutations'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'
import {
  usePlanningThreads,
  useCreatePlanningThread,
  useDeletePlanningThread,
} from '@/lib/hooks/usePlanningThreads'
import { usePlanningMessages, useSendPlanningMessage } from '@/lib/hooks/usePlanningMessages'
import type { PlanningMessage } from '@/lib/hooks/usePlanningMessages'

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

export function PlanningClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [input])

  // ─── Thread hooks ──────────────────────────────────────────────────────
  const { data: threads = [], isLoading: threadsLoading } = usePlanningThreads(initialProject.id)
  const createThread = useCreatePlanningThread()
  const deleteThread = useDeletePlanningThread()

  // ─── Message hooks ─────────────────────────────────────────────────────
  const { data: messages = [], isLoading: messagesLoading } = usePlanningMessages(activeThreadId)
  const sendMessage = useSendPlanningMessage()

  // ─── Auto-select or auto-create first thread ──────────────────────────
  useEffect(() => {
    if (threadsLoading) return

    if (threads.length > 0 && !activeThreadId) {
      // Select the most recently updated thread
      setActiveThreadId(threads[0].id)
    } else if (threads.length === 0 && !createThread.isPending) {
      // No threads — create one automatically
      createThread.mutate(
        { projectId: initialProject.id },
        {
          onSuccess: (thread) => setActiveThreadId(thread.id),
        },
      )
    }
  }, [threads, threadsLoading, activeThreadId, initialProject.id, createThread])

  // ─── Scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Handlers ──────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !activeThreadId || sendMessage.isPending) return

    sendMessage.mutate(
      { threadId: activeThreadId, content: input.trim() },
      {
        onSuccess: () => {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        },
      },
    )
    setInput('')
  }, [input, activeThreadId, sendMessage])

  const handleNewThread = useCallback(() => {
    createThread.mutate(
      { projectId: initialProject.id },
      {
        onSuccess: (thread) => setActiveThreadId(thread.id),
      },
    )
  }, [createThread, initialProject.id])

  const handleDeleteThread = useCallback(
    (id: string) => {
      deleteThread.mutate(
        { id, projectId: initialProject.id },
        {
          onSuccess: () => {
            if (activeThreadId === id) {
              // Switch to the next available thread
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
      // Refresh the tasks panel
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
    [initialProject.id, qc],
  )

  // Build conversation messages for generate-tasks API
  const chatMessages = messages
    .filter((m: PlanningMessage) => m.role === 'user' || m.role === 'assistant')
    .map((m: PlanningMessage) => ({ role: m.role, content: m.content }))

  // Welcome message shown when a thread has no messages
  const showWelcome = !messagesLoading && messages.length === 0

  return (
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
      {/* Left: Thread Sidebar */}
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

      {/* Center: Chat Panel */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-100 bg-white">
        {/* Header */}
        <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-[#0a192f]">{initialProject.name}</h1>
            <p className="text-xs text-gray-400">AI Planning Session</p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {showWelcome && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0 mt-1">
                    AI
                  </div>
                  <div className="max-w-[80%] rounded-3xl rounded-bl-lg px-5 py-4 text-sm leading-relaxed bg-gray-50 text-[#0a192f]">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {`Welcome! I'm your AI Planning Agent for **${initialProject.name}**.\n\nI can see all your project tasks and help you manage them. I can suggest adding new tasks, updating existing ones, or removing completed ones.\n\nWhat would you like to plan?`}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg: PlanningMessage) => {
                const parsed =
                  msg.role === 'assistant' ? parseTaskMutations(msg.content) : null
                const displayContent = parsed?.cleanContent ?? msg.content
                const mutations = parsed?.mutations ?? []

                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0 mt-1">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0a192f] text-white rounded-br-lg'
                          : 'bg-gray-50 text-[#0a192f] rounded-bl-lg'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {displayContent}
                            </ReactMarkdown>
                          </div>
                          {mutations.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {mutations.map((mutation, idx) => {
                                // Look up persisted status from DB
                                const savedAction = msg.mutationActions?.find(
                                  (a) => a.mutationIndex === idx,
                                )
                                const initialStatus: MutationCardStatus = savedAction
                                  ? (savedAction.action as MutationCardStatus)
                                  : 'pending'

                                return (
                                  <TaskMutationCard
                                    key={idx}
                                    mutation={mutation}
                                    initialStatus={initialStatus}
                                    onApprove={handleApproveMutation}
                                    onDismiss={() => {}}
                                    onPersistAction={async (action) => {
                                      await fetch(
                                        `/api/planning-threads/${msg.threadId}/messages/${msg.id}/mutations`,
                                        {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ mutationIndex: idx, action }),
                                        },
                                      )
                                    }}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                )
              })}

              {sendMessage.isPending && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0">
                    AI
                  </div>
                  <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          {sendMessage.isError && (
            <div className="mb-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              Failed to send message. Please try again.
            </div>
          )}
          <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32 overflow-y-auto"
              placeholder="Describe your project goals..."
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={!activeThreadId}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || sendMessage.isPending || !activeThreadId}
              className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: Tasks Panel */}
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

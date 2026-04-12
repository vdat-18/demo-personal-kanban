'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Activity,
  FileText,
  StopCircle,
  Zap,
  AlertCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AgentBadge } from '@/components/shared/AgentBadge'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

interface Conversation {
  id: string
  messages: Array<{ role: string; content: string }>
  result: string | null
  tokenUsage: { input: number; output: number } | null
  createdAt: string
}

interface Subtask {
  id: string
  title: string
  completed: boolean
}

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: string
  projectId: string | null
  subtasks?: Subtask[]
  conversations: Conversation[]
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

// Map display agent names → AgentRole values
const AGENT_OPTIONS: Array<{ label: string; role: string }> = [
  { label: 'Planner Agent', role: 'architect' },
  { label: 'Doer Agent', role: 'developer' },
  { label: 'Reviewer Agent', role: 'reviewer' },
]

const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-600',
}

// ── Streaming progress event display ─────────────────────────────────────────
function StreamEventPill({ event }: { event: StreamEvent }) {
  if (event.type === 'started') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase tracking-widest">
        <Zap className="w-3 h-3 animate-pulse" /> Agent started…
      </div>
    )
  }
  if (event.type === 'progress') {
    const label =
      typeof event.message === 'string'
        ? event.message
        : typeof event.step === 'string'
        ? event.step
        : 'Processing…'
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-medium truncate">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
        {label}
      </div>
    )
  }
  return null
}

// ── Conversation History with pagination (10.3, 10.4) ────────────────────────
const PAGE_SIZE = 3

function ConversationHistory({ conversations }: { conversations: Conversation[] }) {
  const [page, setPage] = useState(0)
  const total = conversations.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  // Show most-recent first
  const sorted = [...conversations].reverse()
  const visible = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Activity className="w-3 h-3" /> History ({total})
      </h3>
      <div className="space-y-2">
        {visible.map((conv) => {
          const tu = conv.tokenUsage as { input?: number; output?: number } | null
          return (
            <div
              key={conv.id}
              className="text-xs text-gray-500 py-2 border-b border-gray-50 last:border-0"
            >
              <p className="font-semibold text-[#0a192f] text-[10px]">
                {new Date(conv.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {conv.result && (
                <p className="mt-0.5 line-clamp-2 leading-relaxed">
                  {conv.result.slice(0, 120)}{conv.result.length > 120 ? '…' : ''}
                </p>
              )}
              {tu && (tu.input != null || tu.output != null) && (
                <p className="mt-1 text-[9px] text-gray-400 font-mono">
                  {tu.input ?? 0}↑ {tu.output ?? 0}↓ tokens
                </p>
              )}
            </div>
          )
        })}
      </div>
      {/* Pagination controls (10.4) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[10px] font-bold text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"
          >
            ← Newer
          </button>
          <span className="text-[9px] text-gray-300 font-mono">
            {page + 1}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[10px] font-bold text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function TaskChatClient({ task: initialTask }: { task: Task }) {
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
  const [activeAgentIdx, setActiveAgentIdx] = useState(1) // default: Doer (developer)
  // Latest progress events shown beneath the typing indicator (9.6)
  const [progressEvents, setProgressEvents] = useState<StreamEvent[]>([])
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

  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  // ── streaming hook (cleanup on unmount handled inside the hook — 9.9) ───────
  const { startStream, abort, isStreaming, streamingContent, error: streamError } = useAgentStream({
    onProgress: (ev) => {
      setProgressEvents((prev) => [...prev.slice(-4), ev]) // keep last 5 events
    },
    onComplete: async (result, _tokenUsage, conversation) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: result }])
      setProgressEvents([])

      // Conversation was already persisted by the /api/agents/stream backend
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return
    const userContent = input.trim()
    setMessages((prev) => [...prev, { role: 'user', content: userContent }])
    setInput('')
    setProgressEvents([])

    // Pass existing messages so the BE can persist the full conversation history
    await startStream(activeOption.role, userContent, task.id, messages)
  }, [input, isStreaming, task.id, activeOption.role, startStream, messages])

  const updateTaskStatus = useCallback(async (status: TaskStatus) => {
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
      {/* ── Left: Chat panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 border-r border-gray-100 bg-white min-w-0">
        {/* Header */}
        <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
          <button
            onClick={() =>
              task.projectId
                ? router.push(`/mission-control/${task.projectId}`)
                : router.push('/')
            }
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[#0a192f] truncate">{task.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                  STATUS_COLOR[task.status]
                }`}
              >
                {task.status}
              </span>
              <AgentBadge agentType={activeOption.label} size="sm" />
              {isStreaming && (
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                  streaming…
                </span>
              )}
            </div>
          </div>
          {task.status === 'DONE' && (
            <button
              onClick={() => router.push(`/summary/${task.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shrink-0"
            >
              <FileText className="w-4 h-4" /> Summary
            </button>
          )}
        </header>

        {/* Agent selector */}
        <div className="px-6 py-3 border-b border-gray-50 flex gap-2 overflow-x-auto shrink-0">
          {AGENT_OPTIONS.map((opt, i) => (
            <button
              key={opt.role}
              onClick={() => setActiveAgentIdx(i)}
              disabled={isStreaming}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 ${
                activeAgentIdx === i
                  ? 'bg-[#0a192f] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black mr-3 shrink-0 mt-1">
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
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Live streaming bubble — shows token deltas as they arrive */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black mr-3 shrink-0 mt-1">
                AI
              </div>
              <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4 flex flex-col gap-2 max-w-[80%]">
                {streamingContent ? (
                  <div className="prose prose-sm max-w-none text-[#0a192f]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
                  </div>
                ) : (
                  /* Typing dots shown before first token arrives */
                  <div className="flex gap-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                )}
                {/* Progress event breadcrumbs (tool calls etc.) */}
                {progressEvents.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {progressEvents.map((ev, i) => (
                      <StreamEventPill key={i} event={ev} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stream error banner (9.7) */}
          {streamError && !isStreaming && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{streamError}</span>
              <button
                onClick={() => {
                  // Clear error state by re-rendering (reset is handled internally)
                }}
                className="ml-auto text-red-400 hover:text-red-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32 overflow-y-auto"
              placeholder={`Ask ${activeOption.label}…`}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              disabled={isStreaming}
            />
            {isStreaming ? (
              /* Abort button — stop the current stream (9.7) */
              <button
                onClick={abort}
                className="w-9 h-9 rounded-2xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shrink-0"
                title="Stop streaming"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-300 mt-2 px-2 font-medium">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Right: Task info panel ────────────────────────────────────────────── */}
      <div className="w-80 overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
        {/* Status Controls — lifecycle-aware: only show valid transitions */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Update Status
          </h3>
          <div className="flex flex-col gap-2">
            {/* Current status indicator */}
            <div className={`py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-center bg-[#0a192f] text-white`}>
              {task.status}
            </div>
            {/* Valid transition buttons */}
            {getAllowedTransitions(task.status as TaskStatusValue).length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {getAllowedTransitions(task.status as TaskStatusValue).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateTaskStatus(s as TaskStatus)}
                    className="py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors bg-gray-50 text-gray-500 hover:bg-gray-100"
                  >
                    {s === 'BLOCKED' ? '⛔ BLOCK' : s === 'TODO' ? '↩ RESTORE' : `→ ${s}`}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400 text-center font-medium py-1">
                No transitions available (terminal state)
              </p>
            )}
          </div>
        </div>

        {/* Task Details & Subtasks */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            Task Details
          </h3>
          <p className="font-bold text-sm text-[#0a192f] mb-2">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 leading-relaxed">{task.description}</p>
          )}

          {/* Subtasks Section */}
          {(task.subtasks && task.subtasks.length > 0) ? (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Subtasks</span>
                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {task.subtasks.filter(st => st.completed).length} / {task.subtasks.length}
                </span>
              </h4>
              <div className="space-y-2">
                {task.subtasks.map((st) => (
                  <div key={st.id} className="flex items-start gap-2.5 group">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/tasks/${task.id}/subtasks/${st.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ completed: !st.completed })
                        })
                        if (res.ok) {
                          setTask(prev => ({
                            ...prev,
                            subtasks: prev.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s)
                          }))
                        }
                      }}
                      className={`mt-0.5 shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                        st.completed 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'border-gray-300 bg-gray-50 group-hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200'
                      }`}
                    >
                      {st.completed && (
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`text-xs leading-relaxed transition-colors ${st.completed ? 'text-gray-400 line-through' : 'text-[#0a192f] font-medium'}`}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col items-center justify-center py-2 text-center text-gray-400">
              <span className="text-[10px] uppercase font-bold tracking-widest">No Subtasks</span>
              <span className="text-[10px] mt-1">If this task is in TODO, AI might be breaking it down!</span>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400">Priority</span>
            <span className="text-xs font-bold text-[#0a192f]">{task.priority}</span>
          </div>
        </div>

        {/* Conversation History (10.3) */}
        {task.conversations.length > 0 && (
          <ConversationHistory conversations={task.conversations} />
        )}

        {/* Streaming status card — visible while a stream is active */}
        {isStreaming && (
          <div className="bg-blue-50 rounded-3xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">
                Live Stream
              </h3>
            </div>
            <p className="text-xs text-blue-500 font-medium">
              {activeOption.label} is processing your request in real-time…
            </p>
            <button
              onClick={abort}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-500 bg-white border border-red-100 hover:bg-red-50 transition-colors"
            >
              <StopCircle className="w-3 h-3" /> Stop
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

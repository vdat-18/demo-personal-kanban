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
  ClipboardCopy,
  Download,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AgentBadge } from '@/components/molecules/AgentBadge'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeAgentMessage — strips artefacts that should never appear in chat UI:
//   • Raw JSON blocks (tool call hallucinations, data dumps)
//   • Function call text patterns: subtask_update(id="...", completed=True)
//   • "Calling the function…" / "Executing…" meta-commentary
//   • Trailing whitespace/blank lines left by the stripping above
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeAgentMessage(content: string): string {
  let text = content

  // 1. Strip ```json ... ``` code fences that contain raw data objects/arrays
  //    (keep non-JSON code blocks intact for legitimate code examples)
  text = text.replace(/```json[\s\S]*?```/gi, '')

  // 2. Strip bare JSON blocks that start with { or [ at the beginning of a line
  //    Use a heuristic: if a code block starts with { or [ it's probably a data dump
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const inner = match.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim()
    // Keep code blocks that don't look like plain data (have keywords, operators etc.)
    if (/^[\[{]/.test(inner) && !/function|const|let|var|import|class|def |return |if |for /.test(inner)) {
      return ''
    }
    return match
  })

  // 3. Strip bare JSON objects/arrays that span multiple lines (not inside code fences)
  //    These appear when the agent outputs raw data as text, e.g.:
  //    { "Potential Suppliers List": [...] }
  //    Match balanced braces/brackets at the start of a line
  text = text.replace(/(?:^|\n)(\s*[\[{][\s\S]*?[\]}]\s*)(?=\n|$)/gm, (match) => {
    const trimmed = match.trim()
    // Only strip if it parses as valid JSON (genuine data dump)
    try { JSON.parse(trimmed); return '' } catch { return match }
  })

  // 4. Strip inline tool-call patterns:
  //    subtask_update(id="...", completed=True)
  //    subtask_update({ "id": "...", "completed": true })
  text = text.replace(/\bsubtask_update\s*[\(\{][^)}\n]*[\)\}]/g, '')

  // 5. Strip lines that are purely meta-commentary about tool invocation
  const metaPatterns = [
    /^(now |i will |let me |i'm going to )?(call|invoke|execute|run|trigger|use)(ing)? (the |this )?(subtask_update|task_update|db_query)[^\n]*/i,
    /^(calling|invoking|executing|running) (function|tool|the function|the tool)[^\n]*/i,
    /^\*\*(calling|invoking|executing)[^\n]*/i,
    /^"recipient_name":[^\n]*/i,
    /^\s*\{?\s*"recipient_name"[^\n]*/i,
  ]
  const lines = text.split('\n')
  const filteredLines = lines.filter(line => !metaPatterns.some(p => p.test(line.trim())))
  text = filteredLines.join('\n')

  // 6. Collapse 3+ consecutive blank lines into max 2
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// PostReportActions — shown below Master Report with quick actions
// ─────────────────────────────────────────────────────────────────────────────
function PostReportActions({
  reportContent,
  taskId,
  taskStatus,
  onStatusChange,
}: {
  reportContent: string
  taskId: string
  taskStatus: string
  onStatusChange: (newStatus: string) => void
}) {
  const [isCopied, setIsCopied] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)
  const [moved, setMoved] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportContent)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDownload = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${taskId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleMoveToReview = async () => {
    if (moved || taskStatus === 'IN_REVIEW' || taskStatus === 'DONE') return
    setIsMoving(true)
    setMoveError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_REVIEW' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to move task')
      }
      setMoved(true)
      onStatusChange('IN_REVIEW')
    } catch (e: any) {
      setMoveError(e.message)
    } finally {
      setIsMoving(false)
    }
  }

  const alreadyInReview = taskStatus === 'IN_REVIEW' || moved
  const isDone = taskStatus === 'DONE'

  return (
    <div className="ml-11 flex flex-col gap-2">
      {/* Action buttons row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Move to Review */}
        {!isDone && (
          <button
            onClick={handleMoveToReview}
            disabled={isMoving || alreadyInReview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              alreadyInReview
                ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-sm'
            }`}
          >
            {alreadyInReview
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Moved to Review</>
              : isMoving
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Moving…</>
                : <><ChevronRight className="w-3.5 h-3.5" /> Move to Review</>
            }
          </button>
        )}

        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors active:scale-95"
        >
          {isCopied
            ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Copied!</>
            : <><ClipboardCopy className="w-3.5 h-3.5" /> Copy Report</>
          }
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors active:scale-95"
        >
          <Download className="w-3.5 h-3.5" /> Download .md
        </button>
      </div>

      {/* Error message */}
      {moveError && (
        <p className="text-[11px] text-red-500 font-medium ml-1">⚠️ {moveError}</p>
      )}
    </div>
  )
}

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
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [page, setPage] = useState(0)
  // Deduplicate by ID to prevent React key collision from rapid state updates
  const unique = conversations.filter((conv, idx, arr) => arr.findIndex(c => c.id === conv.id) === idx)
  const total = unique.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  // Show most-recent first
  const sorted = [...unique].reverse()
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
                {mounted ? new Date(conv.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'Loading date...'}
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
  const prevStatusRef = useRef<TaskStatus>(initialTask.status)
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const last = initialTask.conversations[initialTask.conversations.length - 1]
    if (last?.messages?.length) {
      return last.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    }

    // Start with the context-aware intro message (kept in sync with auto-refresh).
    const buildIntroForInitial = (t: Task): ChatMsg => {
      const subtaskCount = t.subtasks?.length ?? 0
      const allDone = subtaskCount > 0 && (t.subtasks ?? []).every(st => st.completed)
      const pendingSubtask = t.subtasks?.find(st => !st.completed)

      let introContent = `I'm your AI agent for task: **${t.title}**.\n\nStatus: \`${t.status}\`\n\nHow can I help?`

      // TODO is planning mode: never show execution instructions here.
      if (t.status === 'TODO') {
        if (subtaskCount > 0) {
          introContent = `👋 I'm your **Planner Agent** for task: **${t.title}**.\n\nThis task already has **${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}** from the planning phase. Let me walk you through each one to make sure the plan is solid before we begin.\n\nI'll go step by step — reviewing each subtask with you, checking if anything needs clarification or adjustment.\n\n**Ready? Let's start with the first one.** Just say "go" and I'll begin the review.`
        } else {
          introContent = `👋 I'm your **Planner Agent** for task: **${t.title}**.\n\nThis task has no subtasks yet. Tell me what "done" looks like and any constraints (deadline, audience, scope), and I'll propose a clear subtask plan before you start execution.`
        }
      } else if (t.subtasks && t.subtasks.length > 0) {
        if (allDone) {
          introContent = `🎉 All subtasks for **${t.title}** are complete.\n\nIf you want, I can generate the final report, or you can move this task to \`IN_REVIEW\`.`
        } else if (pendingSubtask) {
          introContent = `Hello! Task **${t.title}** has ${t.subtasks.length} subtasks. The next pending item is: **${pendingSubtask.title}**.\n\nTo instruct me to do this for you, you can type:\n> *"Please execute the subtask: ${pendingSubtask.title}."*\n\nOr:\n> *"Please execute all pending subtasks one by one, and confirm as you complete each one."*\n\nWhat would you like me to do?`
        }
      } else {
        introContent += `\n\nI can:\n- Break it down into subtasks\n- Research and analyse\n- Generate implementation plans`
      }

      return { role: 'assistant', content: introContent }
    }

    return [buildIntroForInitial(initialTask)]
  })
  const [input, setInput] = useState('')
  const [activeAgentIdx, setActiveAgentIdx] = useState(
    initialTask.status === 'TODO' ? 0 : initialTask.status === 'IN_REVIEW' ? 2 : 1
  )
  // Latest progress events shown beneath the typing indicator (9.6)
  const [progressEvents, setProgressEvents] = useState<StreamEvent[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper: build the context-aware intro message based on current subtask state
  const buildIntroMessage = (t: Task): ChatMsg => {
    const allDone = t.subtasks && t.subtasks.length > 0 && t.subtasks.every(st => st.completed)
    const pendingSubtask = t.subtasks?.find(st => !st.completed)
    const subtaskCount = t.subtasks?.length ?? 0

    let introContent = `I'm your AI agent for task: **${t.title}**.\n\nStatus: \`${t.status}\`\n\nHow can I help?`

    // TODO is planning mode: never show execution instructions here.
    if (t.status === 'TODO') {
      if (subtaskCount > 0) {
        introContent = `👋 I'm your **Planner Agent** for task: **${t.title}**.\n\nThis task already has **${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''}** from the planning phase. Let me walk you through each one to make sure the plan is solid before we begin.\n\nI'll go step by step — reviewing each subtask with you, checking if anything needs clarification or adjustment.\n\n**Ready? Let's start with the first one.** Just say "go" and I'll begin the review.`
      } else {
        introContent = `👋 I'm your **Planner Agent** for task: **${t.title}**.\n\nThis task has no subtasks yet. Tell me what "done" looks like and any constraints (deadline, audience, scope), and I'll propose a clear subtask plan before you start execution.`
      }
      return { role: 'assistant', content: introContent }
    }

    if (t.subtasks && t.subtasks.length > 0) {
      if (allDone) {
        introContent = `🎉 All ${t.subtasks.length} subtasks for **${t.title}** are now complete!\n\nI can now write a **Master Synthesis Report** that connects everything together and explains how the task objective was met.\n\nJust say:\n> *"Generate the final report"*\n\nOr to move this task forward:\n> *"Move this task to IN_REVIEW"*`
      } else if (pendingSubtask) {
        introContent = `Hello! Task **${t.title}** has ${t.subtasks.length} subtasks. The next pending item is: **${pendingSubtask.title}**.\n\nTo instruct me to do this for you, you can type a prompt like:\n> *"Please execute the subtask: ${pendingSubtask.title}."*\n\nOr, if you want me to work through all of them for you, try:\n> *"Please execute all pending subtasks one by one, and confirm as you complete each one."*\n\nWhat would you like me to do?`
      }
    } else {
      introContent += ` I can:\n- Break it down into subtasks\n- Research and analyse\n- Generate implementation plans`
    }
    return { role: 'assistant', content: introContent }
  }

  // Auto-refresh the welcome message whenever subtasks change state
  useEffect(() => {
    setMessages(prev => {
      // Only replace if the FIRST message is the AI intro (not a real conversation)
      if (prev.length === 1 && prev[0].role === 'assistant' && !prev[0].content.includes('[[REPORT_START]]')) {
        return [buildIntroMessage(task)]
      }
      return prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.subtasks])
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [input])

  const activeOption = AGENT_OPTIONS[activeAgentIdx]

  // Auto-chain state: true when user asked to "execute all" subtasks
  const [isAutoRunning, setIsAutoRunning] = useState(false)
  const isAutoRunningRef = useRef(false)
  const activeOptionRef = useRef(activeOption)
  // Track pending count before each auto-chain run to detect stale progress (tool errors)
  const prevPendingCountRef = useRef<number>(-1)
  useEffect(() => { activeOptionRef.current = activeOption }, [activeOption])

  // Auto-switch to Reviewer Agent when task enters IN_REVIEW
  useEffect(() => {
    if (task.status === 'TODO') {
      setActiveAgentIdx(0) // Planner Agent — brainstorm & refine subtasks
    } else if (task.status === 'IN_REVIEW') {
      setActiveAgentIdx(2) // Reviewer Agent
    } else if (task.status === 'IN_PROGRESS') {
      setActiveAgentIdx(1) // Doer Agent — execute subtasks
    }
  }, [task.status])

  // On status transitions, switch chat context so UI feels like the new mode.
  useEffect(() => {
    const prev = prevStatusRef.current
    if (prev !== task.status) {
      if (prev === 'TODO' && task.status === 'IN_PROGRESS') {
        const nextIntro = buildIntroMessage(task)
        setMessages((prevMsgs) => {
          // If user hasn't started a real thread yet, replace intro outright.
          if (prevMsgs.length <= 1) return [nextIntro]
          // Otherwise, preserve history and add a clear mode-switch message.
          return [
            ...prevMsgs,
            {
              role: 'assistant',
              content: `✅ Task moved to \`IN_PROGRESS\`. Switching to **Doer Agent** mode.\n\n${nextIntro.content}`,
            },
          ]
        })
      }
      prevStatusRef.current = task.status
    }
  }, [task.status])

  // Detect "execute all" intent from the user's message
  const isExecuteAllIntent = useCallback((text: string) => {
    const lower = text.toLowerCase()
    return (
      lower.includes('execute all') ||
      lower.includes('all pending') ||
      lower.includes('all subtasks') ||
      lower.includes('do all') ||
      lower.includes('work through all')
    )
  }, [])

  const { startStream, abort, isStreaming, streamingContent, error: streamError } = useAgentStream({
    onProgress: (ev) => {
      setProgressEvents((prev) => [...prev.slice(-4), ev]) // keep last 5 events
    },
    onComplete: async (result, _tokenUsage, conversation) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: result }])
      setProgressEvents([])

      // Refresh task state to get updated subtask statuses
      const taskRes = await fetch(`/api/tasks/${task.id}`)
      let updatedTask = taskRes.ok ? await taskRes.json() : null

      // ── Hallucination rescue (always-on): if the agent mentioned a UUID in its
      // response that corresponds to a still-pending subtask, apply the update via
      // the REST API. This handles cases where GPT-4o emits JSON text instead of
      // invoking the native tool.
      if (updatedTask) {
        const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
        const pendingSubtasks: Array<{ id: string; completed: boolean }> = (updatedTask.subtasks ?? []).filter((st: { completed: boolean }) => !st.completed)
        const pendingIds = new Set(pendingSubtasks.map((st) => st.id.toLowerCase()))
        const uuidsInText = (result.match(UUID_PATTERN) ?? []).map((u: string) => u.toLowerCase())
        const matchedId = uuidsInText.find((u: string) => pendingIds.has(u))

        if (matchedId) {
          try {
            const rescueRes = await fetch(`/api/tasks/${task.id}/subtasks/${matchedId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ completed: true }),
            })
            if (rescueRes.ok) {
              const refreshRes = await fetch(`/api/tasks/${task.id}`)
              if (refreshRes.ok) updatedTask = await refreshRes.json()
            }
          } catch { /* silently ignore rescue errors */ }
        }
      }

      if (updatedTask) {
        setTask((prev) => ({
          ...prev,
          status: updatedTask.status,
          subtasks: updatedTask.subtasks,
          // Deduplicate conversations by ID to avoid React key collisions
          conversations: (updatedTask.conversations as Conversation[]).filter(
            (c, i, arr) => arr.findIndex(x => x.id === c.id) === i
          ),
        }))

        // ── Auto-chain: continue if still running ──────────────────────────
        if (isAutoRunningRef.current) {
          // Use the already-rescued updatedTask (hallucination rescue ran above)
          const pending = (updatedTask.subtasks ?? []).filter((st: { completed: boolean }) => !st.completed)

          // Stale-progress guard: if pending count still didn't decrease even after
          // the hallucination rescue, stop to avoid an infinite loop.
          if (prevPendingCountRef.current !== -1 && pending.length >= prevPendingCountRef.current) {
            isAutoRunningRef.current = false
            setIsAutoRunning(false)
            prevPendingCountRef.current = -1
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `⚠️ Auto-execution paused — could not mark the subtask as complete. Please use the checkboxes on the right to tick the completed subtask manually, then type "continue" to resume auto-execution.`,
              },
            ])
            return
          }

          prevPendingCountRef.current = pending.length

          if (pending.length > 0) {
            // Still have subtasks — trigger next one automatically
            const nextMsg = `Execute ONLY the single next PENDING subtask in the list. Work on it thoroughly, then call subtask_update with its exact UUID to mark it done. Stop after that one subtask.`
            setMessages((prev) => [...prev, { role: 'user', content: `⚡ Auto-executing next subtask (${pending.length} remaining)…` }])
            await startStream(activeOptionRef.current.role, nextMsg, task.id, [])
          } else {
            // All done — trigger Master Report
            isAutoRunningRef.current = false
            setIsAutoRunning(false)
            prevPendingCountRef.current = -1
            const reportMsg = `All subtasks are now completed. Generate the Master Synthesis Report now following your template.`
            setMessages((prev) => [...prev, { role: 'user', content: `📊 Generating Master Report…` }])
            await startStream(activeOptionRef.current.role, reportMsg, task.id, [])
          }
          return
        }
      }

      // Fallback: no updatedTask
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
      isAutoRunningRef.current = false
      setIsAutoRunning(false)
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

  const sendMessage = useCallback(async (forcedInput?: string) => {
    const textToSend = typeof forcedInput === 'string' ? forcedInput : input.trim()
    if (!textToSend || isStreaming) return
    setMessages((prev) => [...prev, { role: 'user', content: textToSend }])
    if (typeof forcedInput !== 'string') setInput('')
    setProgressEvents([])

    // Detect "execute all" intent → start auto-chain mode
    if (isExecuteAllIntent(textToSend)) {
      const pendingSubtasks = task.subtasks?.filter(st => !st.completed) ?? []
      if (pendingSubtasks.length > 0) {
        isAutoRunningRef.current = true
        setIsAutoRunning(true)
        prevPendingCountRef.current = pendingSubtasks.length
        // Override message to execute only the FIRST pending subtask
        const singleMsg = `Execute ONLY the single next PENDING subtask in the list. Work on it thoroughly, call subtask_update with its exact UUID to mark it done, then stop. Do not proceed to other subtasks.`
        await startStream(activeOption.role, singleMsg, task.id, messages)
        return
      }
    }

    // Normal message
    await startStream(activeOption.role, textToSend, task.id, messages)
  }, [input, isStreaming, task.id, task.subtasks, activeOption.role, startStream, messages, isExecuteAllIntent])

  const stopAutoRun = useCallback(() => {
    isAutoRunningRef.current = false
    setIsAutoRunning(false)
    prevPendingCountRef.current = -1
    abort()
    setMessages((prev) => [...prev, { role: 'assistant', content: '⏹️ Auto-execution stopped.' }])
  }, [abort])

  // Auto-start Reviewer stream when task enters IN_REVIEW
  const startReviewerStream = useCallback(async () => {
    if (isStreaming) return
    const reviewMsg = `The task is now IN_REVIEW. Please review all the work completed above and provide your Quality Review Report. Call task_update when you have made your decision.`
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: '🔍 Starting Quality Review — Reviewer Agent is evaluating the work…' },
    ])
    await startStream('reviewer', reviewMsg, task.id, [])
  }, [isStreaming, task.id, startStream])


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

        {/* Agent selector — filtered by status */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between shrink-0">
          <div className="flex gap-2 overflow-x-auto">
            {AGENT_OPTIONS.map((opt, i) => {
              // Show only the contextually relevant agent(s) per status
              if (task.status === 'TODO' && opt.role !== 'architect') return null
              if (task.status === 'IN_PROGRESS' && opt.role !== 'developer') return null
              if (task.status === 'IN_REVIEW' && opt.role !== 'reviewer') return null
              return (
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
              )
            })}
          </div>
          {/* Start Task CTA — only shown for TODO */}
          {task.status === 'TODO' && (
            <button
              onClick={() => updateTaskStatus('IN_PROGRESS')}
              disabled={isStreaming}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0 ml-4"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Start Task
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => {
            const isReport = msg.content.includes('[[REPORT_START]]')
            const rawContent = msg.content.replace('[[REPORT_START]]', '').replace('[[REPORT_END]]', '')
            // Strip tool-call artefacts and raw JSON dumps from assistant messages
            const displayContent = msg.role === 'assistant' ? sanitizeAgentMessage(rawContent) : rawContent

            // Skip rendering if sanitization removed all content
            if (msg.role === 'assistant' && !displayContent.trim()) return null

            return (
              <div key={i} className="flex flex-col gap-2">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black mr-3 shrink-0 mt-1 ${isReport ? 'bg-amber-500 shadow-md ring-2 ring-amber-200' : 'bg-blue-600'}`}>
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed text-justify relative group ${
                      msg.role === 'user'
                        ? 'bg-[#0a192f] text-white rounded-br-lg'
                        : isReport
                          ? 'bg-amber-50 border-2 border-amber-200 text-amber-950 rounded-bl-lg shadow-lg'
                          : 'bg-gray-50 text-[#0a192f] rounded-bl-lg'
                    }`}
                  >
                    {isReport && (
                      <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm mb-1">
                        Master Synthesis Report
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className={`prose prose-sm max-w-none text-justify ${isReport ? 'prose-amber font-medium' : ''}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
                      </div>
                    ) : (
                      displayContent
                    )}
                  </div>
                </div>

                {/* ── Post-Report Action Bar ──────────────────────────────── */}
                {isReport && (
                  <PostReportActions
                    reportContent={displayContent}
                    taskId={task.id}
                    taskStatus={task.status}
                    onStatusChange={(newStatus: string) => {
                      setTask((prev) => ({ ...prev, status: newStatus as TaskStatus }))
                      if (newStatus === 'IN_REVIEW') {
                        // Small delay so status update renders first, then auto-start reviewer
                        setTimeout(() => startReviewerStream(), 600)
                      }
                    }}
                  />
                )}
              </div>
            )
          })}

          {/* Live streaming bubble — shows token deltas as they arrive */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-black mr-3 shrink-0 mt-1">
                AI
              </div>
              <div className="bg-gray-50 rounded-3xl rounded-bl-lg px-5 py-4 flex flex-col gap-2 max-w-[80%]">
                {streamingContent ? (
                  <div className="prose prose-sm max-w-none text-[#0a192f]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizeAgentMessage(streamingContent)}</ReactMarkdown>
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

          {/* Review Mode Banner — shown when task is IN_REVIEW */}
          {task.status === 'IN_REVIEW' && (
            <div className="mx-2 mb-3 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl shrink-0">
              <span className="text-lg shrink-0">🔍</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Review Mode</p>
                <p className="text-[11px] text-amber-600 leading-relaxed mt-0.5">
                  Reviewer Agent is evaluating the completed work. It will approve (→ DONE) or request changes (→ back to Doing).
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-gray-100 shrink-0 relative flex flex-col gap-2">
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
                onClick={() => sendMessage()}
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

          {/* Subtask Section / Review Decision — context-aware */}
          {task.status === 'IN_REVIEW' ? (
            /* Review Decision panel — shown while IN_REVIEW */
            <div className="mt-4 pt-4 border-t border-gray-50">
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                🔍 Review Decision
              </h4>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                Reviewer Agent will call these automatically. You can also trigger manually:
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updateTaskStatus('DONE')}
                  className="py-2.5 rounded-xl text-xs font-black text-white bg-green-500 hover:bg-green-600 active:scale-95 transition-all shadow-sm"
                >
                  ✅ Approve → DONE
                </button>
                <button
                  onClick={() => updateTaskStatus('IN_PROGRESS')}
                  className="py-2.5 rounded-xl text-xs font-black text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  ↩️ Needs Changes → Doing
                </button>
              </div>
            </div>
          ) : (task.subtasks && task.subtasks.length > 0) ? (
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
                          setTask(prev => {
                            const newSubtasks = prev.subtasks?.map(s => s.id === st.id ? { ...s, completed: !s.completed } : s)
                            // Auto-trigger celebratory message if all are done
                            if (!st.completed && newSubtasks && newSubtasks.every(s => s.completed)) {
                              setTimeout(() => {
                                setMessages(m => [
                                  ...m, 
                                  { role: 'assistant', content: `🎉 **Awesome! You've checked off the final subtask!**\n\nThe whole checklist is complete. Let me know if you want me to review the results, or you can just push this task to \`IN_REVIEW\` now.` }
                                ])
                              }, 600)
                            }
                            return { ...prev, subtasks: newSubtasks }
                          })
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
              onClick={isAutoRunning ? stopAutoRun : abort}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-red-500 bg-white border border-red-100 hover:bg-red-50 transition-colors"
            >
              <StopCircle className="w-3 h-3" /> {isAutoRunning ? 'Stop Auto-Run' : 'Stop'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, ChevronDown, ChevronUp, FileText, Lightbulb, Map, CheckSquare, PanelLeftClose, PanelLeftOpen, Paperclip, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useQueryClient } from '@tanstack/react-query'

import { ThreadListSidebar } from '@/components/organisms/ThreadListSidebar'
import { TaskPanel } from '@/components/organisms/TaskPanel'
import { TaskMutationCard } from '@/components/molecules/TaskMutationCard'
import type { MutationCardStatus } from '@/components/molecules/TaskMutationCard'
import { parseTaskMutations } from '@/lib/utils/parseTaskMutations'
import type { TaskMutation } from '@/lib/utils/parseTaskMutations'
import {
  usePlanningThreads,
  useCreatePlanningThread,
  useDeletePlanningThread,
  useUpdatePlanningThread,
} from '@/lib/hooks/usePlanningThreads'
import type { PlanningPhase } from '@/lib/hooks/usePlanningThreads'
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

// ── Phase UI config ──────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<PlanningPhase, {
  label: string
  step: number
  icon: typeof Lightbulb
  color: string
  bg: string
  border: string
  description: string
}> = {
  discovery: {
    label: 'Discovery',
    step: 1,
    icon: Lightbulb,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'AI is asking questions to understand your project',
  },
  blueprint: {
    label: 'Blueprint',
    step: 2,
    icon: Map,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    description: 'Reviewing the strategic plan before task creation',
  },
  task_mapping: {
    label: 'Task Mapping',
    step: 3,
    icon: CheckSquare,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    description: 'Creating and approving actionable tasks',
  },
}

// ── Vision Document Panel ────────────────────────────────────────────────────

function VisionDocumentPanel({ visionDocument }: { visionDocument: string | null }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!visionDocument) return null

  return (
    <div className="mx-4 mb-3 rounded-3xl border border-blue-100 bg-blue-50/40 overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-blue-100/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Vision Document</span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-blue-400" />
          : <ChevronDown className="w-4 h-4 text-blue-400" />
        }
      </button>
      {isExpanded && (
        <div className="px-6 pb-5 text-sm text-blue-900 leading-relaxed prose prose-sm max-w-none prose-headings:text-blue-800 prose-strong:text-blue-900 text-justify border-t border-blue-100 pt-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{visionDocument}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

// ── Phase Progress Bar ───────────────────────────────────────────────────────

function PhaseProgressBar({ phase }: { phase: PlanningPhase }) {
  const phases: PlanningPhase[] = ['discovery', 'blueprint', 'task_mapping']
  const currentStep = PHASE_CONFIG[phase].step

  return (
    <div className="flex items-center gap-1 px-6 py-4 border-b border-gray-100 bg-white shrink-0">
      {phases.map((p, idx) => {
        const cfg = PHASE_CONFIG[p]
        const Icon = cfg.icon
        const isActive = p === phase
        const isDone = cfg.step < currentStep

        return (
          <div key={p} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[11px] font-black transition-all ${
              isActive
                ? `${cfg.bg} ${cfg.color} shadow-sm border ${cfg.border}`
                : isDone
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : 'bg-gray-50 text-gray-300 border border-transparent'
            }`}>
              <Icon className={`w-3.5 h-3.5 ${isActive ? cfg.color : isDone ? 'text-green-500' : 'text-gray-300'}`} />
              <span className="uppercase tracking-wider">{cfg.label}</span>
              {isDone && <span className="ml-1">✓</span>}
            </div>
            {idx < phases.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? 'bg-green-200' : 'bg-gray-100'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main PlanningClient ──────────────────────────────────────────────────────

export function PlanningClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [currentPhase, setCurrentPhase] = useState<PlanningPhase>('discovery')
  const [currentVisionDoc, setCurrentVisionDoc] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [input])

  // ─── Thread hooks ──────────────────────────────────────────────────────────
  const { data: threads = [], isLoading: threadsLoading, isFetching: threadsFetching } = usePlanningThreads(initialProject.id)
  const createThread = useCreatePlanningThread()
  const deleteThread = useDeletePlanningThread()
  const renameThread = useUpdatePlanningThread()

  // ─── Message hooks ─────────────────────────────────────────────────────────
  const { data: messages = [], isLoading: messagesLoading, isError: messagesError } = usePlanningMessages(activeThreadId)
  const sendMessage = useSendPlanningMessage()

  // ─── Sync local phase state when switching threads ─────────────────────────
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null
  useEffect(() => {
    if (activeThread) {
      setCurrentPhase(activeThread.phase ?? 'discovery')
      setCurrentVisionDoc(activeThread.visionDocument ?? null)
    }
  }, [activeThread?.id, activeThread?.phase, activeThread?.visionDocument])

  // ─── Auto-select or auto-create first thread ──────────────────────────────
  const isCreatingThread = useRef(false)
  useEffect(() => {
    // Wait for BOTH initial load AND background refetch to finish
    // before acting on thread list — prevents stale-cache race condition
    // where an old cached thread ID no longer exists in the DB.
    if (threadsLoading || threadsFetching) return

    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id)
    } else if (threads.length === 0 && !isCreatingThread.current) {
      isCreatingThread.current = true
      createThread.mutate(
        { projectId: initialProject.id },
        {
          onSuccess: (thread) => setActiveThreadId(thread.id),
          onError: () => { isCreatingThread.current = false },
        },
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, threadsLoading, threadsFetching, activeThreadId, initialProject.id])

  // ─── Reset stale thread ID if it no longer exists in DB (e.g. after restart) ─
  useEffect(() => {
    if (messagesError && activeThreadId) {
      // Thread ID is invalid (404 or gone) — clear it so the effect above
      // will either select another thread or create a fresh one.
      setActiveThreadId(null)
      isCreatingThread.current = false
      // Also invalidate threads list to remove the stale entry from cache
      qc.invalidateQueries({ queryKey: ['planning-threads', initialProject.id] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesError, activeThreadId])

  // ─── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── File upload handler ───────────────────────────────────────────────────
  const handleFileSelect = useCallback((e: { target: HTMLInputElement & { value: string }; currentTarget: HTMLInputElement }) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        setAttachedFiles((prev) => [...prev, { name: file.name, content }])
      }
      reader.readAsText(file)
    })
    // reset input so same file can be re-selected
    e.target.value = ''
  }, [])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if ((!input.trim() && attachedFiles.length === 0) || !activeThreadId || sendMessage.isPending) return

    const fileBlock = attachedFiles.length > 0
      ? '\n\n' + attachedFiles.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n')
      : ''
    const fullContent = input.trim() + fileBlock

    sendMessage.mutate(
      { threadId: activeThreadId, content: fullContent },
      {
        onSuccess: (data) => {
          // Update local phase and vision doc state from server response
          if (data.phase) setCurrentPhase(data.phase as PlanningPhase)
          if (data.visionDocument !== undefined) setCurrentVisionDoc(data.visionDocument)
          // Refresh threads so sidebar phase badge stays in sync
          qc.invalidateQueries({ queryKey: ['planning-threads', initialProject.id] })
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        },
      },
    )
    setInput('')
    setAttachedFiles([])
  }, [input, attachedFiles, activeThreadId, sendMessage, qc, initialProject.id])

  const handleNewThread = useCallback(() => {
    createThread.mutate(
      { projectId: initialProject.id },
      {
        onSuccess: (thread) => {
          setActiveThreadId(thread.id)
          setCurrentPhase('discovery')
          setCurrentVisionDoc(null)
        },
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
              const remaining = threads.filter((t) => t.id !== id)
              setActiveThreadId(remaining[0]?.id ?? null)
            }
          },
        },
      )
    },
    [deleteThread, initialProject.id, activeThreadId, threads],
  )

  const handleRenameThread = useCallback(
    (id: string, title: string) => {
      renameThread.mutate({ id, projectId: initialProject.id, title })
    },
    [renameThread, initialProject.id],
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

  // Build conversation messages for generate-tasks API
  const chatMessages = messages
    .filter((m: PlanningMessage) => m.role === 'user' || m.role === 'assistant')
    .map((m: PlanningMessage) => ({ role: m.role, content: m.content }))

  const showWelcome = !messagesLoading && messages.length === 0
  const phaseConfig = PHASE_CONFIG[currentPhase]
  const PhaseIcon = phaseConfig.icon

  // Welcome message per phase
  const welcomeText = `Welcome! I'm your AI Planning Agent for **${initialProject.name}**.\n\nI follow a structured 3-phase process:\n1. **Discovery** — I'll ask questions to understand your goals deeply\n2. **Blueprint** — We'll create a strategic plan together\n3. **Task Mapping** — Then we'll break it into actionable tasks\n\nLet's start. Tell me about this project — what are you trying to achieve?`

  return (
    <div className="flex h-full w-full bg-[#f0f2f5] font-sans">
      {/* Left: Thread Sidebar */}
      <div className={`shrink-0 transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
        <ThreadListSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewThread={handleNewThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onToggleSidebar={() => setIsSidebarOpen(false)}
          isCreating={createThread.isPending}
          isLoading={threadsLoading}
        />
      </div>

      {/* Center: Chat Panel */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-200 bg-white">
        {/* Header */}
        <header className="h-20 px-8 border-b border-gray-100 flex items-center gap-5 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              title="Back to Projects"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm text-[#0a192f]">{initialProject.name}</h1>
            <p className="text-xs text-gray-400">AI Planning Session</p>
          </div>
          {/* Phase badge in header */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[12px] font-black ${phaseConfig.bg} ${phaseConfig.color} border ${phaseConfig.border} shadow-sm`}>
            <PhaseIcon className="w-4 h-4" />
            <span className="uppercase tracking-wider">{phaseConfig.label}</span>
          </div>
        </header>

        {/* Phase Progress Bar */}
        <PhaseProgressBar phase={currentPhase} />

        {/* Vision Document Panel */}
        <VisionDocumentPanel visionDocument={currentVisionDoc} />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {showWelcome && (
                <div className="flex justify-start">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-4 shrink-0 mt-1 shadow-lg shadow-blue-500/30">
                    AI
                  </div>
                  <div className="max-w-[90%] rounded-[32px] rounded-bl-lg px-6 py-4 text-sm leading-relaxed bg-slate-50 text-[#0a192f] shadow-sm">
                    <div className="prose prose-slate max-w-none ai-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {welcomeText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg: PlanningMessage) => {
                const parsed =
                  msg.role === 'assistant' ? parseTaskMutations(msg.content) : null
                let displayContent = parsed?.cleanContent ?? msg.content
                if (msg.role === 'assistant') {
                  displayContent = displayContent.replace(/```vision-update[\s\S]*?```/g, '')
                  displayContent = displayContent.replace(/\[PHASE:[a-zA-Z_]+\]/g, '')
                  displayContent = displayContent.trim()
                }
                const mutations = parsed?.mutations ?? []

                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-4 shrink-0 mt-1 shadow-lg shadow-blue-500/30">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[90%] rounded-[32px] px-6 py-4 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-[#0a192f] text-white rounded-br-lg whitespace-pre-wrap'
                          : 'bg-slate-50 text-[#0a192f] rounded-bl-lg'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <div className="prose prose-slate max-w-none ai-prose">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {displayContent}
                            </ReactMarkdown>
                          </div>
                          {mutations.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {mutations.map((mutation, idx) => {
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
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-4 shrink-0 shadow-lg shadow-blue-500/30">
                    AI
                  </div>
                  <div className="bg-slate-50 rounded-[32px] rounded-bl-lg px-6 py-4 shadow-sm">
                    <div className="flex gap-1.5">
                      <span
                        className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce"
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

        {/* Input Area */}
        <div className="px-8 pb-8 pt-2">
          {/* Phase hint above input */}
          <div className={`mb-3 px-4 py-2.5 rounded-2xl text-[11px] font-black ${phaseConfig.bg} ${phaseConfig.color} flex items-center gap-2 shadow-sm border ${phaseConfig.border}`}>
            <PhaseIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-widest">{phaseConfig.description}</span>
          </div>
          {sendMessage.isError && (
            <div className="mb-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              Failed to send message. Please try again.
            </div>
          )}
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs text-blue-700">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 items-end bg-white border border-gray-100 rounded-[32px] px-6 py-4 shadow-xl shadow-gray-200/50">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeThreadId}
              className="w-7 h-7 rounded-xl text-gray-400 flex items-center justify-center hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30 shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={textareaRef}
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[24px] max-h-[450px] overflow-y-auto scrollbar-none transition-[height] duration-75"
              placeholder={currentPhase === 'discovery' ? 'Tell me about your project...' : currentPhase === 'blueprint' ? 'Review or adjust the blueprint...' : 'Describe your next task or ask a question...'}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={!activeThreadId}
            />
            <button
              onClick={handleSendMessage}
              disabled={(!input.trim() && attachedFiles.length === 0) || sendMessage.isPending || !activeThreadId}
              className="w-11 h-11 rounded-2xl bg-[#0a192f] text-white flex items-center justify-center hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-30 shrink-0"
            >
              <Send className="w-5 h-5" />
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
          phase={currentPhase}
        />
      </div>
    </div>
  )
}

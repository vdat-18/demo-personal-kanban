'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, ChevronDown, ChevronUp, FileText, Lightbulb, Map, CheckSquare, PanelLeftClose, PanelLeftOpen, Paperclip, X } from 'lucide-react'
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
    <div className="mx-4 mb-3 rounded-2xl border border-blue-100 bg-blue-50/60 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-blue-100/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">Vision Document</span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
        }
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 text-xs text-blue-900 leading-relaxed prose prose-xs max-w-none prose-headings:text-blue-800 prose-strong:text-blue-900 text-justify border-t border-blue-100 pt-3">
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
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-gray-50/50 shrink-0">
      {phases.map((p, idx) => {
        const cfg = PHASE_CONFIG[p]
        const Icon = cfg.icon
        const isActive = p === phase
        const isDone = cfg.step < currentStep

        return (
          <div key={p} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
              isActive
                ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                : isDone
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-gray-100 text-gray-400'
            }`}>
              <Icon className="w-3 h-3" />
              <span>{cfg.label}</span>
              {isDone && <span>✓</span>}
            </div>
            {idx < phases.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
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
  const { data: threads = [], isLoading: threadsLoading } = usePlanningThreads(initialProject.id)
  const createThread = useCreatePlanningThread()
  const deleteThread = useDeletePlanningThread()
  const renameThread = useUpdatePlanningThread()

  // ─── Message hooks ─────────────────────────────────────────────────────────
  const { data: messages = [], isLoading: messagesLoading } = usePlanningMessages(activeThreadId)
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
    if (threadsLoading) return

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
  }, [threads, threadsLoading, activeThreadId, initialProject.id])

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
    <div className="flex h-full w-full bg-[#f8f9fa] font-sans">
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
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-100 bg-white">
        {/* Header */}
        <header className="h-16 px-6 border-b border-gray-100 flex items-center gap-4 shrink-0">
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
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${phaseConfig.bg} ${phaseConfig.color} border ${phaseConfig.border}`}>
            <PhaseIcon className="w-3.5 h-3.5" />
            <span>{phaseConfig.label}</span>
          </div>
        </header>

        {/* Phase Progress Bar */}
        <PhaseProgressBar phase={currentPhase} />

        {/* Vision Document Panel */}
        <VisionDocumentPanel visionDocument={currentVisionDoc} />

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
                  <div className="max-w-[80%] rounded-3xl rounded-bl-lg px-5 py-4 text-sm leading-relaxed bg-gray-50 text-[#0a192f] text-justify">
                    <div className="prose prose-sm max-w-none">
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
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-3 shrink-0 mt-1">
                        AI
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0a192f] text-white rounded-br-lg whitespace-pre-wrap'
                          : 'bg-gray-50 text-[#0a192f] rounded-bl-lg text-justify'
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

        {/* Phase hint above input */}
        <div className={`mx-4 mb-1 px-3 py-1.5 rounded-xl text-[10px] font-medium ${phaseConfig.bg} ${phaseConfig.color} flex items-center gap-1.5`}>
          <PhaseIcon className="w-3 h-3 shrink-0" />
          <span>{phaseConfig.description}</span>
        </div>

        {/* Input */}
        <div className="p-4 pt-1 border-t border-gray-100">
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
          <div className="flex gap-3 items-end bg-gray-50 rounded-3xl px-5 py-3">
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
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[20px] max-h-32 overflow-y-auto"
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
          phase={currentPhase}
        />
      </div>
    </div>
  )
}

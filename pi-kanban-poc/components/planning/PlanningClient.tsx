'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Send,
  Lightbulb,
  ClipboardCheck,
  ListChecks,
  PanelLeftOpen,
  Paperclip,
  FileText,
  X,
  Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ThreadListSidebar } from '@/components/organisms/ThreadListSidebar'
import { TaskPanel } from '@/components/organisms/TaskPanel'
import { BatchQuestionCard } from '@/components/molecules/BatchQuestionCard'
import { PhaseTransitionCard } from '@/components/molecules/PhaseTransitionCard'
import { TaskProposalCard } from '@/components/molecules/TaskProposalCard'
import { VisionPanel } from '@/components/molecules/VisionPanel'
import { VisionHistoryDrawer } from '@/components/molecules/VisionHistoryDrawer'
import { PhaseStepper } from '@/components/molecules/PhaseStepper'
import {
  usePlanningThreads,
  useCreatePlanningThread,
  useDeletePlanningThread,
  useUpdatePlanningThread,
} from '@/lib/hooks/usePlanningThreads'
import { usePlanningMessages, useSendPlanningMessage } from '@/lib/hooks/usePlanningMessages'
import type { PlanningMessage } from '@/lib/hooks/usePlanningMessages'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { PHASE_DISPLAY, PHASE_ORDER, nextPhase as computeNextPhase } from '@/constants/phases'
import type {
  PlanningPhase,
  QuestionBatchSubmission,
  StructuredTaskProposal,
} from '@/types/domain'

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

const ICON_MAP = {
  lightbulb: Lightbulb,
  'clipboard-check': ClipboardCheck,
  'list-checks': ListChecks,
} as const

// ── File helpers (Tier 3.12 lightweight intake) ──────────────────────────────
// Non-image files are read as text client-side and appended to the chat
// message. Images would need the multimodal API — kept as a follow-up.

interface AttachedFile {
  name: string
  content: string
  kind: 'text' | 'unsupported'
}

async function readFileAsText(file: File): Promise<AttachedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const textExtensions = new Set([
    'txt', 'md', 'csv', 'json', 'yaml', 'yml', 'xml', 'html', 'log',
    'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'rb', 'sh',
  ])
  if (!textExtensions.has(extension)) {
    return {
      name: file.name,
      content: `(Unsupported format: .${extension}. Try converting to .md, .txt, or paste the content directly.)`,
      kind: 'unsupported',
    }
  }
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = (ev.target?.result as string) ?? ''
      // Cap at 50k chars to avoid blowing the context window.
      const capped = content.length > 50_000 ? content.slice(0, 50_000) + '\n\n(…truncated)' : content
      resolve({ name: file.name, content: capped, kind: 'text' })
    }
    reader.onerror = () =>
      resolve({ name: file.name, content: '(Failed to read file.)', kind: 'unsupported' })
    reader.readAsText(file)
  })
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function PlanningClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [pendingVisionEdit, setPendingVisionEdit] = useState<
    { newContent: string; previousContent: string | null } | null
  >(null)
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

  const { data: threads = [], isLoading: threadsLoading } = usePlanningThreads(initialProject.id)
  const createThread = useCreatePlanningThread()
  const deleteThread = useDeletePlanningThread()
  const renameThread = useUpdatePlanningThread()

  const { data: messages = [], isLoading: messagesLoading } = usePlanningMessages(activeThreadId)
  const sendMessage = useSendPlanningMessage()

  const createTaskFn = useKanbanStore((s) => s.createTask)
  const updateThreadFn = useKanbanStore((s) => s.updatePlanningThread)
  const setPhaseTransitionResponseFn = useKanbanStore((s) => s.setPhaseTransitionResponse)
  const setTaskProposalActionFn = useKanbanStore((s) => s.setTaskProposalAction)
  const getVisionVersionsForThread = useKanbanStore((s) => s.getVisionVersionsForThread)
  const createVisionVersionFn = useKanbanStore((s) => s.createVisionVersion)
  const restoreVisionVersionFn = useKanbanStore((s) => s.restoreVisionVersion)
  const allVisionVersions = useKanbanStore((s) => s.visionVersions)

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null
  const currentPhase: PlanningPhase = activeThread?.phase ?? 'discovery'
  const currentVisionDoc = activeThread?.visionDocument ?? null

  const versionsForThread = useMemo(
    () => (activeThreadId ? allVisionVersions.filter((v) => v.threadId === activeThreadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []),
    [allVisionVersions, activeThreadId],
  )

  // ─── Auto-create first thread if none exist ──────────────────────────────
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
          onError: () => {
            isCreatingThread.current = false
          },
        },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, threadsLoading, activeThreadId, initialProject.id])

  // ─── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ─── File upload handler ──────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    // Enforce max 5 files per batch
    const limited = files.slice(0, 5)
    const parsed = await Promise.all(limited.map(readFileAsText))
    setAttachedFiles((prev) => [...prev, ...parsed])
    e.target.value = ''
  }, [])

  // ─── Send a normal chat message ───────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (extras?: {
      batchSubmission?: QuestionBatchSubmission
      phaseTransitionConfirm?: { targetPhase: PlanningPhase; confirmed: boolean }
      visionDirectEdit?: { newContent: string; previousContent: string | null }
      contentOverride?: string
    }) => {
      if (!activeThreadId || sendMessage.isPending) return

      const content = extras?.contentOverride ?? input.trim()
      const fileBlock =
        attachedFiles.length > 0
          ? '\n\n' +
          attachedFiles.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n')
          : ''
      const fullContent = (content + fileBlock).trim()

      if (!fullContent && !extras?.batchSubmission && !extras?.phaseTransitionConfirm) return

      // Visible text fallback when submitting a batch (so the user message isn't empty)
      const visibleContent = fullContent.length > 0
        ? fullContent
        : extras?.batchSubmission
          ? summarizeBatch(extras.batchSubmission)
          : extras?.phaseTransitionConfirm
            ? extras.phaseTransitionConfirm.confirmed
              ? `👍 Let's move to "${PHASE_DISPLAY[extras.phaseTransitionConfirm.targetPhase].label}"`
              : 'Not yet — let\'s keep discussing.'
            : extras?.visionDirectEdit
              ? '📝 I edited the plan directly. See the updated version above.'
              : ''

      sendMessage.mutate(
        {
          threadId: activeThreadId,
          content: visibleContent,
          batchSubmission: extras?.batchSubmission ?? null,
          phaseTransitionConfirm: extras?.phaseTransitionConfirm ?? null,
          visionDirectEdit: extras?.visionDirectEdit ?? null,
        },
        {
          onError: (err) => {
            console.error('Send failed:', err)
          },
        },
      )
      setInput('')
      setAttachedFiles([])
    },
    [input, attachedFiles, activeThreadId, sendMessage],
  )

  // ─── Phase transition handlers ────────────────────────────────────────────
  const handleAcceptTransition = useCallback(
    (messageId: string, targetPhase: PlanningPhase) => {
      if (!activeThreadId) return
      setPhaseTransitionResponseFn(messageId, 'accepted')
      updateThreadFn(activeThreadId, { phase: targetPhase, whyProbesUsed: 0 })
      handleSendMessage({
        contentOverride: `Yes, let's move to "${PHASE_DISPLAY[targetPhase].label}".`,
        phaseTransitionConfirm: { targetPhase, confirmed: true },
      })
    },
    [activeThreadId, setPhaseTransitionResponseFn, updateThreadFn, handleSendMessage],
  )

  const handleRejectTransition = useCallback(
    (messageId: string) => {
      setPhaseTransitionResponseFn(messageId, 'rejected')
    },
    [setPhaseTransitionResponseFn],
  )

  // ─── Stepper jump ─────────────────────────────────────────────────────────
  const handleStepperJump = useCallback(
    (target: PlanningPhase) => {
      if (!activeThreadId) return
      const currentIdx = PHASE_ORDER.indexOf(currentPhase)
      const targetIdx = PHASE_ORDER.indexOf(target)
      const isForward = targetIdx > currentIdx
      const warning = isForward
        ? `Jump ahead to "${PHASE_DISPLAY[target].label}"? I'll use what I know so far — the plan may be rough.`
        : `Go back to "${PHASE_DISPLAY[target].label}"? Your current work is kept — you can resume anytime.`
      if (!window.confirm(warning)) return

      updateThreadFn(activeThreadId, { phase: target, whyProbesUsed: 0 })
      // Also inform the agent via a system-ish user message so the next turn
      // picks up in the new phase gracefully.
      handleSendMessage({
        contentOverride: isForward
          ? `Please skip ahead — I want to work on "${PHASE_DISPLAY[target].label}".`
          : `Let's revisit "${PHASE_DISPLAY[target].label}".`,
        phaseTransitionConfirm: { targetPhase: target, confirmed: true },
      })
    },
    [activeThreadId, currentPhase, updateThreadFn, handleSendMessage],
  )

  // ─── Task proposal approval ───────────────────────────────────────────────
  const handleApproveTask = useCallback(
    (messageId: string, proposal: StructuredTaskProposal) => {
      createTaskFn({
        projectId: initialProject.id,
        title: proposal.title,
        description: proposal.description ?? undefined,
        priority: proposal.priority,
      })
      setTaskProposalActionFn(messageId, proposal.id, 'approved')
    },
    [createTaskFn, setTaskProposalActionFn, initialProject.id],
  )

  const handleDismissTask = useCallback(
    (messageId: string, proposalId: string) => {
      setTaskProposalActionFn(messageId, proposalId, 'dismissed')
    },
    [setTaskProposalActionFn],
  )

  // ─── Batch question submission ────────────────────────────────────────────
  const handleBatchSubmit = useCallback(
    (submission: QuestionBatchSubmission) => {
      handleSendMessage({
        contentOverride: summarizeBatch(submission),
        batchSubmission: submission,
      })
    },
    [handleSendMessage],
  )

  // ─── Vision dual-mode editing ─────────────────────────────────────────────
  const handleVisionSaveEdit = useCallback(
    (newContent: string, previousContent: string | null) => {
      if (!activeThreadId) return
      // Persist the direct edit as a version first
      createVisionVersionFn({
        threadId: activeThreadId,
        content: newContent,
        createdBy: 'user',
        changeType: 'user_direct_edit',
        summary: 'You edited the plan directly',
        diffFromPrevious: diffSummary(previousContent, newContent),
        triggerMessage: null,
      })
      updateThreadFn(activeThreadId, { visionDocument: newContent })
      // Stash the edit so the next user chat turn includes the delta notice
      // for the agent (Tier 1.4).
      setPendingVisionEdit({ newContent, previousContent })
    },
    [activeThreadId, createVisionVersionFn, updateThreadFn],
  )

  const handleAskAiFocus = useCallback(() => {
    textareaRef.current?.focus()
    setInput((v) => v || 'Please revise the plan: ')
  }, [])

  const handleRestoreVersion = useCallback(
    (versionId: string) => {
      restoreVisionVersionFn(versionId)
    },
    [restoreVisionVersionFn],
  )

  // When a pending vision edit exists AND the user sends their next message,
  // attach the edit notice. We clear it after the send.
  const handleSendFromInput = useCallback(() => {
    if (pendingVisionEdit) {
      handleSendMessage({ visionDirectEdit: pendingVisionEdit })
      setPendingVisionEdit(null)
    } else {
      handleSendMessage()
    }
  }, [handleSendMessage, pendingVisionEdit])

  // ─── Thread management (unchanged from before, kept here for completeness) ─
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

  const phaseConfig = PHASE_DISPLAY[currentPhase]
  const PhaseIcon = ICON_MAP[phaseConfig.iconKey]
  const showWelcome = !messagesLoading && messages.length === 0

  const welcomeText = `👋 Hi — I'm here to help you plan **${initialProject.name}**.\n\nJust tell me about it in your own words — what you want to do, who it's for, any timeline in your head. I'll ask follow-ups in one go, draft a plan you can review or edit, then break it into concrete action items.\n\nWhat are you trying to do?`

  return (
    <div className="flex h-full w-full bg-[#f0f2f5] font-sans">
      {/* Left: Thread Sidebar */}
      <div
        className={`shrink-0 transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0'
          }`}
      >
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
        <header className="h-20 px-8 border-b border-gray-100 flex items-center justify-between gap-5 shrink-0 bg-white/70 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all text-gray-500 hover:text-black hover:shadow-sm active:scale-95"
                title="Back to Projects"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2.5 hover:bg-gray-100 rounded-2xl transition-all text-gray-500 hover:text-black hover:shadow-sm active:scale-95"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-sm text-[#0a192f] tracking-tight">
                {initialProject.name}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Planning Intelligence
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <PhaseStepper current={currentPhase} onJumpTo={handleStepperJump} />
          </div>

          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black ${phaseConfig.bg} ${phaseConfig.color} border ${phaseConfig.border} shadow-sm`}
          >
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span className="uppercase tracking-[0.15em]">{phaseConfig.label}</span>
          </div>
        </header>

        {/* Vision Document Panel (dual-mode) */}
        <VisionPanel
          content={currentVisionDoc}
          title={initialProject.name}
          versionCount={versionsForThread.length}
          onSaveEdit={handleVisionSaveEdit}
          onAskAiFocus={handleAskAiFocus}
          onOpenHistory={() => setHistoryDrawerOpen(true)}
        />

        {/* Vision history drawer */}
        <VisionHistoryDrawer
          open={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          versions={versionsForThread}
          currentContent={currentVisionDoc}
          onRestore={handleRestoreVersion}
        />

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
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[10px] font-black mr-4 shrink-0 mt-1 shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
                    AI
                  </div>
                  <div className="max-w-[90%] rounded-[2rem] rounded-bl-lg px-6 py-4 text-sm leading-relaxed bg-white border border-slate-100 text-[#0a192f] shadow-sm text-justify">
                    <div className="prose prose-slate max-w-none ai-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{welcomeText}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((msg: PlanningMessage) => (
                <MessageView
                  key={msg.id}
                  msg={msg}
                  currentPhase={currentPhase}
                  disabled={sendMessage.isPending}
                  onBatchSubmit={handleBatchSubmit}
                  onAcceptTransition={(target) => handleAcceptTransition(msg.id, target)}
                  onRejectTransition={() => handleRejectTransition(msg.id)}
                  onApproveTask={(p) => handleApproveTask(msg.id, p)}
                  onDismissTask={(pid) => handleDismissTask(msg.id, pid)}
                />
              ))}

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
          <div
            className={`mb-3 px-4 py-2.5 rounded-2xl text-[11px] font-black ${phaseConfig.bg} ${phaseConfig.color} flex items-center gap-2 shadow-sm border ${phaseConfig.border}`}
          >
            <PhaseIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="uppercase tracking-widest">{phaseConfig.tagline}</span>
          </div>
          {sendMessage.isError && (
            <div className="mb-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              Failed to send message. Please try again.
            </div>
          )}
          {pendingVisionEdit && (
            <div className="mb-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              Your plan edits will be sent with your next message so the AI knows about them.
            </div>
          )}
          {attachedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachedFiles.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${f.kind === 'unsupported'
                      ? 'bg-amber-50 border border-amber-200 text-amber-700'
                      : 'bg-blue-50 border border-blue-200 text-blue-700'
                    }`}
                >
                  <FileText className="w-3 h-3 shrink-0" />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    onClick={() =>
                      setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="ml-0.5 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-4 items-end bg-white border border-gray-100 rounded-[2.5rem] px-6 py-5 shadow-2xl shadow-gray-200/60 transition-all focus-within:shadow-blue-500/10 focus-within:border-blue-200">
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
              className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-gray-300 resize-none outline-none min-h-[24px] max-h-[450px] overflow-y-auto transition-[height] duration-75"
              placeholder={
                currentPhase === 'discovery'
                  ? 'Tell me about your project…'
                  : currentPhase === 'blueprint'
                    ? 'Ask me to revise the plan, or edit it directly above…'
                    : 'Describe your next task or ask a question…'
              }
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleSendFromInput()
                }
              }}
              disabled={!activeThreadId}
            />
            <button
              onClick={handleSendFromInput}
              disabled={
                (!input.trim() && attachedFiles.length === 0 && !pendingVisionEdit)
                || sendMessage.isPending
                || !activeThreadId
              }
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
          messages={[]}
          phase={currentPhase}
        />
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MessageViewProps {
  msg: PlanningMessage
  currentPhase: PlanningPhase
  disabled: boolean
  onBatchSubmit: (submission: QuestionBatchSubmission) => void
  onAcceptTransition: (target: PlanningPhase) => void
  onRejectTransition: () => void
  onApproveTask: (proposal: StructuredTaskProposal) => void
  onDismissTask: (proposalId: string) => void
}

function MessageView({
  msg,
  currentPhase,
  disabled,
  onBatchSubmit,
  onAcceptTransition,
  onRejectTransition,
  onApproveTask,
  onDismissTask,
}: MessageViewProps) {
  const isUser = msg.role === 'user'
  const envelope = msg.envelope ?? null
  const hasQuestions = envelope?.questions && envelope.questions.length > 0
  const hasTasks = envelope?.tasks && envelope.tasks.length > 0
  const hasTransition =
    envelope?.readyForNextPhase && envelope.suggestedPhase != null && envelope.suggestedPhase !== currentPhase
  const userJump =
    envelope?.detectedUserIntent === 'jump_phase' && envelope.targetPhase != null && envelope.targetPhase !== currentPhase

  const batchSubmission = msg.batchSubmission ?? null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-black mr-4 shrink-0 mt-1 shadow-lg shadow-blue-500/30">
          AI
        </div>
      )}
      <div
        className={`max-w-[90%] rounded-[2rem] px-6 py-4 text-sm leading-relaxed shadow-sm text-justify transition-all hover:shadow-md ${isUser
            ? 'bg-gradient-to-br from-[#0a192f] to-[#1e293b] text-white rounded-br-lg whitespace-pre-wrap shadow-blue-900/10'
            : 'bg-white border border-slate-100 text-[#0a192f] rounded-bl-lg'
          }`}
      >
        {isUser ? (
          msg.content
        ) : (
          <>
            <div className="prose prose-slate max-w-none ai-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '…'}</ReactMarkdown>
            </div>

            {hasQuestions && (
              <BatchQuestionCard
                questions={envelope!.questions!}
                previousSubmission={findSubmissionForQuestions(msg, envelope!.questions!, batchSubmission)}
                onSubmit={onBatchSubmit}
                disabled={disabled}
              />
            )}

            {hasTasks && (
              <div className="mt-3 space-y-2">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Proposed tasks
                </div>
                {envelope!.tasks!.map((task) => {
                  const status =
                    msg.taskProposalActions?.find((a) => a.taskId === task.id)?.action ?? 'pending'
                  return (
                    <TaskProposalCard
                      key={task.id}
                      task={task}
                      status={status as 'pending' | 'approved' | 'dismissed'}
                      onApprove={() => onApproveTask(task)}
                      onDismiss={() => onDismissTask(task.id)}
                      disabled={disabled}
                    />
                  )
                })}
              </div>
            )}

            {(hasTransition || userJump) && envelope && (
              <PhaseTransitionCard
                suggestedPhase={(envelope.suggestedPhase ?? envelope.targetPhase!) as PlanningPhase}
                currentPhase={currentPhase}
                reason={envelope.reasonForTransition}
                response={msg.phaseTransitionResponse ?? null}
                isUserJump={userJump}
                isBackward={
                  PHASE_ORDER.indexOf((envelope.suggestedPhase ?? envelope.targetPhase)!) <
                  PHASE_ORDER.indexOf(currentPhase)
                }
                onAccept={() =>
                  onAcceptTransition((envelope.suggestedPhase ?? envelope.targetPhase)!)
                }
                onReject={onRejectTransition}
                disabled={disabled}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Helper — the submission might be recorded on a LATER user message, but for
// simplicity the card just shows its own prior submission if the agent echoed
// it back in the same envelope. Otherwise returns null (editable).
function findSubmissionForQuestions(
  _msg: PlanningMessage,
  _questions: NonNullable<PlanningMessage['envelope']>['questions'],
  candidate: QuestionBatchSubmission | null,
): QuestionBatchSubmission | null {
  return candidate
}

function summarizeBatch(submission: QuestionBatchSubmission): string {
  const lines = submission.questions.map((q) => {
    const ans = submission.answers.find((a) => a.questionId === q.id)
    if (!ans || ans.skipped) return `• ${q.text} — _skipped_`
    return `• ${q.text} → **${ans.answer ?? ''}**`
  })
  return `Here are my answers:\n\n${lines.join('\n')}`
}

function diffSummary(previous: string | null, next: string): string[] | null {
  if (!previous) return ['Initial version']
  const prevSections = extractSections(previous)
  const nextSections = extractSections(next)
  const changes: string[] = []
  for (const [header, content] of Object.entries(nextSections)) {
    if (!(header in prevSections)) {
      changes.push(`Added: ${header}`)
    } else if (prevSections[header] !== content) {
      changes.push(`Updated: ${header}`)
    }
  }
  for (const header of Object.keys(prevSections)) {
    if (!(header in nextSections)) changes.push(`Removed: ${header}`)
  }
  if (changes.length === 0) changes.push('Minor text edits')
  return changes
}

function extractSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let currentHeader = 'Preamble'
  let buffer: string[] = []
  const flush = () => {
    if (buffer.length > 0) sections[currentHeader] = buffer.join('\n').trim()
  }
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,3})\s+(.+)$/.exec(line)
    if (match) {
      flush()
      currentHeader = match[2].trim()
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  flush()
  return sections
}

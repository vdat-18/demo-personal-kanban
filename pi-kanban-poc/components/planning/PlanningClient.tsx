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
import { ImportedSourcesPanel } from '@/components/molecules/ImportedSourcesPanel'
import { PlanningTimelinePanel } from '@/components/molecules/PlanningTimelinePanel'
import { ContextDrawer } from '@/components/molecules/ContextDrawer'
import { StatusPanel } from '@/components/molecules/StatusPanel'
import { WorkflowNotesPanel } from '@/components/molecules/WorkflowNotesPanel'
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
  ImportedSource,
  PlaybookId,
} from '@/types/domain'
import { getPlaybook } from '@/lib/planning/playbooks'

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
  playbookId?: PlaybookId
  workflowContract?: import('@/types/domain').WorkflowContract
  workpad?: import('@/types/domain').WorkpadEntry | null
  runtimeStatus?: import('@/types/domain').RuntimeStatus | null
  importedSources?: ImportedSource[]
  userContext?: string | null
  tasks: Task[]
}

const ICON_MAP = {
  lightbulb: Lightbulb,
  'clipboard-check': ClipboardCheck,
  'list-checks': ListChecks,
} as const

// ── File helpers (Tier 3.12 lightweight intake) ──────────────────────────────

interface AttachedFile {
  name: string
  content: string
  kind: 'text' | 'image' | 'unsupported'
  /** Populated for image files — forwarded to the vision API. */
  imageData?: { mimeType: string; base64: string }
}

/**
 * Thin adapter over the shared ingestion pipeline (lib/fileIngest.ts).
 *
 * Supports: PDF, DOCX, DOC, XLSX, CSV, plain text, images (base64 → vision).
 */
async function readFileAsText(file: File): Promise<AttachedFile> {
  const { ingestFile } = await import('@/lib/fileIngest')
  const ingested = await ingestFile(file)
  if (ingested.error) {
    return { name: ingested.filename, content: `(Failed to read: ${ingested.error})`, kind: 'unsupported' }
  }
  if (ingested.kind === 'image' && ingested.imageData) {
    return {
      name: ingested.filename,
      content: `[Image: ${ingested.filename}]`,
      kind: 'image',
      imageData: ingested.imageData,
    }
  }
  return {
    name: ingested.filename,
    content: ingested.text || `(${ingested.summary ?? 'Empty file'})`,
    kind: 'text',
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function PlanningClient({ project: initialProject }: { project: Project }) {
  const router = useRouter()
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [activeContextTab, setActiveContextTab] = useState<'status' | 'sources' | 'workflow-notes' | 'timeline' | null>(null)
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
  const deleteTaskFn = useKanbanStore((s) => s.deleteTask)
  const updateThreadFn = useKanbanStore((s) => s.updatePlanningThread)
  const setPhaseTransitionResponseFn = useKanbanStore((s) => s.setPhaseTransitionResponse)
  const setTaskProposalActionFn = useKanbanStore((s) => s.setTaskProposalAction)
  const clearTaskProposalActionFn = useKanbanStore((s) => s.clearTaskProposalAction)
  const getVisionVersionsForThread = useKanbanStore((s) => s.getVisionVersionsForThread)
  const createVisionVersionFn = useKanbanStore((s) => s.createVisionVersion)
  const restoreVisionVersionFn = useKanbanStore((s) => s.restoreVisionVersion)
  const publishVisionVersionFn = useKanbanStore((s) => s.publishVisionVersion)
  const allVisionVersions = useKanbanStore((s) => s.visionVersions)
  const allPlanningEvents = useKanbanStore((s) => s.planningEvents)
  const logPlanningEvent = useKanbanStore((s) => s.logPlanningEvent)
  const allAttentionItems = useKanbanStore((s) => s.attentionItems)
  const createAttentionItem = useKanbanStore((s) => s.createAttentionItem)
  const resolveAttentionItem = useKanbanStore((s) => s.resolveAttentionItem)
  const updateImportedSource = useKanbanStore((s) => s.updateImportedSource)

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null
  const currentPhase: PlanningPhase = activeThread?.phase ?? 'discovery'
  const currentVisionDoc = activeThread?.visionDocument ?? null
  const playbook = getPlaybook(initialProject.playbookId)
  const importedSources = initialProject.importedSources ?? []
  const workflowContract = initialProject.workflowContract ?? playbook.workflowContract
  const planningEvents = useMemo(
    () =>
      allPlanningEvents
        .filter((event) => event.projectId === initialProject.id && (activeThreadId == null || event.threadId === activeThreadId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allPlanningEvents, initialProject.id, activeThreadId],
  )
  const attentionItems = useMemo(
    () =>
      allAttentionItems
        .filter((item) => item.projectId === initialProject.id && item.status === 'open')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allAttentionItems, initialProject.id],
  )
  const latestPlanningEvent = planningEvents[0] ?? null
  const pendingTaskApprovals = useMemo(
    () =>
      messages.reduce((count, msg) => {
        const proposals = msg.envelope?.tasks ?? []
        const actions = msg.taskProposalActions ?? []
        return count + proposals.filter((proposal) => !actions.find((action) => action.taskId === proposal.id)).length
      }, 0),
    [messages],
  )

  const versionsForThread = useMemo(
    () => (activeThreadId ? allVisionVersions.filter((v) => v.threadId === activeThreadId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []),
    [allVisionVersions, activeThreadId],
  )

  // Stale-publish detection (#1): there is a currently-published version
  // AND a newer draft has been created after it. The banner prompts the
  // user to publish the newer plan instead of leaving the team on a
  // stale snapshot.
  const publishedVersion = useMemo(
    () => versionsForThread.find((v) => v.status === 'published' && !v.supersededAt) ?? null,
    [versionsForThread],
  )
  const latestVersion = versionsForThread[0] ?? null
  const publishedIsStale = !!(
    publishedVersion &&
    latestVersion &&
    latestVersion.id !== publishedVersion.id &&
    new Date(latestVersion.createdAt).getTime() > new Date(publishedVersion.publishedAt ?? publishedVersion.createdAt).getTime()
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
      const textFiles = attachedFiles.filter((f) => f.kind !== 'image')
      const imageFiles = attachedFiles.filter((f) => f.kind === 'image' && f.imageData)
      const fileBlock =
        textFiles.length > 0
          ? '\n\n' +
          textFiles.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n')
          : ''
      // Image placeholders inline so the user message shows what was attached
      const imageBlock =
        imageFiles.length > 0
          ? '\n\n' + imageFiles.map((f) => `[Image attached: ${f.name}]`).join('\n')
          : ''
      const fullContent = (content + fileBlock + imageBlock).trim()

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
          imageFiles: imageFiles.map((f) => f.imageData!),
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

  useEffect(() => {
    if (!activeThreadId) return
    const hasSourceReviewNeed = importedSources.some((source) => source.status === 'needs_review')
    if (hasSourceReviewNeed && !attentionItems.some((item) => item.type === 'source_needs_review')) {
      createAttentionItem({
        projectId: initialProject.id,
        threadId: activeThreadId,
        type: 'source_needs_review',
        title: 'Some imported sources need review',
        detail: 'At least one uploaded source had low extraction quality or needs manual checking.',
      })
    }
  }, [activeThreadId, importedSources, attentionItems, createAttentionItem, initialProject.id])

  useEffect(() => {
    if (!activeThreadId) return
    const unresolved = attentionItems.find((item) => item.type === 'task_approval_pending')
    if (pendingTaskApprovals > 0 && !unresolved) {
      createAttentionItem({
        projectId: initialProject.id,
        threadId: activeThreadId,
        type: 'task_approval_pending',
        title: 'Task proposals are waiting for approval',
        detail: `${pendingTaskApprovals} proposed task${pendingTaskApprovals === 1 ? '' : 's'} still need your decision before execution starts.`,
      })
    }
    if (pendingTaskApprovals === 0) {
      attentionItems
        .filter((item) => item.type === 'task_approval_pending')
        .forEach((item) => resolveAttentionItem(item.id))
    }
  }, [activeThreadId, pendingTaskApprovals, attentionItems, createAttentionItem, resolveAttentionItem, initialProject.id])

  useEffect(() => {
    if (!activeThreadId) return
    const hasPublished = versionsForThread.some((version) => version.status === 'published' && !version.supersededAt)
    const openPlanAttention = attentionItems.find((item) => item.type === 'plan_unpublished')
    if (!hasPublished && currentVisionDoc?.trim() && !openPlanAttention) {
      createAttentionItem({
        projectId: initialProject.id,
        threadId: activeThreadId,
        type: 'plan_unpublished',
        title: 'The current plan is still unpublished',
        detail: 'Publish a stable plan version once the draft is ready so the project has a clear canonical plan.',
      })
    }
    if (hasPublished) {
      attentionItems
        .filter((item) => item.type === 'plan_unpublished')
        .forEach((item) => resolveAttentionItem(item.id))
    }
  }, [activeThreadId, versionsForThread, currentVisionDoc, attentionItems, createAttentionItem, resolveAttentionItem, initialProject.id])

  // ─── Phase transition handlers ────────────────────────────────────────────
  const handleAcceptTransition = useCallback(
    (messageId: string, targetPhase: PlanningPhase) => {
      if (!activeThreadId) return
      setPhaseTransitionResponseFn(messageId, 'accepted')
      updateThreadFn(activeThreadId, { phase: targetPhase, whyProbesUsed: 0 })
      logPlanningEvent({
        projectId: initialProject.id,
        threadId: activeThreadId,
        type: 'phase_transition_accepted',
        actor: 'user',
        summary: `Moved planning to ${PHASE_DISPLAY[targetPhase].label}.`,
      })
      handleSendMessage({
        contentOverride: `Yes, let's move to "${PHASE_DISPLAY[targetPhase].label}".`,
        phaseTransitionConfirm: { targetPhase, confirmed: true },
      })
    },
    [activeThreadId, setPhaseTransitionResponseFn, updateThreadFn, handleSendMessage, logPlanningEvent, initialProject.id],
  )

  const handleRejectTransition = useCallback(
    (messageId: string) => {
      setPhaseTransitionResponseFn(messageId, 'rejected')
      if (activeThreadId) {
        logPlanningEvent({
          projectId: initialProject.id,
          threadId: activeThreadId,
          type: 'phase_transition_rejected',
          actor: 'user',
          summary: 'Kept the planning conversation in the current phase.',
        })
      }
    },
    [setPhaseTransitionResponseFn, activeThreadId, logPlanningEvent, initialProject.id],
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
      const created = createTaskFn({
        projectId: initialProject.id,
        title: proposal.title,
        description: proposal.description ?? undefined,
        priority: proposal.priority,
        // Record the back-reference so Kanban can offer "Undo approval"
        // later — deleting the task AND flipping the chat proposal back
        // to pending.
        sourceProposal: { messageId, proposalId: proposal.id },
      })
      setTaskProposalActionFn(messageId, proposal.id, 'approved', created.id)
      if (activeThreadId) {
        logPlanningEvent({
          projectId: initialProject.id,
          threadId: activeThreadId,
          type: 'task_approved',
          actor: 'user',
          summary: `Approved task proposal: ${proposal.title}.`,
        })
      }
    },
    [createTaskFn, setTaskProposalActionFn, initialProject.id, activeThreadId, logPlanningEvent],
  )

  const handleDismissTask = useCallback(
    (messageId: string, proposalId: string) => {
      setTaskProposalActionFn(messageId, proposalId, 'dismissed')
      if (activeThreadId) {
        logPlanningEvent({
          projectId: initialProject.id,
          threadId: activeThreadId,
          type: 'task_dismissed',
          actor: 'user',
          summary: 'Dismissed a proposed task.',
          metadata: { proposalId },
        })
      }
    },
    [setTaskProposalActionFn, activeThreadId, logPlanningEvent, initialProject.id],
  )

  /** Revert a previously approved/dismissed proposal back to pending. If the
   *  user had approved it we also roll back the created Task so the Kanban
   *  doesn't keep a task the user is now undoing. */
  const handleResetTask = useCallback(
    (messageId: string, proposalId: string, previousAction: 'approved' | 'dismissed', createdTaskId?: string) => {
      if (previousAction === 'approved' && createdTaskId) {
        deleteTaskFn(createdTaskId)
      }
      clearTaskProposalActionFn(messageId, proposalId)
    },
    [deleteTaskFn, clearTaskProposalActionFn],
  )

  /** Approve every proposal in a message envelope that is still pending.
   *  Keeps existing approved/dismissed decisions intact. */
  const handleApproveAllInMessage = useCallback(
    (msg: PlanningMessage) => {
      if (!msg.envelope?.tasks) return
      const decisions = msg.taskProposalActions ?? []
      msg.envelope.tasks.forEach((proposal) => {
        const existing = decisions.find((d) => d.taskId === proposal.id)
        if (!existing) {
          handleApproveTask(msg.id, proposal)
        }
      })
    },
    [handleApproveTask],
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

  /**
   * Resubmit a batch the user already answered. We don't try to mutate the
   * original message (history-rewriting confuses both the AI and the human).
   * Instead we post a NEW user message tagged "Updated my earlier answers"
   * and re-run the agent. The new envelope gets back-fitted into the chat
   * history naturally.
   */
  const handleResubmitBatch = useCallback(
    (submission: QuestionBatchSubmission) => {
      const lines = submission.questions.map((q) => {
        const ans = submission.answers.find((a) => a.questionId === q.id)
        if (!ans || ans.skipped) return `• ${q.text} — _skipped_`
        return `• ${q.text} → **${ans.answer ?? ''}**`
      })
      const content =
        `🔁 I'd like to revise my earlier answers. Please use these UPDATED values from now on:\n\n${lines.join(
          '\n',
        )}`
      handleSendMessage({
        contentOverride: content,
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

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [taskWidth, setTaskWidth] = useState(420)

  const startResize = useCallback(
    (panel: 'sidebar' | 'task', e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = panel === 'sidebar' ? sidebarWidth : taskWidth

      const onMove = (ev: MouseEvent) => {
        if (panel === 'sidebar') {
          const next = Math.max(180, Math.min(480, startWidth + ev.clientX - startX))
          setSidebarWidth(next)
        } else {
          const next = Math.max(280, Math.min(640, startWidth - (ev.clientX - startX)))
          setTaskWidth(next)
        }
      }
      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [sidebarWidth, taskWidth],
  )

  return (
    <div className="flex h-full w-full bg-[radial-gradient(circle_at_top,#fbfdff_0%,#f4f7fb_45%,#eef3f8_100%)] font-sans">
      {/* Left: Thread Sidebar */}
      <div
        className={`shrink-0 overflow-hidden ${isSidebarOpen ? '' : 'w-0'}`}
        style={isSidebarOpen ? { width: sidebarWidth } : undefined}
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

      {/* Sidebar resize handle */}
      {isSidebarOpen && (
        <div
          onMouseDown={(e) => startResize('sidebar', e)}
          className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400 bg-transparent transition-colors duration-150 group relative"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 -left-0.5 -right-0.5" />
        </div>
      )}

      {/* Center: Chat Panel */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-slate-200/60 bg-white">
          {/* Header */}
          <header className="shrink-0 bg-white/95 backdrop-blur-xl sticky top-0 z-10 border-b border-slate-100/80 shadow-[0_2px_12px_rgba(15,23,42,0.04)]">
            {/* Row 1: nav + project info */}
            <div className="h-14 px-5 flex items-center gap-3">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => router.push('/')}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900 active:scale-95"
                  title="Back to Projects"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900 active:scale-95"
                    title="Expand Sidebar"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="w-px h-5 bg-slate-200 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <h1 className="font-bold text-[15px] text-slate-900 truncate leading-none">{initialProject.name}</h1>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">{playbook.label}</span>
                </div>
              </div>
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
            publishedIsStale={publishedIsStale}
            onPublishLatest={
              latestVersion ? () => publishVisionVersionFn(latestVersion.id) : undefined
            }
            centerContent={<PhaseStepper current={currentPhase} onJumpTo={handleStepperJump} compact />}
            panelActions={
              <>
                {(
                  [
                    { key: 'status' as const, label: 'Status', badge: attentionItems.length > 0 ? attentionItems.length : undefined },
                    { key: 'sources' as const, label: 'Sources', badge: importedSources.length > 0 ? importedSources.length : undefined },
                    { key: 'workflow-notes' as const, label: 'Workflow Notes', badge: (initialProject.workpad?.blockers.length ?? 0) > 0 ? initialProject.workpad?.blockers.length : undefined },
                    { key: 'timeline' as const, label: 'Timeline', badge: undefined as number | undefined },
                  ]
                ).map(({ key, label, badge }) => (
                  <button
                    key={key}
                    onClick={() => setActiveContextTab((prev) => (prev === key ? null : key))}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors px-1 py-0.5 rounded ${
                      activeContextTab === key
                        ? 'text-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {label}
                    {badge !== undefined && (
                      <span className={`text-[9px] font-black px-1 rounded-full ${activeContextTab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {badge}
                      </span>
                    )}
                  </button>
                ))}
              </>
            }
          />

          {/* Context drawer — slides in from the right like History */}
          <ContextDrawer
            open={activeContextTab !== null}
            onClose={() => setActiveContextTab(null)}
            title={
              activeContextTab === 'status' ? 'Status'
              : activeContextTab === 'sources' ? 'Imported Sources'
              : activeContextTab === 'workflow-notes' ? 'Workflow Notes'
              : activeContextTab === 'timeline' ? 'Planning Timeline'
              : ''
            }
          >
            {activeContextTab === 'status' && (
              <StatusPanel
                phase={currentPhase}
                latestEvent={latestPlanningEvent}
                pendingApprovals={pendingTaskApprovals}
                attentionItems={attentionItems}
                runtimeStatus={initialProject.runtimeStatus}
                userContext={initialProject.userContext}
                onResolveAttention={resolveAttentionItem}
              />
            )}
            {activeContextTab === 'sources' && (
              <ImportedSourcesPanel
                sources={importedSources}
                onUpdateSource={(sourceId, patch) => updateImportedSource(initialProject.id, sourceId, patch)}
              />
            )}
            {activeContextTab === 'workflow-notes' && (
              <WorkflowNotesPanel
                contract={workflowContract}
                workpad={initialProject.workpad}
                onUpdateWorkpad={(patch) => {
                  if (!initialProject.workpad) return
                  useKanbanStore.getState().updateProject(initialProject.id, {
                    workpad: { ...initialProject.workpad, ...patch },
                  })
                }}
              />
            )}
            {activeContextTab === 'timeline' && <PlanningTimelinePanel events={planningEvents} />}
          </ContextDrawer>

          {/* Vision history drawer */}
          <VisionHistoryDrawer
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            versions={versionsForThread}
            currentContent={currentVisionDoc}
            onRestore={handleRestoreVersion}
            onPublish={(versionId) => {
              publishVisionVersionFn(versionId)
            }}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-7 space-y-5 bg-[linear-gradient(160deg,#f8fafc_0%,#f3f7fb_60%,#eef2f8_100%)]">
            {messagesLoading ? (
              <div className="flex justify-center py-12">
                <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {showWelcome && (
                  <div className="flex justify-start items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-1 shadow-md shadow-indigo-500/25">
                      AI
                    </div>
                    <div className="max-w-[82%] rounded-2xl rounded-bl-sm px-5 py-3.5 text-[14px] leading-[1.65] bg-white border border-slate-100/80 text-slate-800 shadow-[0_4px_16px_rgba(15,23,42,0.06)] border-l-2 border-l-indigo-200">
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
                    onResubmitBatch={handleResubmitBatch}
                    onAcceptTransition={(target) => handleAcceptTransition(msg.id, target)}
                    onRejectTransition={() => handleRejectTransition(msg.id)}
                    onApproveTask={(p) => handleApproveTask(msg.id, p)}
                    onDismissTask={(pid) => handleDismissTask(msg.id, pid)}
                    onResetTask={(pid, prevAction, createdId) =>
                      handleResetTask(msg.id, pid, prevAction, createdId)
                    }
                    onApproveAll={() => handleApproveAllInMessage(msg)}
                  />
                ))}

                {sendMessage.isPending && (
                  <div className="flex justify-start items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-[10px] font-black shrink-0 mt-1 shadow-md shadow-indigo-500/25">
                      AI
                    </div>
                    <div className="bg-white border border-slate-100/80 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] border-l-2 border-l-indigo-200">
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
          <div className="px-6 pb-6 pt-2 bg-[linear-gradient(180deg,rgba(243,247,251,0)_0%,rgba(243,247,251,0.95)_20%,#f3f7fb_100%)]">
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
            <div className="flex gap-3 items-end bg-white border border-slate-200/80 rounded-[1.75rem] px-4 py-3 shadow-[0_8px_32px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)] transition-all focus-within:shadow-[0_8px_32px_rgba(99,102,241,0.12),0_2px_8px_rgba(99,102,241,0.06)] focus-within:border-indigo-200/80">
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
                className="w-8 h-8 rounded-xl text-slate-400 flex items-center justify-center hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-30 shrink-0"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-sm text-[#0a192f] placeholder:text-slate-400 resize-none outline-none min-h-[24px] max-h-[450px] overflow-y-auto transition-[height] duration-75 leading-6"
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
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-30 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      {/* Task panel resize handle */}
      <div
        onMouseDown={(e) => startResize('task', e)}
        className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-400 bg-transparent transition-colors duration-150"
        title="Drag to resize"
      />

      {/* Right: Tasks Panel */}
      <div className="shrink-0" style={{ width: taskWidth }}>
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
  onResubmitBatch: (submission: QuestionBatchSubmission) => void
  onAcceptTransition: (target: PlanningPhase) => void
  onRejectTransition: () => void
  onApproveTask: (proposal: StructuredTaskProposal) => void
  onDismissTask: (proposalId: string) => void
  onResetTask: (proposalId: string, previousAction: 'approved' | 'dismissed', createdTaskId?: string) => void
  onApproveAll: () => void
}

function MessageView({
  msg,
  currentPhase,
  disabled,
  onBatchSubmit,
  onResubmitBatch,
  onAcceptTransition,
  onRejectTransition,
  onApproveTask,
  onDismissTask,
  onResetTask,
  onApproveAll,
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-[10px] font-black shrink-0 mb-1 shadow-md shadow-indigo-500/25">
          AI
        </div>
      )}
        <div
          className={`rounded-2xl px-5 py-3.5 text-[14px] leading-[1.65] transition-all ${isUser
            ? 'max-w-[68%] bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-sm whitespace-pre-wrap shadow-[0_8px_24px_rgba(99,102,241,0.2)]'
            : 'max-w-[82%] bg-white border border-slate-100/80 text-slate-800 rounded-bl-sm shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)] border-l-2 border-l-indigo-200'
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
                onResubmit={onResubmitBatch}
                disabled={disabled}
              />
            )}

            {hasTasks && (
              <div className="mt-4 space-y-3">
                {(() => {
                  const proposals = envelope!.tasks!
                  const decisions = msg.taskProposalActions ?? []
                  const pendingCount = proposals.filter(
                    (p) => !decisions.find((d) => d.taskId === p.id),
                  ).length
                  const approvedCount = decisions.filter((d) => d.action === 'approved').length
                  return (
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                        Proposed tasks · {approvedCount}/{proposals.length} approved
                      </div>
                      {pendingCount > 0 && (
                        <button
                          onClick={onApproveAll}
                          disabled={disabled}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-40 active:scale-95"
                        >
                          ✓ Approve all ({pendingCount})
                        </button>
                      )}
                    </div>
                  )
                })()}
                {envelope!.tasks!.map((task) => {
                  const decision = msg.taskProposalActions?.find((a) => a.taskId === task.id)
                  const status = (decision?.action ?? 'pending') as 'pending' | 'approved' | 'dismissed'
                  return (
                    <TaskProposalCard
                      key={task.id}
                      task={task}
                      status={status}
                      onApprove={() => onApproveTask(task)}
                      onDismiss={() => onDismissTask(task.id)}
                      onReset={
                        decision
                          ? () => onResetTask(task.id, decision.action, decision.createdTaskId)
                          : undefined
                      }
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

function PanelToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors border ${
        active
          ? 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
          : 'text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-white'
      }`}
    >
      {active ? `Hide ${label}` : `Show ${label}`}
    </button>
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

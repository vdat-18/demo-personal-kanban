/**
 * Hooks for Planning Messages, backed by localStorage store.
 *
 * Send flow (Tier 2.8 + 3.9):
 *   1. Persist user message locally with optional batchSubmission metadata.
 *   2. POST /api/agent with full history + threadId (for session cache reuse),
 *      phase, visionDocument, whyProbesUsed, and any "user phase jump" signal.
 *   3. Receive { envelope, tokenUsage } — persist assistant message WITH the
 *      envelope attached so the UI can render questions, phase transitions,
 *      and task proposals directly from the stored message.
 *   4. Update thread phase / visionDocument based on structured fields, not
 *      regex. Create a VisionVersion if vision changed.
 */
'use client'

import { useCallback, useMemo, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { getPlaybook } from '@/lib/planning/playbooks'
import type {
  PlanningMessage as StoreMessage,
  MutationActionState,
  AgentEnvelope,
  QuestionBatchSubmission,
  PlanningPhase,
} from '@/types/domain'

export type { MutationActionState }
export type PlanningMessage = StoreMessage

export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'FetchError'
    this.status = status
  }
}

export function usePlanningMessages(threadId: string | null) {
  const messages = useKanbanStore((s) => s.planningMessages)
  const data = useMemo(
    () =>
      threadId
        ? messages
            .filter((m) => m.threadId === threadId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [messages, threadId],
  )
  return {
    data,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null as Error | null,
  }
}

// ─── Send message (user) ─────────────────────────────────────────────────────

export interface SendMessageInput {
  threadId: string
  content: string
  /** Force the first imported turn into a readback-only mode: summarize files,
   *  do not propose tasks yet. */
  importReadbackOnly?: boolean
  /** When the user is submitting an answer to a question batch card (Tier 1.2). */
  batchSubmission?: QuestionBatchSubmission | null
  /** When the user clicked "Yes / Not yet" on a phase-transition card (Tier 2.5). */
  phaseTransitionConfirm?: {
    targetPhase: PlanningPhase
    confirmed: boolean
  } | null
  /** When the user just saved a direct edit on the vision document (Tier 1.4). */
  visionDirectEdit?: {
    newContent: string
    previousContent: string | null
  } | null
  /** Base64-encoded images to send to the vision API (Tier 3.12). */
  imageFiles?: Array<{ mimeType: string; base64: string }>
}

export interface SendResult {
  userMessage: StoreMessage
  assistantMessage: StoreMessage
  envelope: AgentEnvelope
  tokenUsage: { input: number; output: number } | null
}

export function useSendPlanningMessage() {
  const createMessage = useKanbanStore((s) => s.createPlanningMessage)
  const updateThread = useKanbanStore((s) => s.updatePlanningThread)
  const createVisionVersion = useKanbanStore((s) => s.createVisionVersion)
  const logPlanningEvent = useKanbanStore((s) => s.logPlanningEvent)

  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)

  const mutateAsync = useCallback(
    async (input: SendMessageInput): Promise<SendResult> => {
      const { threadId, content, batchSubmission, phaseTransitionConfirm, visionDirectEdit, imageFiles } = input
      const store = useKanbanStore.getState()
      const thread = store.planningThreads.find((t) => t.id === threadId)
      if (!thread) throw new FetchError('Thread not found', 404)
      const project = store.projects.find((p) => p.id === thread.projectId) ?? null

      setIsPending(true)
      setIsError(false)
      try {
        const isImportedFirstTurn = input.importReadbackOnly === true
        // 1) Persist user message immediately
        const userMessage = createMessage({
          threadId,
          role: 'user',
          content,
          batchSubmission: batchSubmission ?? null,
        })

        // 2) Build chat history for the agent (user + assistant turns only)
        const history = store.planningMessages
          .filter((m) => m.threadId === threadId && m.role !== 'system')
          .concat(userMessage)
          .map((m) => ({ role: m.role, content: m.content }))

        const playbook = getPlaybook(project?.playbookId)
        const importedSources = project?.importedSources ?? []
        const personalAIContext = store.personalAIContext
        const sourceContext = importedSources.length > 0
          ? importedSources.map((source) => ({
              title: source.title,
              summary: source.summary,
              status: source.status,
              extractedText: source.extractedText ? source.extractedText.slice(0, 1500) : null,
            }))
          : null

        logPlanningEvent({
          projectId: thread.projectId,
          threadId,
          type: 'message_sent',
          actor: 'user',
          summary: isImportedFirstTurn
            ? 'Started planning from imported sources.'
            : 'Sent a planning message.',
        })

        // 3) Call the unified agent endpoint with full context
        const res = await fetch('/api/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'plan',
            threadId,
            phase: thread.phase,
            visionDocument: thread.visionDocument,
            projectName: project?.name,
            projectDescription: project?.description,
            playbook,
            importedSources: sourceContext,
            personalAIContext,
            whyProbesUsed: thread.whyProbesUsed ?? 0,
            importReadbackOnly: isImportedFirstTurn,
            userPhaseRequest: phaseTransitionConfirm
              ? { targetPhase: phaseTransitionConfirm.targetPhase, confirmed: phaseTransitionConfirm.confirmed }
              : null,
            visionDirectEdit: visionDirectEdit ?? null,
            messages: history,
            imageFiles: imageFiles && imageFiles.length > 0 ? imageFiles : undefined,
          }),
        })
        if (!res.ok) {
          throw new FetchError(`Agent request failed (${res.status})`, res.status)
        }
        const data = (await res.json()) as {
          envelope: AgentEnvelope
          tokenUsage: { input: number; output: number } | null
        }

        // 4) Persist assistant message WITH envelope
        const assistantMessage = createMessage({
          threadId,
          role: 'assistant',
          content: data.envelope.content,
          tokenUsage: data.tokenUsage ?? null,
          envelope: data.envelope,
        })

        // 5) Apply structured side-effects to the thread
        const patch: Parameters<typeof updateThread>[1] = {}

        // Vision update → create a version, update thread doc
        if (data.envelope.visionDocument != null) {
          const prevContent = thread.visionDocument
          const changeType = prevContent == null ? 'initial' : 'ai_draft'
          createVisionVersion({
            threadId,
            content: data.envelope.visionDocument,
            createdBy: 'ai',
            changeType,
            summary: data.envelope.reasonForTransition ?? null,
            diffFromPrevious: data.envelope.visionChanges,
            triggerMessage: content,
          })
          patch.visionDocument = data.envelope.visionDocument
        }

        // Why-probe counter — take server's report if newer
        if (data.envelope.metadata?.whyProbesUsed != null) {
          patch.whyProbesUsed = data.envelope.metadata.whyProbesUsed
        }

        if (Object.keys(patch).length > 0) {
          updateThread(threadId, patch)
        }

        logPlanningEvent({
          projectId: thread.projectId,
          threadId,
          type: isImportedFirstTurn ? 'assistant_readback_created' : 'vision_updated',
          actor: 'ai',
          summary: isImportedFirstTurn
            ? 'AI finished the imported-document readback.'
            : data.envelope.tasks && data.envelope.tasks.length > 0
              ? `AI proposed ${data.envelope.tasks.length} task${data.envelope.tasks.length === 1 ? '' : 's'}.`
              : 'AI updated the planning conversation.',
        })
        if (data.envelope.tasks && data.envelope.tasks.length > 0) {
          logPlanningEvent({
            projectId: thread.projectId,
            threadId,
            type: 'tasks_proposed',
            actor: 'ai',
            summary: `AI proposed ${data.envelope.tasks.length} task${data.envelope.tasks.length === 1 ? '' : 's'} for review.`,
            metadata: { taskCount: data.envelope.tasks.length },
          })
        }

        return {
          userMessage,
          assistantMessage,
          envelope: data.envelope,
          tokenUsage: data.tokenUsage ?? null,
        }
      } finally {
        setIsPending(false)
      }
    },
    [createMessage, updateThread, createVisionVersion, logPlanningEvent],
  )

  const wrapped = useCallback(
    async (data: SendMessageInput) => {
      try {
        return await mutateAsync(data)
      } catch (e) {
        setIsError(true)
        throw e
      }
    },
    [mutateAsync],
  )

  return {
    mutate: (
      data: SendMessageInput,
      options?: { onSuccess?: (data: SendResult) => void; onError?: (err: Error) => void },
    ) => {
      wrapped(data)
        .then((result) => options?.onSuccess?.(result))
        .catch((err) => options?.onError?.(err instanceof Error ? err : new Error(String(err))))
    },
    mutateAsync: wrapped,
    isPending,
    isError,
  }
}

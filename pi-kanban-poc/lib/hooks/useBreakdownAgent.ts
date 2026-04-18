/**
 * Per-task hook driving the breakdown agent flow (Tier 1.4 + 2.5 + 2.6 + 2.7
 * + 2.8 + 3.11 + 3.12 + 4.15).
 *
 * Single hook because every state transition is intertwined: starting a call
 * acquires a concurrency slot; finishing dispatches state into either preview
 * or needs-input depending on envelope shape; refining replaces the suggestion
 * in place. Splitting these into separate hooks would just shuffle state
 * around without simplifying anything.
 */
'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { acquire, release, getSnapshot, subscribe, getQueuePosition } from '@/lib/breakdown/concurrency'
import { classifyTask } from '@/lib/breakdown/classifier'
import type { BreakdownEnvelope, SubtaskProposal, TaskKind } from '@/types/domain'

export type BreakdownState =
  | 'idle'
  | 'queued'
  | 'loading'
  | 'preview'
  | 'needs-input'
  | 'error'

export interface UseBreakdownAgentReturn {
  state: BreakdownState
  envelope: BreakdownEnvelope | null
  /** Surface the cached snapshot ID so the activity log can link back. */
  cachedBreakdownId: string | null
  taskKind: TaskKind
  error: string | null
  /** True when this task currently holds a slot (active) or is queued. */
  isBusy: boolean
  queuePosition: number
  // Actions
  startBreakdown: () => Promise<void>
  loadFromCacheIfAvailable: () => boolean
  answerClarification: (answer: string) => Promise<void>
  /** Refine an already-approved subtask list. Pass current store subtasks
   *  + the user's natural-language refine instruction. */
  refine: (input: { userRefineRequest: string; existingSubtasks: SubtaskProposal[] }) => Promise<void>
  approve: (params: {
    subtasksToApprove: SubtaskProposal[]
    totalSuggested: number
  }) => void
  dismiss: () => void
  resetLocal: () => void
}

export function useBreakdownAgent(taskId: string): UseBreakdownAgentReturn {
  const [state, setState] = useState<BreakdownState>('idle')
  const [envelope, setEnvelope] = useState<BreakdownEnvelope | null>(null)
  const [cachedBreakdownId, setCachedBreakdownId] = useState<string | null>(null)
  const [taskKind, setTaskKind] = useState<TaskKind>('generic')
  const [error, setError] = useState<string | null>(null)
  const [clarifyAttempts, setClarifyAttempts] = useState(0)

  const abortRef = useRef<AbortController | null>(null)

  const tasks = useKanbanStore((s) => s.tasks)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const projects = useKanbanStore((s) => s.projects)
  const createSubtasks = useKanbanStore((s) => s.createSubtasks)
  const saveCachedBreakdown = useKanbanStore((s) => s.saveCachedBreakdown)
  const markCachedBreakdownDismissed = useKanbanStore((s) => s.markCachedBreakdownDismissed)
  const markCachedBreakdownApproved = useKanbanStore((s) => s.markCachedBreakdownApproved)
  const getCachedBreakdownForTask = useKanbanStore((s) => s.getCachedBreakdownForTask)
  const logActivity = useKanbanStore((s) => s.logActivity)

  const task = tasks.find((t) => t.id === taskId) ?? null

  // Concurrency snapshot subscription (for queue position)
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const queuePosition = snapshot.queue.indexOf(taskId)
  const isBusy = snapshot.active.includes(taskId) || queuePosition >= 0

  /** Build the projectContext payload from the live store. */
  const buildProjectContext = useCallback(() => {
    if (!task) return null
    const project = projects.find((p) => p.id === task.projectId)
    if (!project) return null
    // Vision document: pick the most recently updated planning thread for the project
    const threads = planningThreads
      .filter((t) => t.projectId === project.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const visionDocument = threads[0]?.visionDocument ?? null
    const otherTasks = tasks
      .filter((t) => t.projectId === project.id && t.id !== task.id)
      .slice(0, 20)
      .map((t) => ({ title: t.title, status: t.status }))
    return {
      name: project.name,
      description: project.description,
      visionDocument,
      otherTasks,
    }
  }, [task, projects, planningThreads, tasks])

  /** Common request POST. Returns the parsed envelope on success or throws. */
  const callBreakdownApi = useCallback(
    async (extra: {
      additionalContext?: string | null
      refineMode?: boolean
      existingSubtasks?: Array<{ id: string; title: string; description?: string | null; completed?: boolean }>
      userRefineRequest?: string
    } = {}): Promise<{ envelope: BreakdownEnvelope; kind: TaskKind }> => {
      if (!task) throw new Error('Task not found')

      const kind = classifyTask(task.title, task.description)
      setTaskKind(kind)

      const ctx = buildProjectContext()

      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'breakdown',
          messages: [{ role: 'user', content: 'Break down the task.' }],
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskKind: kind,
          projectContext: ctx,
          additionalContext: extra.additionalContext ?? null,
          refineMode: extra.refineMode ?? false,
          existingSubtasks: extra.existingSubtasks ?? null,
          userRefineRequest: extra.userRefineRequest ?? null,
        }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Agent request failed (${res.status})`)
      }
      const data = (await res.json()) as { envelope: BreakdownEnvelope; taskKind: TaskKind }
      return { envelope: data.envelope, kind: data.taskKind ?? kind }
    },
    [task, buildProjectContext],
  )

  // ─── startBreakdown ────────────────────────────────────────────────────────
  const startBreakdown = useCallback(async () => {
    if (!task) return
    setError(null)
    setEnvelope(null)
    setCachedBreakdownId(null)
    setClarifyAttempts(0)

    // Acquire concurrency slot
    const queueController = new AbortController()
    setState(snapshot.active.length >= snapshot.limit ? 'queued' : 'loading')
    try {
      await acquire(task.id, queueController.signal)
    } catch {
      setState('idle')
      return
    }
    setState('loading')

    try {
      const { envelope: env } = await callBreakdownApi()
      // Save to cache (Tier 4.15)
      const cached = saveCachedBreakdown({
        taskId: task.id,
        envelope: env,
        taskTitleAtGeneration: task.title,
        taskDescriptionAtGeneration: task.description,
      })
      setCachedBreakdownId(cached.id)
      setEnvelope(env)

      // Activity log
      if (env.needsHumanInput) {
        logActivity({
          taskId: task.id,
          type: 'ai_needed_human_input',
          actor: 'ai',
          summary: `AI asked: ${env.needsHumanInput.question}`,
          resourceLink: { type: 'cached_breakdown', id: cached.id },
        })
        setState('needs-input')
      } else {
        logActivity({
          taskId: task.id,
          type: 'ai_suggested_breakdown',
          actor: 'ai',
          summary: `AI suggested ${env.subtasks.length} step${env.subtasks.length === 1 ? '' : 's'}`,
          metadata: { subtaskCount: env.subtasks.length },
          resourceLink: { type: 'cached_breakdown', id: cached.id },
        })
        setState('preview')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg)
      setState('error')
    } finally {
      release(task.id)
    }
  }, [task, callBreakdownApi, saveCachedBreakdown, logActivity, snapshot])

  // ─── loadFromCacheIfAvailable ──────────────────────────────────────────────
  // Returns true if a usable cached suggestion was loaded into preview state.
  const loadFromCacheIfAvailable = useCallback((): boolean => {
    if (!task) return false
    const cached = getCachedBreakdownForTask(task.id)
    if (!cached) return false
    if (cached.approvedAt != null) return false  // already turned into real subtasks
    // If task title/description has changed since cache, getCachedBreakdownForTask
    // would still return it; the auto-invalidation lives in updateTask. Belt-and-
    // suspenders: re-check here.
    if (
      cached.taskTitleAtGeneration !== task.title
      || cached.taskDescriptionAtGeneration !== task.description
    ) {
      return false
    }
    setEnvelope(cached.envelope)
    setCachedBreakdownId(cached.id)
    setTaskKind(classifyTask(task.title, task.description))
    setState(cached.envelope.needsHumanInput ? 'needs-input' : 'preview')
    return true
  }, [task, getCachedBreakdownForTask])

  // ─── answerClarification (Tier 2.8) ────────────────────────────────────────
  const answerClarification = useCallback(
    async (answer: string) => {
      if (!task || !envelope?.needsHumanInput) return
      // Hard cap: 1 clarification round. After that, force fallback that
      // produces a best-effort breakdown.
      if (clarifyAttempts >= 1) {
        // Send with explicit "do not ask again" hint
      }
      setError(null)
      setState('loading')

      try {
        await acquire(task.id)
        const additional = `User clarified: ${answer}`
        const { envelope: env } = await callBreakdownApi({ additionalContext: additional })
        const cached = saveCachedBreakdown({
          taskId: task.id,
          envelope: env,
          taskTitleAtGeneration: task.title,
          taskDescriptionAtGeneration: task.description,
        })
        setCachedBreakdownId(cached.id)

        logActivity({
          taskId: task.id,
          type: 'ai_clarification_answered',
          actor: 'user',
          summary: `You answered: "${truncate(answer, 80)}"`,
        })

        // If still needs input AND we already retried, force preview with whatever was returned
        if (env.needsHumanInput && clarifyAttempts >= 1) {
          // Strip the clarification request; pretend we got an answer-less breakdown
          const stripped: BreakdownEnvelope = { ...env, needsHumanInput: null }
          setEnvelope(stripped)
          setState('preview')
        } else if (env.needsHumanInput) {
          setEnvelope(env)
          setClarifyAttempts((n) => n + 1)
          setState('needs-input')
        } else {
          setEnvelope(env)
          logActivity({
            taskId: task.id,
            type: 'ai_suggested_breakdown',
            actor: 'ai',
            summary: `AI suggested ${env.subtasks.length} step${env.subtasks.length === 1 ? '' : 's'}`,
            resourceLink: { type: 'cached_breakdown', id: cached.id },
          })
          setState('preview')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setState('error')
      } finally {
        release(task.id)
      }
    },
    [task, envelope, clarifyAttempts, callBreakdownApi, saveCachedBreakdown, logActivity],
  )

  // ─── refine (Tier 3.12) ────────────────────────────────────────────────────
  const refine = useCallback(
    async ({
      userRefineRequest,
      existingSubtasks,
    }: {
      userRefineRequest: string
      existingSubtasks: SubtaskProposal[]
    }) => {
      if (!task) return
      setError(null)
      setState('loading')
      try {
        await acquire(task.id)
        const { envelope: env } = await callBreakdownApi({
          refineMode: true,
          userRefineRequest,
          existingSubtasks: existingSubtasks.map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
          })),
        })
        const cached = saveCachedBreakdown({
          taskId: task.id,
          envelope: env,
          taskTitleAtGeneration: task.title,
          taskDescriptionAtGeneration: task.description,
        })
        setCachedBreakdownId(cached.id)
        setEnvelope(env)
        setState('preview')
        logActivity({
          taskId: task.id,
          type: 'ai_refined',
          actor: 'ai',
          summary: `AI refined the steps based on: "${truncate(userRefineRequest, 80)}"`,
          resourceLink: { type: 'cached_breakdown', id: cached.id },
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setState('error')
      } finally {
        release(task.id)
      }
    },
    [task, callBreakdownApi, saveCachedBreakdown, logActivity],
  )

  // ─── approve ────────────────────────────────────────────────────────────────
  const approve = useCallback(
    ({
      subtasksToApprove,
      totalSuggested,
    }: {
      subtasksToApprove: SubtaskProposal[]
      totalSuggested: number
    }) => {
      if (!task || subtasksToApprove.length === 0) {
        // If user clicks approve with 0 selected, treat as dismiss
        if (cachedBreakdownId) markCachedBreakdownDismissed(task!.id)
        setState('idle')
        setEnvelope(null)
        return
      }
      const created = createSubtasks(
        task.id,
        subtasksToApprove.map((s) => ({
          title: s.title,
          description: s.description,
          estimatedEffort: s.estimatedEffort,
          type: s.type,
          aiGenerated: true,
        })),
      )
      markCachedBreakdownApproved(task.id, created.map((c) => c.id))
      logActivity({
        taskId: task.id,
        type: 'ai_suggestion_approved',
        actor: 'user',
        summary: `You approved ${subtasksToApprove.length} of ${totalSuggested} AI step${totalSuggested === 1 ? '' : 's'}`,
        metadata: { approvedCount: subtasksToApprove.length, totalSuggested },
        resourceLink: cachedBreakdownId
          ? { type: 'cached_breakdown', id: cachedBreakdownId }
          : null,
      })
      setEnvelope(null)
      setCachedBreakdownId(null)
      setState('idle')
    },
    [task, createSubtasks, markCachedBreakdownApproved, logActivity, cachedBreakdownId],
  )

  // ─── dismiss ────────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (!task) return
    if (cachedBreakdownId) markCachedBreakdownDismissed(task.id)
    logActivity({
      taskId: task.id,
      type: 'ai_suggestion_dismissed',
      actor: 'user',
      summary: 'You dismissed the AI suggestion',
      resourceLink: cachedBreakdownId
        ? { type: 'cached_breakdown', id: cachedBreakdownId }
        : null,
    })
    setEnvelope(null)
    setCachedBreakdownId(null)
    setState('idle')
  }, [task, cachedBreakdownId, markCachedBreakdownDismissed, logActivity])

  const resetLocal = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setEnvelope(null)
    setCachedBreakdownId(null)
    setError(null)
    setClarifyAttempts(0)
    setState('idle')
  }, [])

  // Cleanup on unmount: release any held slot, abort in-flight request
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (taskId) release(taskId)
    }
  }, [taskId])

  return {
    state,
    envelope,
    cachedBreakdownId,
    taskKind,
    error,
    isBusy,
    queuePosition,
    startBreakdown,
    loadFromCacheIfAvailable,
    answerClarification,
    refine,
    approve,
    dismiss,
    resetLocal,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

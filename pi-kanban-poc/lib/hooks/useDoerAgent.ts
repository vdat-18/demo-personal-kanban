'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { DoerEnvelope, Subtask, UITaskStatus } from '@/types/domain'
import { formatError } from '@/lib/display/format'
import { recordDuration } from '@/lib/timing'

interface DoerContext {
  task: { title: string; description: string | null; priority: string }
  currentSubtask: { id: string; title: string; description?: string | null } | null
  allSubtasks: Array<{
    id: string
    title: string
    description: string | null
    completed: boolean
    output: string | null
  }>
  project: { name: string; description: string | null } | null
  visionDocument: string | null
}

interface UseDoerAgentArgs {
  taskId: string
  taskTitle: string
  taskDescription: string | null
  taskStatus: UITaskStatus
}

type DoerState = 'idle' | 'working' | 'needs-input' | 'result' | 'error'

export function getNextPendingSubtaskContext(subtasks: Subtask[]): Subtask | null {
  return subtasks
    .filter((s) => !s.completed)
    .sort((a, b) => a.order - b.order)[0] ?? null
}

/**
 * Hook backing the Doer workspace for IN_PROGRESS tasks.
 *
 * It works one subtask at a time:
 * 1. Pick current subtask id (explicit arg or next pending from store)
 * 2. POST /api/agent mode=chat with role=developer and rich context
 * 3. Parse returned JSON envelope
 * 4. Save draft artifact to Subtask.output / doerResult
 * 5. User can Accept step (marks completed) or Try again
 */
export function useDoerAgent({ taskId, taskTitle, taskDescription }: UseDoerAgentArgs) {
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const saveDoerResult = useKanbanStore((s) => s.saveDoerResult)
  const addTokenUsage = useKanbanStore((s) => s.addTokenUsage)
  const markSubtaskCompletedByDoer = useKanbanStore((s) => s.markSubtaskCompletedByDoer)
  const getNextPendingSubtask = useKanbanStore((s) => s.getNextPendingSubtask)
  const logActivity = useKanbanStore((s) => s.logActivity)

  const [state, setState] = useState<DoerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [envelope, setEnvelope] = useState<DoerEnvelope | null>(null)
  const [currentSubtaskId, setCurrentSubtaskId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (!isMountedRef.current) return
    setState('idle')
    setError(null)
    logActivity({
      taskId,
      type: 'doer_started_subtask',
      actor: 'user',
      summary: 'You cancelled the Doer',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logActivity, taskId])

  const task = useMemo(
    () => tasks.find((t) => t.id === taskId) ?? null,
    [tasks, taskId],
  )
  const taskSubtasks = useMemo(
    () => subtasks.filter((s) => s.taskId === taskId).sort((a, b) => a.order - b.order),
    [subtasks, taskId],
  )

  const buildContext = useCallback((subtaskId: string) => {
    if (!task) return null
    const currentSubtask = taskSubtasks.find((s) => s.id === subtaskId) ?? null
    const project = projects.find((p) => p.id === task.projectId) ?? null
    const thread = planningThreads
      .filter((t) => t.projectId === task.projectId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null

    return {
      task,
      currentSubtask,
      allSubtasks: taskSubtasks.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        completed: s.completed,
        output: s.output,
      })),
      project: project
        ? { name: project.name, description: project.description }
        : null,
      visionDocument: thread?.visionDocument ?? null,
    }
  }, [task, taskSubtasks, projects, planningThreads])

  const start = useCallback(async (subtaskId?: string) => {
    const target = subtaskId ?? getNextPendingSubtask(taskId)?.id ?? null
    if (!target || !task) return

    const ctx = buildContext(target)
    if (!ctx?.currentSubtask) return

    setCurrentSubtaskId(target)
    setError(null)
    setEnvelope(null)
    setState('working')

    logActivity({
      taskId,
      type: 'doer_started_subtask',
      actor: 'ai',
      summary: `AI started: ${ctx.currentSubtask.title}`,
      metadata: { subtaskId: target },
      resourceLink: { type: 'subtask', id: target },
    })

    const systemPrompt = buildDoerPrompt(ctx)

    // Cancel any pending call first
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'doer',
          messages: [
            {
              role: 'user',
              content: `Execute the current step: ${ctx.currentSubtask.title}`,
            },
          ],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: systemPrompt,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Doer request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: DoerEnvelope; tokenUsage?: { input: number; output: number } }
      const parsed = data.envelope ?? null
      if (!parsed) {
        throw new Error('Doer response was not valid JSON')
      }

      if (!isMountedRef.current || controller.signal.aborted) return

      recordDuration('doer', Date.now() - startedAt)
      if (data.tokenUsage && task) {
        addTokenUsage(task.projectId, data.tokenUsage)
      }

      setEnvelope(parsed)

      if (parsed.needsHumanInput) {
        logActivity({
          taskId,
          type: 'doer_needed_human_input',
          actor: 'ai',
          summary: `Doer asked: ${parsed.needsHumanInput.question}`,
          metadata: { subtaskId: target },
          resourceLink: { type: 'subtask', id: target },
        })
        setState('needs-input')
        return
      }

      if (parsed.result) {
        saveDoerResult(taskId, target, parsed.result)
      }

      if (parsed.readyForReview) {
        logActivity({
          taskId,
          type: 'doer_ready_for_review',
          actor: 'ai',
          summary: 'AI thinks this task is ready for review',
          metadata: { subtaskId: target },
          resourceLink: { type: 'subtask', id: target },
        })
      }

      setState('result')
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        setState('idle')
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [buildContext, getNextPendingSubtask, logActivity, saveDoerResult, task, taskDescription, taskId, taskTitle])

  const answerClarification = useCallback(async (answer: string) => {
    const currentId = currentSubtaskId
    if (!currentId || !task) return
    const ctx = buildContext(currentId)
    if (!ctx?.currentSubtask) return

    setState('working')
    setError(null)

    const prompt = buildDoerPrompt(ctx, answer)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'doer',
          messages: [{ role: 'user', content: `Continue step: ${ctx.currentSubtask.title}` }],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: prompt,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Doer request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: DoerEnvelope; tokenUsage?: { input: number; output: number } }
      const parsed = data.envelope ?? null
      if (!parsed) throw new Error('Doer response was not valid JSON')

      if (!isMountedRef.current || controller.signal.aborted) return

      if (data.tokenUsage && task) {
        addTokenUsage(task.projectId, data.tokenUsage)
      }

      setEnvelope(parsed)

      if (parsed.result) {
        saveDoerResult(taskId, currentId, parsed.result)
      }
      setState(parsed.needsHumanInput ? 'needs-input' : 'result')
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        setState('idle')
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [buildContext, currentSubtaskId, saveDoerResult, task, taskDescription, taskId, taskTitle])

  const acceptCurrentStep = useCallback(() => {
    const currentId = envelope?.targetSubtaskId ?? currentSubtaskId
    if (!currentId) return
    markSubtaskCompletedByDoer(taskId, currentId)
    setEnvelope(null)
    setCurrentSubtaskId(null)
    setState('idle')
  }, [currentSubtaskId, envelope?.targetSubtaskId, markSubtaskCompletedByDoer, taskId])

  const retryCurrentStep = useCallback(() => {
    if (!currentSubtaskId) return
    void start(currentSubtaskId)
  }, [currentSubtaskId, start])

  const refineOutput = useCallback(async (instruction: string) => {
    const currentId = currentSubtaskId
    if (!currentId || !task) return
    const ctx = buildContext(currentId)
    if (!ctx?.currentSubtask) return

    const currentDraft = envelope?.result
      ? { summary: envelope.result.summary, artifact: envelope.result.artifact }
      : null

    setState('working')
    setError(null)

    const prompt = buildDoerPrompt(ctx, undefined, instruction, currentDraft)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'doer',
          messages: [{ role: 'user', content: `Revise the output based on: ${instruction}` }],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: prompt,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Doer request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: DoerEnvelope; tokenUsage?: { input: number; output: number } }
      const parsed = data.envelope ?? null
      if (!parsed) throw new Error('Doer response was not valid JSON')

      if (!isMountedRef.current || controller.signal.aborted) return

      if (data.tokenUsage && task) {
        addTokenUsage(task.projectId, data.tokenUsage)
      }

      setEnvelope(parsed)

      if (parsed.result) {
        saveDoerResult(taskId, currentId, parsed.result)
      }
      setState(parsed.needsHumanInput ? 'needs-input' : 'result')

      logActivity({
        taskId,
        type: 'doer_started_subtask',
        actor: 'user',
        summary: `Output refined based on: "${instruction}"`,
        metadata: { subtaskId: currentId },
        resourceLink: { type: 'subtask', id: currentId },
      })
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        setState('idle')
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [addTokenUsage, buildContext, currentSubtaskId, envelope, logActivity, saveDoerResult, task, taskDescription, taskId, taskTitle])

  return {
    state,
    error,
    envelope,
    currentSubtaskId,
    start,
    answerClarification,
    acceptCurrentStep,
    retryCurrentStep,
    refineOutput,
    abort,
  }
}

function buildDoerPrompt(
  ctx: DoerContext,
  clarificationAnswer?: string,
  refineInstruction?: string,
  currentDraft?: { summary: string; artifact: string } | null,
): string {
  const current = ctx.currentSubtask
  const lines: string[] = [
    'You are the Doer Agent for a non-technical user.',
    'Your job is to work on ONE current subtask and produce an actual deliverable artifact.',
    'Do not discuss all subtasks at once. Focus only on the current step.',
    '',
    'Output MUST be a SINGLE JSON object (no markdown fences, no prose outside JSON):',
    '{',
    '  "stepUnderstanding": string,',
    '  "targetSubtaskId": string | null,',
    '  "result": {',
    '    "summary": string,',
    '    "artifact": string,',
    '    "nextAction": string | null',
    '  } | null,',
    '  "needsHumanInput": { "question": string } | null,',
    '  "markSubtaskCompleted": boolean,',
    '  "readyForReview": boolean,',
    '  "taskSummary": string | null',
    '}',
    '',
    'Rules:',
    '- If the current step is ambiguous or missing critical context, ask ONE focused question via needsHumanInput and set result=null.',
    '- If you can draft the work, put the actual deliverable in result.artifact.',
    '- markSubtaskCompleted=true only if the current step is done well enough for the user to accept.',
    '- readyForReview=true only if all subtasks appear complete from the provided context.',
  ]

  if (ctx.project) {
    lines.push('', 'Project context:')
    lines.push(`Project: ${ctx.project.name}`)
    if (ctx.project.description) lines.push(`Description: ${ctx.project.description}`)
  }
  if (ctx.visionDocument) {
    lines.push('', 'Vision:')
    lines.push(ctx.visionDocument.length > 1800 ? ctx.visionDocument.slice(0, 1800) + '\n…[truncated]' : ctx.visionDocument)
  }

  lines.push('', `Task: ${ctx.task.title}`)
  if (ctx.task.description) lines.push(`Task details: ${ctx.task.description}`)
  lines.push(`Priority: ${ctx.task.priority}`)

  lines.push('', 'All subtasks:')
  for (const st of ctx.allSubtasks) {
    lines.push(`- [${st.completed ? 'DONE' : 'TODO'}] ${st.id}: ${st.title}`)
    if (st.description) lines.push(`  Details: ${st.description}`)
    if (st.output) lines.push(`  Previous output: ${st.output.slice(0, 300)}${st.output.length > 300 ? '…' : ''}`)
  }

  if (current) {
    lines.push('', 'Current subtask:')
    lines.push(`ID: ${current.id}`)
    lines.push(`Title: ${current.title}`)
    if (current.description) lines.push(`Description: ${current.description}`)
  }

  if (clarificationAnswer) {
    lines.push('', `User clarification: ${clarificationAnswer}`)
  }

  if (refineInstruction && currentDraft) {
    lines.push('', 'EXISTING DRAFT (the user wants you to revise it):')
    lines.push(`Summary: ${currentDraft.summary}`)
    lines.push(`Artifact:\n${currentDraft.artifact}`)
    lines.push('', `User revision request: ${refineInstruction}`)
    lines.push('Produce an improved version of the artifact based on the user request above.')
  }

  return lines.join('\n')
}

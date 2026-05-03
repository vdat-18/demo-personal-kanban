'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { DoerEnvelope, Subtask, UITaskStatus, Skill } from '@/types/domain'
import { formatError } from '@/lib/display/format'
import { recordDuration } from '@/lib/timing'

// Agent is considered "stalled" if no response after 90 seconds.
const STALL_TIMEOUT_MS = 90_000
// Max retry count before requiring user intervention.
const MAX_RETRY_COUNT = 3

interface DoerContext {
  task: { title: string; description: string | null; priority: string }
  currentSubtask: { id: string; title: string; description?: string | null } | null
  allSubtasks: Array<{
    id: string
    title: string
    description: string | null
    completed: boolean
    output: string | null
    reviewFindings: string[]
  }>
  project: { name: string; description: string | null } | null
  visionDocument: string | null
  skills: Skill[]
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

export function useDoerAgent({ taskId, taskTitle, taskDescription, taskStatus }: UseDoerAgentArgs) {
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const saveDoerResult = useKanbanStore((s) => s.saveDoerResult)
  const addTokenUsage = useKanbanStore((s) => s.addTokenUsage)
  const markSubtaskCompletedByDoer = useKanbanStore((s) => s.markSubtaskCompletedByDoer)
  const getNextPendingSubtask = useKanbanStore((s) => s.getNextPendingSubtask)
  const logActivity = useKanbanStore((s) => s.logActivity)
  const updateTask = useKanbanStore((s) => s.updateTask)
  const getSkillsForProject = useKanbanStore((s) => s.getSkillsForProject)

  const [state, setState] = useState<DoerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [envelope, setEnvelope] = useState<DoerEnvelope | null>(null)
  const [currentSubtaskId, setCurrentSubtaskId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [synthState, setSynthState] = useState<'idle' | 'working' | 'done'>('idle')
  const [synthDraft, setSynthDraft] = useState<{ summary: string; artifact: string } | null>(null)

  // Reset synthesis when task is sent back from IN_REVIEW → IN_PROGRESS
  const prevStatusRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevStatusRef.current === 'IN_REVIEW' && taskStatus === 'IN_PROGRESS') {
      setSynthState('idle')
      setSynthDraft(null)
    }
    prevStatusRef.current = taskStatus
  }, [taskStatus])

  const abortRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  // Pattern 4: claim guard — prevents double-dispatch when user clicks quickly
  const isRunningRef = useRef(false)

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
    isRunningRef.current = false
    if (!isMountedRef.current) return
    setState('idle')
    setError(null)
    updateTask(taskId, { runtimeLastAction: null })
    logActivity({
      taskId,
      type: 'status_changed',
      actor: 'user',
      summary: 'You cancelled the Doer',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logActivity, taskId, updateTask])

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
      allSubtasks: taskSubtasks
        .filter((s) => s.approvalStatus !== 'denied')
        .map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description ?? null,
          completed: s.completed,
          output: s.output,
          reviewFindings: s.reviewResult?.findings ?? [],
        })),
      project: project
        ? { name: project.name, description: project.description }
        : null,
      visionDocument: thread?.visionDocument ?? null,
      skills: getSkillsForProject(task.projectId),
    }
  }, [task, taskSubtasks, projects, planningThreads, getSkillsForProject])

  const start = useCallback(async (subtaskId?: string) => {
    // Pattern 4: claim guard
    if (isRunningRef.current) return
    isRunningRef.current = true

    const target = subtaskId ?? getNextPendingSubtask(taskId)?.id ?? null
    if (!target || !task) {
      isRunningRef.current = false
      return
    }

    const ctx = buildContext(target)
    if (!ctx?.currentSubtask) {
      isRunningRef.current = false
      return
    }

    setCurrentSubtaskId(target)
    setError(null)
    setEnvelope(null)
    setState('working')
    updateTask(taskId, { runtimeLastAction: `Processing: ${ctx.currentSubtask.title}` })

    logActivity({
      taskId,
      type: 'doer_started_subtask',
      actor: 'ai',
      summary: `AI started: ${ctx.currentSubtask.title}`,
      metadata: { subtaskId: target },
      resourceLink: { type: 'subtask', id: target },
    })

    // Pattern 3: first call → full prompt
    const systemPrompt = buildDoerPrompt(ctx)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()

    // Pattern 1: stall detection — abort after 90s if no response
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Timed out — retry' })
      setError('No response received after 90 seconds. Please try again.')
      setState('error')
      isRunningRef.current = false
    }, STALL_TIMEOUT_MS)

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
        updateTask(taskId, { runtimeLastAction: 'Needs input from you' })
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
        updateTask(taskId, { runtimeLastAction: 'Ready for review' })
      } else {
        updateTask(taskId, { runtimeLastAction: `Done: ${ctx.currentSubtask.title}` })
      }

      setState('result')
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        // If it's a stall timeout, state was already set inside stallTimer — do not overwrite
        if (!controller.signal.aborted || state !== 'error') {
          setState('idle')
        }
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      clearTimeout(stallTimer)
      if (abortRef.current === controller) abortRef.current = null
      isRunningRef.current = false
    }
  }, [buildContext, getNextPendingSubtask, logActivity, saveDoerResult, task, taskDescription, taskId, taskTitle, updateTask, state])

  const answerClarification = useCallback(async (answer: string) => {
    // Pattern 4: claim guard
    if (isRunningRef.current) return
    isRunningRef.current = true

    const currentId = currentSubtaskId
    if (!currentId || !task) {
      isRunningRef.current = false
      return
    }
    const ctx = buildContext(currentId)
    if (!ctx?.currentSubtask) {
      isRunningRef.current = false
      return
    }

    setState('working')
    setError(null)
    updateTask(taskId, { runtimeLastAction: `Processing: ${ctx.currentSubtask.title}` })

    // Pattern 3: continuation — only send current subtask + answer, drop heavy context
    const prompt = buildDoerPrompt(ctx, answer, undefined, undefined, true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Pattern 1: stall detection
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Timed out — retry' })
      setError('No response received after 90 seconds. Please try again.')
      setState('error')
      isRunningRef.current = false
    }, STALL_TIMEOUT_MS)

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

      if (parsed.needsHumanInput) {
        updateTask(taskId, { runtimeLastAction: 'Needs input from you' })
        setState('needs-input')
      } else {
        updateTask(taskId, { runtimeLastAction: `Done: ${ctx.currentSubtask.title}` })
        setState('result')
      }
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        if (!controller.signal.aborted || state !== 'error') setState('idle')
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      clearTimeout(stallTimer)
      if (abortRef.current === controller) abortRef.current = null
      isRunningRef.current = false
    }
  }, [buildContext, currentSubtaskId, saveDoerResult, task, taskDescription, taskId, taskTitle, updateTask, state])

  const acceptCurrentStep = useCallback((overrideArtifact?: string) => {
    const currentId = envelope?.targetSubtaskId ?? currentSubtaskId
    if (!currentId) return
    if (overrideArtifact !== undefined && envelope?.result) {
      saveDoerResult(taskId, currentId, { ...envelope.result, artifact: overrideArtifact })
    }
    markSubtaskCompletedByDoer(taskId, currentId)
    updateTask(taskId, { runtimeLastAction: null, runtimeRetryCount: 0 })
    setEnvelope(null)
    setCurrentSubtaskId(null)
    setRetryCount(0)
    setState('idle')
    // Auto-advance: start the next approved+pending step immediately
    const nextSub = getNextPendingSubtask(taskId)
    if (nextSub) {
      void start(nextSub.id)
    }
  }, [currentSubtaskId, envelope, getNextPendingSubtask, markSubtaskCompletedByDoer, saveDoerResult, start, taskId, updateTask])

  // Pattern 2: exponential backoff — wait before retry
  const retryCurrentStep = useCallback(() => {
    if (!currentSubtaskId) return
    const newCount = retryCount + 1
    if (newCount > MAX_RETRY_COUNT) {
      setError(`Failed after ${MAX_RETRY_COUNT} attempts. Check your connection and try again.`)
      setState('error')
      return
    }
    setRetryCount(newCount)
    const delayMs = Math.min(5000 * Math.pow(2, newCount - 1), 60000)
    updateTask(taskId, {
      runtimeLastAction: `Retrying (${newCount}/${MAX_RETRY_COUNT})...`,
      runtimeRetryCount: newCount,
    })
    setTimeout(() => {
      void start(currentSubtaskId)
    }, delayMs)
  }, [currentSubtaskId, retryCount, start, taskId, updateTask])

  const refineOutput = useCallback(async (instruction: string) => {
    // Pattern 4: claim guard
    if (isRunningRef.current) return
    isRunningRef.current = true

    const currentId = currentSubtaskId
    if (!currentId || !task) {
      isRunningRef.current = false
      return
    }
    const ctx = buildContext(currentId)
    if (!ctx?.currentSubtask) {
      isRunningRef.current = false
      return
    }

    const currentDraft = envelope?.result
      ? { summary: envelope.result.summary, artifact: envelope.result.artifact }
      : null

    setState('working')
    setError(null)
    updateTask(taskId, { runtimeLastAction: `Processing: ${ctx.currentSubtask.title}` })

    // Pattern 3: continuation — only send current artifact + revision request
    const prompt = buildDoerPrompt(ctx, undefined, instruction, currentDraft, true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Pattern 1: stall detection
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Timed out — retry' })
      setError('No response received after 90 seconds. Please try again.')
      setState('error')
      isRunningRef.current = false
    }, STALL_TIMEOUT_MS)

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

      if (parsed.needsHumanInput) {
        updateTask(taskId, { runtimeLastAction: 'Needs input from you' })
        setState('needs-input')
      } else {
        updateTask(taskId, { runtimeLastAction: `Done: ${ctx.currentSubtask.title}` })
        setState('result')
      }

      logActivity({
        taskId,
        type: 'ai_refined',
        actor: 'user',
        summary: `Output refined based on: "${instruction}"`,
        metadata: { subtaskId: currentId },
        resourceLink: { type: 'subtask', id: currentId },
      })
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        if (!controller.signal.aborted || state !== 'error') setState('idle')
        return
      }
      setError(formatError(e))
      setState('error')
    } finally {
      clearTimeout(stallTimer)
      if (abortRef.current === controller) abortRef.current = null
      isRunningRef.current = false
    }
  }, [addTokenUsage, buildContext, currentSubtaskId, envelope, logActivity, saveDoerResult, task, taskDescription, taskId, taskTitle, updateTask, state])

  const synthesize = useCallback(async () => {
    if (isRunningRef.current) return
    isRunningRef.current = true

    if (!task) { isRunningRef.current = false; return }

    const completedApproved = taskSubtasks.filter(
      (s) => s.approvalStatus === 'approved' && s.completed
    )
    if (completedApproved.length === 0) { isRunningRef.current = false; return }

    setSynthState('working')
    setSynthDraft(null)
    updateTask(taskId, { runtimeLastAction: 'Synthesizing final draft…' })

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      setSynthState('idle')
      isRunningRef.current = false
    }, STALL_TIMEOUT_MS)

    try {
      const systemPrompt = buildSynthesisPrompt(task, completedApproved)
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'doer',
          messages: [{ role: 'user', content: `Synthesize all completed steps into a final draft for: ${task.title}` }],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: systemPrompt,
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Synthesis request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: DoerEnvelope; tokenUsage?: { input: number; output: number } }
      const parsed = data.envelope ?? null
      if (!parsed?.result) throw new Error('Synthesis response was not valid')

      if (!isMountedRef.current || controller.signal.aborted) return

      if (data.tokenUsage && task) addTokenUsage(task.projectId, data.tokenUsage)

      updateTask(taskId, { finalDraft: parsed.result.artifact, runtimeLastAction: 'Final draft ready' })
      setSynthDraft({ summary: parsed.result.summary, artifact: parsed.result.artifact })
      setSynthState('done')
      logActivity({
        taskId,
        type: 'doer_saved_result',
        actor: 'ai',
        summary: 'Final draft synthesized from all completed steps',
      })
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') { setSynthState('idle'); return }
      setSynthState('idle')
    } finally {
      clearTimeout(stallTimer)
      if (abortRef.current === controller) abortRef.current = null
      isRunningRef.current = false
    }
  }, [addTokenUsage, logActivity, task, taskDescription, taskId, taskSubtasks, taskTitle, updateTask])

  return {
    state,
    error,
    envelope,
    currentSubtaskId,
    retryCount,
    maxRetryCount: MAX_RETRY_COUNT,
    synthState,
    synthDraft,
    start,
    answerClarification,
    acceptCurrentStep,
    retryCurrentStep,
    refineOutput,
    synthesize,
    abort,
  }
}

function buildSynthesisPrompt(
  task: { title: string; description: string | null; priority: string },
  completedSubtasks: Array<{ title: string; description: string | null; doerResult?: { summary: string; artifact: string; nextAction: string | null } | null; output: string | null }>,
): string {
  const lines: string[] = [
    'You are the Doer Agent. All approved subtasks are complete.',
    'Your ONLY job now is to synthesize all individual subtask outputs into ONE single coherent final draft for the whole task.',
    '',
    'Rules:',
    '- Do NOT invent new content. Only combine and organize the existing outputs.',
    '- If outputs conflict, pick the most complete version and note the discrepancy briefly.',
    '- The final artifact must read as one unified document, not a list of pasted sections.',
    '- Maintain logical flow and remove repetition.',
    '',
    'Output MUST be a SINGLE JSON object (no markdown fences, no prose outside JSON):',
    '{',
    '  "stepUnderstanding": string,',
    '  "targetSubtaskId": null,',
    '  "result": {',
    '    "summary": string,',
    '    "artifact": string,',
    '    "nextAction": null',
    '  },',
    '  "needsHumanInput": null,',
    '  "markSubtaskCompleted": false,',
    '  "readyForReview": true,',
    '  "taskSummary": string | null',
    '}',
    '',
    `Task: ${task.title}`,
  ]
  if (task.description) lines.push(`Details: ${task.description}`)
  lines.push('', 'Subtask outputs to synthesize:')
  for (const sub of completedSubtasks) {
    lines.push(`\n### ${sub.title}`)
    if (sub.doerResult?.artifact) {
      lines.push(sub.doerResult.artifact.length > 1200 ? sub.doerResult.artifact.slice(0, 1200) + '\n…[truncated]' : sub.doerResult.artifact)
    } else if (sub.output) {
      lines.push(sub.output.length > 600 ? sub.output.slice(0, 600) + '\n…[truncated]' : sub.output)
    } else {
      lines.push('(no output recorded)')
    }
  }
  lines.push('', 'Write the unified final draft in result.artifact.')
  return lines.join('\n')
}

function buildDoerPrompt(
  ctx: DoerContext,
  clarificationAnswer?: string,
  refineInstruction?: string,
  currentDraft?: { summary: string; artifact: string } | null,
  // Pattern 3: when continuation, skip heavy context (project, vision, subtask list)
  isContinuation = false,
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

  // Pattern 3: first call → full context; continuation → only current subtask
  if (!isContinuation) {
    if (ctx.project) {
      lines.push('', 'Project context:')
      lines.push(`Project: ${ctx.project.name}`)
      if (ctx.project.description) lines.push(`Description: ${ctx.project.description}`)
    }
    if (ctx.visionDocument) {
      lines.push('', 'Vision:')
      lines.push(ctx.visionDocument.length > 1800 ? ctx.visionDocument.slice(0, 1800) + '\n…[truncated]' : ctx.visionDocument)
    }
    if (ctx.skills && ctx.skills.length > 0) {
      lines.push('', 'Project skills (apply these to your work):')
      for (const sk of ctx.skills) {
        lines.push(`- ${sk.name}: ${sk.content}`)
      }
    }

    lines.push('', `Task: ${ctx.task.title}`)
    if (ctx.task.description) lines.push(`Task details: ${ctx.task.description}`)
    lines.push(`Priority: ${ctx.task.priority}`)

    lines.push('', 'All subtasks:')
    for (const st of ctx.allSubtasks) {
      lines.push(`- [${st.completed ? 'DONE' : 'TODO'}] ${st.id}: ${st.title}`)
      if (st.description) lines.push(`  Details: ${st.description}`)
      if (st.output) lines.push(`  Previous output: ${st.output.slice(0, 300)}${st.output.length > 300 ? '…' : ''}`)
      if (!st.completed && st.reviewFindings.length > 0) {
        lines.push(`  ⚠ Reviewer feedback (must address): ${st.reviewFindings.join('; ')}`)
      }
    }
  } else {
    // Continuation: only remind of task title so agent doesn't lose context
    lines.push('', `Task: ${ctx.task.title}`)
    lines.push('(Continuing from previous turn — focus only on the current step below.)')
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

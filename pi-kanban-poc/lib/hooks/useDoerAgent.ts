'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { DoerEnvelope, Subtask, UITaskStatus, Skill } from '@/types/domain'
import { formatError } from '@/lib/display/format'
import { recordDuration } from '@/lib/timing'

// Agent bị coi là "treo" nếu không trả về sau 90 giây.
const STALL_TIMEOUT_MS = 90_000
// Số lần retry tối đa trước khi yêu cầu user can thiệp.
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
  const updateTask = useKanbanStore((s) => s.updateTask)
  const getSkillsForProject = useKanbanStore((s) => s.getSkillsForProject)

  const [state, setState] = useState<DoerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [envelope, setEnvelope] = useState<DoerEnvelope | null>(null)
  const [currentSubtaskId, setCurrentSubtaskId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const abortRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  // Pattern 4: claim guard — ngăn double-dispatch khi user bấm nhanh tay
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
      type: 'doer_started_subtask',
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
    updateTask(taskId, { runtimeLastAction: `Đang xử lý: ${ctx.currentSubtask.title}` })

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

    // Pattern 1: stall detection — abort after 90s nếu không có response
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Hết giờ — thử lại' })
      setError('Không nhận được phản hồi sau 90 giây. Thử lại.')
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
        updateTask(taskId, { runtimeLastAction: 'Cần thêm thông tin từ bạn' })
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
        updateTask(taskId, { runtimeLastAction: 'Sẵn sàng để review' })
      } else {
        updateTask(taskId, { runtimeLastAction: `Xong: ${ctx.currentSubtask.title}` })
      }

      setState('result')
    } catch (e) {
      if (!isMountedRef.current) return
      if (e instanceof Error && e.name === 'AbortError') {
        // Nếu là stall timeout thì state đã được set bên trong stallTimer — không ghi đè
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
    updateTask(taskId, { runtimeLastAction: `Đang xử lý: ${ctx.currentSubtask.title}` })

    // Pattern 3: continuation — chỉ gửi subtask hiện tại + câu trả lời, bỏ toàn bộ context nặng
    const prompt = buildDoerPrompt(ctx, answer, undefined, undefined, true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Pattern 1: stall detection
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Hết giờ — thử lại' })
      setError('Không nhận được phản hồi sau 90 giây. Thử lại.')
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
        updateTask(taskId, { runtimeLastAction: 'Cần thêm thông tin từ bạn' })
        setState('needs-input')
      } else {
        updateTask(taskId, { runtimeLastAction: `Xong: ${ctx.currentSubtask.title}` })
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

  const acceptCurrentStep = useCallback(() => {
    const currentId = envelope?.targetSubtaskId ?? currentSubtaskId
    if (!currentId) return
    markSubtaskCompletedByDoer(taskId, currentId)
    updateTask(taskId, { runtimeLastAction: null, runtimeRetryCount: 0 })
    setEnvelope(null)
    setCurrentSubtaskId(null)
    setRetryCount(0)
    setState('idle')
  }, [currentSubtaskId, envelope?.targetSubtaskId, markSubtaskCompletedByDoer, taskId, updateTask])

  // Pattern 2: exponential backoff — chờ trước khi retry
  const retryCurrentStep = useCallback(() => {
    if (!currentSubtaskId) return
    const newCount = retryCount + 1
    if (newCount > MAX_RETRY_COUNT) {
      setError(`Đã thử ${MAX_RETRY_COUNT} lần không thành công. Kiểm tra kết nối và thử lại sau.`)
      setState('error')
      return
    }
    setRetryCount(newCount)
    const delayMs = Math.min(5000 * Math.pow(2, newCount - 1), 60000)
    updateTask(taskId, {
      runtimeLastAction: `Đang thử lại (${newCount}/${MAX_RETRY_COUNT})...`,
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
    updateTask(taskId, { runtimeLastAction: `Đang xử lý: ${ctx.currentSubtask.title}` })

    // Pattern 3: continuation — chỉ gửi artifact hiện tại + yêu cầu chỉnh sửa
    const prompt = buildDoerPrompt(ctx, undefined, instruction, currentDraft, true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // Pattern 1: stall detection
    const stallTimer = setTimeout(() => {
      controller.abort()
      if (!isMountedRef.current) return
      updateTask(taskId, { runtimeLastAction: 'Hết giờ — thử lại' })
      setError('Không nhận được phản hồi sau 90 giây. Thử lại.')
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
        updateTask(taskId, { runtimeLastAction: 'Cần thêm thông tin từ bạn' })
        setState('needs-input')
      } else {
        updateTask(taskId, { runtimeLastAction: `Xong: ${ctx.currentSubtask.title}` })
        setState('result')
      }

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

  return {
    state,
    error,
    envelope,
    currentSubtaskId,
    retryCount,
    maxRetryCount: MAX_RETRY_COUNT,
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
  // Pattern 3: khi là continuation, bỏ qua context nặng (project, vision, subtask list)
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

  // Pattern 3: first call → full context; continuation → chỉ current subtask
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
    }
  } else {
    // Continuation: chỉ nhắc lại task title để agent không mất context
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

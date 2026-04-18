'use client'

import { useCallback, useMemo, useState } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { ReviewerEnvelope, Subtask, UITaskStatus } from '@/types/domain'

interface UseReviewerAgentArgs {
  taskId: string
  taskTitle: string
  taskDescription: string | null
  taskStatus: UITaskStatus
}

type ReviewerState = 'idle' | 'reviewing' | 'needs-input' | 'result' | 'error'

export function useReviewerAgent({ taskId, taskTitle, taskDescription }: UseReviewerAgentArgs) {
  const tasks = useKanbanStore((s) => s.tasks)
  const subtasks = useKanbanStore((s) => s.subtasks)
  const projects = useKanbanStore((s) => s.projects)
  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const saveReviewerStepResult = useKanbanStore((s) => s.saveReviewerStepResult)
  const logActivity = useKanbanStore((s) => s.logActivity)

  const [state, setState] = useState<ReviewerState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [envelope, setEnvelope] = useState<ReviewerEnvelope | null>(null)

  const task = useMemo(
    () => tasks.find((t) => t.id === taskId) ?? null,
    [tasks, taskId],
  )
  const taskSubtasks = useMemo(
    () => subtasks.filter((s) => s.taskId === taskId).sort((a, b) => a.order - b.order),
    [subtasks, taskId],
  )

  const buildPrompt = useCallback((clarificationAnswer?: string) => {
    if (!task) return ''
    const project = projects.find((p) => p.id === task.projectId) ?? null
    const thread = planningThreads
      .filter((t) => t.projectId === task.projectId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] ?? null

    const lines: string[] = [
      'You are the Reviewer Agent for a non-technical user.',
      'Your job is to review the work already produced for this task and decide whether it is ready to be approved.',
      'Return a SINGLE JSON object only, with this exact shape:',
      '{',
      '  "reviewUnderstanding": string,',
      '  "taskReview": {',
      '    "summary": string,',
      '    "findings": string[],',
      '    "recommendation": string | null',
      '  } | null,',
      '  "stepReviews": Array<{',
      '    "subtaskId": string,',
      '    "summary": string,',
      '    "findings": string[],',
      '    "recommendation": string | null',
      '  }>,',
      '  "needsHumanInput": { "question": string } | null,',
      '  "approveTask": boolean,',
      '  "changeRequest": string | null',
      '}',
      '',
      'Rules:',
      '- Review the actual outputs already produced by the Doer / user.',
      '- If a step has no output and is incomplete, mention it as missing work.',
      '- approveTask=true only if the task is genuinely ready for DONE.',
      '- You DO NOT change task status yourself. A human will click approve.',
      '- If critical context is missing, ask ONE focused question via needsHumanInput.',
    ]

    if (project) {
      lines.push('', 'Project context:')
      lines.push(`Project: ${project.name}`)
      if (project.description) lines.push(`Description: ${project.description}`)
    }
    if (thread?.visionDocument) {
      lines.push('', 'Vision:')
      lines.push(thread.visionDocument.length > 1800 ? thread.visionDocument.slice(0, 1800) + '\n…[truncated]' : thread.visionDocument)
    }
    lines.push('', `Task: ${task.title}`)
    if (task.description) lines.push(`Task details: ${task.description}`)
    lines.push('', 'Subtasks and outputs:')
    for (const sub of taskSubtasks) {
      lines.push(`- [${sub.completed ? 'DONE' : 'TODO'}] ${sub.id}: ${sub.title}`)
      if (sub.description) lines.push(`  Details: ${sub.description}`)
      if (sub.doerResult?.summary) lines.push(`  AI summary: ${sub.doerResult.summary}`)
      if (sub.output) lines.push(`  Output: ${sub.output.slice(0, 400)}${sub.output.length > 400 ? '…' : ''}`)
      if (!sub.output && !sub.completed) lines.push('  Output: (none yet)')
    }
    if (clarificationAnswer) {
      lines.push('', `User clarification: ${clarificationAnswer}`)
    }
    return lines.join('\n')
  }, [planningThreads, projects, task, taskSubtasks])

  const start = useCallback(async () => {
    if (!task) return
    setState('reviewing')
    setError(null)
    setEnvelope(null)

    logActivity({
      taskId,
      type: 'reviewer_started',
      actor: 'ai',
      summary: 'AI started reviewing the task',
    })

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reviewer',
          messages: [{ role: 'user', content: `Review the task: ${task.title}` }],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: buildPrompt(),
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Reviewer request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: ReviewerEnvelope }
      const parsed = data.envelope ?? null
      if (!parsed) throw new Error('Reviewer response was not valid JSON')

      setEnvelope(parsed)

      for (const review of parsed.stepReviews) {
        saveReviewerStepResult(taskId, review.subtaskId, {
          summary: review.summary,
          findings: review.findings,
          recommendation: review.recommendation,
        })
      }

      if (parsed.needsHumanInput) {
        logActivity({
          taskId,
          type: 'reviewer_needed_human_input',
          actor: 'ai',
          summary: `Reviewer asked: ${parsed.needsHumanInput.question}`,
        })
        setState('needs-input')
      } else {
        logActivity({
          taskId,
          type: parsed.approveTask ? 'reviewer_ready_for_done' : 'reviewer_requested_changes',
          actor: 'ai',
          summary: parsed.approveTask
            ? 'AI thinks this task is ready for DONE'
            : 'AI found issues and suggests changes',
        })
        setState('result')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown reviewer error')
      setState('error')
    }
  }, [buildPrompt, logActivity, saveReviewerStepResult, task, taskDescription, taskId, taskTitle])

  const answerClarification = useCallback(async (answer: string) => {
    if (!task) return
    setState('reviewing')
    setError(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reviewer',
          messages: [{ role: 'user', content: `Continue the review for task: ${task.title}` }],
          taskId,
          taskTitle,
          taskDescription,
          systemPromptOverride: buildPrompt(answer),
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? `Reviewer request failed (${response.status})`)
      }
      const data = (await response.json()) as { envelope?: ReviewerEnvelope }
      const parsed = data.envelope ?? null
      if (!parsed) throw new Error('Reviewer response was not valid JSON')

      setEnvelope(parsed)
      for (const review of parsed.stepReviews) {
        saveReviewerStepResult(taskId, review.subtaskId, {
          summary: review.summary,
          findings: review.findings,
          recommendation: review.recommendation,
        })
      }
      setState(parsed.needsHumanInput ? 'needs-input' : 'result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown reviewer error')
      setState('error')
    }
  }, [buildPrompt, saveReviewerStepResult, task, taskDescription, taskId, taskTitle])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
    setEnvelope(null)
  }, [])

  return {
    state,
    error,
    envelope,
    start,
    answerClarification,
    reset,
  }
}

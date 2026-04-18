'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { useBreakdownAgent } from '@/lib/hooks/useBreakdownAgent'
import type { TaskPriority } from '@/types/domain'

interface TaskShape {
  id: string
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: string
  createdAt: string
}

interface TodoBreakdownAutoRunnerProps {
  projectId: string
  tasks: TaskShape[]
}

/**
 * Invisible orchestrator mounted on Mission Control.
 *
 * Goal: when the user enters the kanban board, automatically generate real
 * subtasks for every TODO task that doesn't already have them, so opening a
 * task immediately shows steps.
 *
 * Behavior:
 * - Sort pending TODO tasks by priority first, then createdAt.
 * - Start up to the global concurrency limit (handled by useBreakdownAgent +
 *   concurrency manager).
 * - Only auto-run once per task id per mount, so rerenders don't spam the API.
 * - If AI needs clarification, the task will end up with a cached breakdown
 *   + `needs-input` state for the chat screen to resolve later.
 */
export function TodoBreakdownAutoRunner({ projectId, tasks }: TodoBreakdownAutoRunnerProps) {
  const subtasks = useKanbanStore((s) => s.subtasks)
  const cachedBreakdowns = useKanbanStore((s) => s.cachedBreakdowns)

  const todoTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'TODO')
        .sort((a, b) => comparePriorityThenAge(a, b)),
    [tasks],
  )

  return (
    <>
      {todoTasks.map((task) => {
        const hasSubtasks = subtasks.some((s) => s.taskId === task.id)
        const hasPendingOrApprovedCache = cachedBreakdowns.some(
          (c) => c.taskId === task.id && (c.approvedAt != null || c.dismissedAt == null),
        )
        return (
          <TodoBreakdownAutoTask
            key={task.id}
            taskId={task.id}
            shouldAutoRun={!hasSubtasks && !hasPendingOrApprovedCache}
          />
        )
      })}
    </>
  )
}

function TodoBreakdownAutoTask({ taskId, shouldAutoRun }: { taskId: string; shouldAutoRun: boolean }) {
  const breakdown = useBreakdownAgent(taskId)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!shouldAutoRun) return
    if (startedRef.current) return
    startedRef.current = true
    void breakdown.autoCreateSubtasks()
  }, [shouldAutoRun, breakdown])

  return null
}

function comparePriorityThenAge(a: TaskShape, b: TaskShape): number {
  const order: Record<string, number> = {
    URGENT: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  }
  const pa = order[a.priority as TaskPriority] ?? 2
  const pb = order[b.priority as TaskPriority] ?? 2
  if (pa !== pb) return pa - pb
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

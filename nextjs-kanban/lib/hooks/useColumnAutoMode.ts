'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import {
  AUTO_MODE_COLUMNS,
  COLUMN_AGENT_MAP,
  DEFAULT_PROMPTS,
  createInitialColumnState,
} from '@/lib/auto-mode/constants'
import type { AutoModeColumnState, TaskStatus } from '@/lib/auto-mode/constants'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

// ─── API helpers ─────────────────────────────────────────────────────────────

/** Re-fetch the live task state from DB to verify agent actually completed the work */
async function fetchTaskState(taskId: string): Promise<{ status: string; subtasks: Array<{ completed: boolean }> } | null> {
  try {
    const res = await fetch(`/api/tasks/${taskId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Pre-generate subtasks for a TODO task via AI before dispatching the doer.
 * Calls POST /api/tasks/:id/breakdown — idempotent if subtasks already exist.
 */
async function ensureSubtasksGenerated(taskId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tasks/${taskId}/breakdown`, { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  createdAt: string
}

interface UseColumnAutoModeOptions {
  tasks: Task[]
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>
}

interface UseColumnAutoModeReturn {
  columnStates: Record<string, AutoModeColumnState>
  toggle: (columnId: string) => void
  stop: (columnId: string) => void
  dismissError: (columnId: string) => void
  /** Set of all task IDs currently being auto-processed across all columns */
  autoProcessingTaskIds: Set<string>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextStatus(current: TaskStatus): TaskStatus | null {
  const allowed = getAllowedTransitions(current as TaskStatusValue)
  const nonBlocked = allowed.filter((s) => s !== 'BLOCKED')
  return nonBlocked.length > 0 ? (nonBlocked[0] as TaskStatus) : null
}

function getOldestTask(tasks: Task[], columnId: string): Task | null {
  const columnTasks = tasks
    .filter((t) => t.status === columnId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return columnTasks[0] ?? null
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useColumnAutoMode({
  tasks,
  updateTaskStatus,
}: UseColumnAutoModeOptions): UseColumnAutoModeReturn {
  // Per-column state
  const [columnStates, setColumnStates] = useState<Record<string, AutoModeColumnState>>(() => {
    const initial: Record<string, AutoModeColumnState> = {}
    for (const col of AUTO_MODE_COLUMNS) {
      initial[col] = createInitialColumnState()
    }
    return initial
  })

  // Refs to avoid stale closures in stream callbacks
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const columnStatesRef = useRef(columnStates)
  useEffect(() => { columnStatesRef.current = columnStates }, [columnStates])

  // Track which column is actively streaming (one stream instance shared)
  const activeColumnRef = useRef<string | null>(null)
  const activeTaskIdRef = useRef<string | null>(null)
  // Queue: after a task completes, we schedule picking up the next one
  const pendingPickupRef = useRef<string | null>(null)

  // ── Agent stream instance ──────────────────────────────────────────────────
  const { startStream, abort, isStreaming } = useAgentStream({
    onComplete: async (result) => {
      const columnId = activeColumnRef.current
      const taskId = activeTaskIdRef.current
      if (!columnId || !taskId) return

      // ── Completion Verification ───────────────────────────────────────────
      // Re-fetch task from DB to verify the agent actually completed the work
      // (i.e., called task_update to change status). If the status hasn't
      // changed we do NOT blindly advance it — we retry or flag an error.
      const liveTask = await fetchTaskState(taskId)
      const localTask = tasksRef.current.find((t) => t.id === taskId)

      if (liveTask) {
        const statusChanged = localTask && liveTask.status !== localTask.status
        const allSubtasksCompleted =
          liveTask.subtasks.length === 0 ||
          liveTask.subtasks.every((st) => st.completed)

        if (!statusChanged && !allSubtasksCompleted && columnId === 'IN_PROGRESS') {
          // Agent streamed but didn't finish — keep running with a resume prompt
          console.warn(`[AutoMode] Task ${taskId}: stream ended but work is incomplete. Resuming.`)
          const resumePrompt = 'Continue from where you left off. Find the next PENDING subtask and execute it completely. Then keep going until all subtasks are done and the Master Report is written.'
          startStream(COLUMN_AGENT_MAP[columnId], resumePrompt, taskId)
          return
        }

        if (!statusChanged && columnId !== 'IN_PROGRESS') {
          // For TODO/IN_REVIEW: agent didn't call task_update → advance manually as fallback
          const nextStatus = getNextStatus(localTask?.status ?? (columnId as TaskStatus))
          if (nextStatus) {
            await updateTaskStatus(taskId, nextStatus)
          }
        }
        // If statusChanged === true: agent already called task_update — no need to advance manually
      } else {
        // Fallback: couldn't fetch live state → use local data as before
        if (localTask) {
          const nextStatus = getNextStatus(localTask.status)
          if (nextStatus) {
            await updateTaskStatus(taskId, nextStatus)
          }
        }
      }

      // Clear active state
      activeTaskIdRef.current = null
      activeColumnRef.current = null

      // Mark column as idle, then trigger pickup for next task
      setColumnStates((prev) => ({
        ...prev,
        [columnId]: { ...prev[columnId], status: 'idle', activeTaskId: null },
      }))

      // Schedule pickup for the same column (next tick so state has propagated)
      pendingPickupRef.current = columnId
    },
    onError: (errorMsg) => {
      const columnId = activeColumnRef.current
      if (!columnId) return

      // Error → disable auto mode on this column
      activeTaskIdRef.current = null
      activeColumnRef.current = null

      setColumnStates((prev) => ({
        ...prev,
        [columnId]: {
          enabled: false,
          status: 'error',
          activeTaskId: null,
          error: errorMsg,
        },
      }))
    },
  })

  // ── Dispatch agent for a specific task in a column ─────────────────────────
  const dispatchTask = useCallback(
    async (columnId: string, task: Task) => {
      const agentRole = COLUMN_AGENT_MAP[columnId]
      const prompt = DEFAULT_PROMPTS[columnId]
      if (!agentRole || !prompt) return

      activeColumnRef.current = columnId
      activeTaskIdRef.current = task.id

      setColumnStates((prev) => ({
        ...prev,
        [columnId]: {
          ...prev[columnId],
          status: 'running',
          activeTaskId: task.id,
          error: null,
        },
      }))

      // ── Auto-breakdown: pre-generate subtasks for TODO tasks ──────────────
      // Before the Planner agent runs, ensure subtasks are already created in DB.
      // This way, when the agent starts it sees a ready subtask list and doesn't
      // need to spend its first response just drafting a breakdown.
      if (columnId === 'TODO') {
        await ensureSubtasksGenerated(task.id)
      }

      startStream(agentRole, prompt, task.id)
    },
    [startStream],
  )

  // ── Pick up the next task in a column ──────────────────────────────────────
  const pickupNextTask = useCallback(
    (columnId: string) => {
      const state = columnStatesRef.current[columnId]
      if (!state?.enabled) return
      if (activeColumnRef.current) return // another column is already streaming

      const nextTask = getOldestTask(tasksRef.current, columnId)
      if (nextTask) {
        dispatchTask(columnId, nextTask)
      } else {
        // No tasks left → idle
        setColumnStates((prev) => ({
          ...prev,
          [columnId]: { ...prev[columnId], status: 'idle', activeTaskId: null },
        }))
      }
    },
    [dispatchTask],
  )

  // ── Process pending pickup after state settles ─────────────────────────────
  useEffect(() => {
    if (pendingPickupRef.current && !isStreaming) {
      const columnId = pendingPickupRef.current
      pendingPickupRef.current = null
      // Small delay to let React state propagate from updateTaskStatus
      const timer = setTimeout(() => pickupNextTask(columnId), 300)
      return () => clearTimeout(timer)
    }
  }, [isStreaming, tasks, pickupNextTask])

  // ── React to task list changes: auto-pickup for enabled idle columns ───────
  useEffect(() => {
    if (isStreaming || activeColumnRef.current) return

    for (const columnId of AUTO_MODE_COLUMNS) {
      const state = columnStatesRef.current[columnId]
      if (state?.enabled && state.status === 'idle' && !state.activeTaskId) {
        const nextTask = getOldestTask(tasks, columnId)
        if (nextTask) {
          dispatchTask(columnId, nextTask)
          break // only start one at a time
        }
      }
    }
  }, [tasks, isStreaming, dispatchTask])

  // ── Toggle auto mode on/off for a column ───────────────────────────────────
  const toggle = useCallback(
    (columnId: string) => {
      setColumnStates((prev) => {
        const current = prev[columnId]
        if (!current) return prev

        if (current.enabled) {
          // Turning OFF — if this column is actively streaming, abort
          if (activeColumnRef.current === columnId) {
            abort()
            activeColumnRef.current = null
            activeTaskIdRef.current = null
          }
          return {
            ...prev,
            [columnId]: {
              enabled: false,
              status: 'disabled',
              activeTaskId: null,
              error: null,
            },
          }
        }

        // Turning ON
        const newState: AutoModeColumnState = {
          enabled: true,
          status: 'idle',
          activeTaskId: null,
          error: null,
        }

        // Immediately try to pick up a task if no other column is streaming
        if (!activeColumnRef.current) {
          const nextTask = getOldestTask(tasksRef.current, columnId)
          if (nextTask) {
            // Schedule dispatch after state update
            setTimeout(() => dispatchTask(columnId, nextTask), 0)
          }
        }

        return { ...prev, [columnId]: newState }
      })
    },
    [abort, dispatchTask],
  )

  // ── Stop a specific column ─────────────────────────────────────────────────
  const stop = useCallback(
    (columnId: string) => {
      if (activeColumnRef.current === columnId) {
        abort()
        activeColumnRef.current = null
        activeTaskIdRef.current = null
      }
      setColumnStates((prev) => ({
        ...prev,
        [columnId]: {
          enabled: false,
          status: 'disabled',
          activeTaskId: null,
          error: null,
        },
      }))
    },
    [abort],
  )

  // ── Dismiss error on a column ──────────────────────────────────────────────
  const dismissError = useCallback((columnId: string) => {
    setColumnStates((prev) => ({
      ...prev,
      [columnId]: { ...prev[columnId], status: 'disabled', error: null },
    }))
  }, [])

  // ── Derive set of auto-processing task IDs ─────────────────────────────────
  const autoProcessingTaskIds = new Set<string>()
  for (const state of Object.values(columnStates)) {
    if (state.activeTaskId) {
      autoProcessingTaskIds.add(state.activeTaskId)
    }
  }

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => { abort() }
  }, [abort])

  return { columnStates, toggle, stop, dismissError, autoProcessingTaskIds }
}

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

      // Find the task and advance its status
      const task = tasksRef.current.find((t) => t.id === taskId)
      if (task) {
        const nextStatus = getNextStatus(task.status)
        if (nextStatus) {
          await updateTaskStatus(taskId, nextStatus)
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
    (columnId: string, task: Task) => {
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

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
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
  runtimeState?: 'idle' | 'ready' | 'running' | 'waiting_review' | 'blocked' | 'retrying' | 'done'
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
    .filter((t) => t.status === columnId && (t.runtimeState == null || t.runtimeState === 'idle' || t.runtimeState === 'ready' || t.runtimeState === 'retrying'))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return columnTasks[0] ?? null
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useColumnAutoMode({
  tasks,
  updateTaskStatus,
}: UseColumnAutoModeOptions): UseColumnAutoModeReturn {
  const createAttentionItem = useKanbanStore((s) => s.createAttentionItem)
  const updateProject = useKanbanStore((s) => s.updateProject)
  const projects = useKanbanStore((s) => s.projects)
  const [columnStates, setColumnStates] = useState<Record<string, AutoModeColumnState>>(() => {
    const initial: Record<string, AutoModeColumnState> = {}
    for (const col of AUTO_MODE_COLUMNS) {
      initial[col] = createInitialColumnState()
    }
    return initial
  })

  const tasksRef = useRef(tasks)
  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  const columnStatesRef = useRef(columnStates)
  useEffect(() => {
    columnStatesRef.current = columnStates
  }, [columnStates])

  const activeColumnRef = useRef<string | null>(null)
  const activeTaskIdRef = useRef<string | null>(null)
  const pendingPickupRef = useRef<string | null>(null)

  const { startStream, abort, isStreaming } = useAgentStream({
    onComplete: async () => {
      const columnId = activeColumnRef.current
      const taskId = activeTaskIdRef.current
      if (!columnId || !taskId) return

      // Do NOT blindly advance the task anymore.
      //
      // Historical behavior was:
      //   IN_PROGRESS -> IN_REVIEW when stream ended
      //   IN_REVIEW   -> DONE      when stream ended
      //
      // That created false expectations because neither Doer nor Reviewer had
      // persisted artifacts / human checkpoints. We now keep the task in its
      // current column and let the dedicated workspace + explicit human action
      // decide the transition.

      const finishedTask = tasksRef.current.find((task) => task.id === taskId)
      const owningProject = projects.find((project) =>
        useKanbanStore.getState().tasks.find((task) => task.id === taskId)?.projectId === project.id,
      )

      activeTaskIdRef.current = null
      activeColumnRef.current = null

      if (owningProject && finishedTask) {
        updateProject(owningProject.id, {
          runtimeStatus: {
            state: 'executing',
            summary: `Auto mode completed a ${columnId.toLowerCase()} run.`,
            lastAction: `Completed auto mode on ${finishedTask.title}`,
            lastUpdatedAt: new Date().toISOString(),
            retryCount: owningProject.runtimeStatus?.retryCount ?? 0,
            blockedReason: null,
          },
          workpad: owningProject.workpad
            ? {
                ...owningProject.workpad,
                proofOfWork: [...owningProject.workpad.proofOfWork, `Auto mode completed ${columnId.toLowerCase()} work for ${finishedTask.title}.`],
              }
            : owningProject.workpad,
        })
      }

      setColumnStates((prev) => ({
        ...prev,
        [columnId]: { ...prev[columnId], status: 'idle', activeTaskId: null },
      }))
      pendingPickupRef.current = columnId
    },
    onError: (errorMsg) => {
      const columnId = activeColumnRef.current
      if (!columnId) return
      const taskId = activeTaskIdRef.current
      const failedTask = tasksRef.current.find((task) => task.id === taskId)
      const owningProject = projects.find((project) =>
        useKanbanStore.getState().tasks.find((task) => task.id === taskId)?.projectId === project.id,
      )
      activeTaskIdRef.current = null
      activeColumnRef.current = null

      if (owningProject && failedTask) {
        createAttentionItem({
          projectId: owningProject.id,
          type: 'execution_blocked',
          title: 'Auto mode stopped on an execution error',
          detail: `The ${columnId.toLowerCase()} auto run for "${failedTask.title}" failed and needs review.`,
        })
        updateProject(owningProject.id, {
          runtimeStatus: {
            state: 'retrying',
            summary: `Auto mode hit an error in ${columnId.toLowerCase()}.`,
            lastAction: `Auto mode failed on ${failedTask.title}`,
            lastUpdatedAt: new Date().toISOString(),
            retryCount: (owningProject.runtimeStatus?.retryCount ?? 0) + 1,
            blockedReason: errorMsg,
          },
          workpad: owningProject.workpad
            ? {
                ...owningProject.workpad,
                blockers: [...owningProject.workpad.blockers, errorMsg],
              }
            : owningProject.workpad,
        })
      }

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

      startStream(agentRole, prompt, task.id)
    },
    [startStream, createAttentionItem, updateProject, projects],
  )

  const pickupNextTask = useCallback(
    (columnId: string) => {
      const state = columnStatesRef.current[columnId]
      if (!state?.enabled) return
      if (activeColumnRef.current) return

      const nextTask = getOldestTask(tasksRef.current, columnId)
      if (nextTask) {
        dispatchTask(columnId, nextTask)
      } else {
        setColumnStates((prev) => ({
          ...prev,
          [columnId]: { ...prev[columnId], status: 'idle', activeTaskId: null },
        }))
      }
    },
    [dispatchTask],
  )

  useEffect(() => {
    if (pendingPickupRef.current && !isStreaming) {
      const columnId = pendingPickupRef.current
      pendingPickupRef.current = null
      const timer = setTimeout(() => pickupNextTask(columnId), 300)
      return () => clearTimeout(timer)
    }
  }, [isStreaming, tasks, pickupNextTask])

  useEffect(() => {
    if (isStreaming || activeColumnRef.current) return
    for (const columnId of AUTO_MODE_COLUMNS) {
      const state = columnStatesRef.current[columnId]
      if (state?.enabled && state.status === 'idle' && !state.activeTaskId) {
        const nextTask = getOldestTask(tasks, columnId)
        if (nextTask) {
          dispatchTask(columnId, nextTask)
          break
        }
      }
    }
  }, [tasks, isStreaming, dispatchTask])

  const toggle = useCallback(
    (columnId: string) => {
      setColumnStates((prev) => {
        const current = prev[columnId]
        if (!current) return prev

        if (current.enabled) {
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

        const newState: AutoModeColumnState = {
          enabled: true,
          status: 'idle',
          activeTaskId: null,
          error: null,
        }

        if (!activeColumnRef.current) {
          const nextTask = getOldestTask(tasksRef.current, columnId)
          if (nextTask) setTimeout(() => dispatchTask(columnId, nextTask), 0)
        }

        return { ...prev, [columnId]: newState }
      })
    },
    [abort, dispatchTask],
  )

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

  const dismissError = useCallback((columnId: string) => {
    setColumnStates((prev) => ({
      ...prev,
      [columnId]: { ...prev[columnId], status: 'disabled', error: null },
    }))
  }, [])

  const autoProcessingTaskIds = new Set<string>()
  for (const state of Object.values(columnStates)) {
    if (state.activeTaskId) {
      autoProcessingTaskIds.add(state.activeTaskId)
    }
  }

  useEffect(() => {
    return () => {
      abort()
    }
  }, [abort])

  return { columnStates, toggle, stop, dismissError, autoProcessingTaskIds }
}

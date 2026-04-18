'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/organisms/KanbanBoard'
import { KanbanHeader } from '@/components/organisms/KanbanHeader'
import { KanbanFooter } from '@/components/organisms/KanbanFooter'
import { CancelTaskDialog } from '@/components/organisms/CancelTaskDialog'
import type { UITaskStatus } from '@/types/domain'
import { getAllowedTransitions, validateTransition } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { useColumnAutoMode } from '@/lib/hooks/useColumnAutoMode'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  createdAt: string
  updatedAt: string
}

interface Project {
  id: string
  name: string
  description: string | null
  tasks: Task[]
}

function getNextStatus(current: UITaskStatus): UITaskStatus | null {
  const allowed = getAllowedTransitions(current as TaskStatusValue)
  const nonBlocked = allowed.filter((s) => s !== 'BLOCKED')
  return nonBlocked.length > 0 ? (nonBlocked[0] as UITaskStatus) : null
}

function isValidDropTarget(fromStatus: UITaskStatus, toStatus: UITaskStatus): boolean {
  if (fromStatus === toStatus) return true
  const allowed = getAllowedTransitions(fromStatus as TaskStatusValue)
  return allowed.includes(toStatus as TaskStatusValue)
}

export interface MissionControlTemplateProps {
  project: Project
}

export function MissionControlTemplate({ project: initialProject }: MissionControlTemplateProps) {
  const router = useRouter()
  const storeTasks = useKanbanStore((s) => s.tasks)
  const updateTaskInStore = useKanbanStore((s) => s.updateTask)
  const createTaskInStore = useKanbanStore((s) => s.createTask)

  // Live tasks for this project (always reflect store state)
  const tasks = storeTasks
    .filter((t) => t.projectId === initialProject.id)
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as UITaskStatus,
      priority: t.priority,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })) as Task[]

  const project = { ...initialProject, tasks }

  const [dragOverColumn, setDragOverColumn] = useState<UITaskStatus | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [draggingTaskStatus, setDraggingTaskStatus] = useState<UITaskStatus | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const updateTaskStatus = useCallback(
    async (taskId: string, status: UITaskStatus) => {
      const current = storeTasks.find((t) => t.id === taskId)
      if (!current) return
      if (current.status !== status) {
        const result = validateTransition(current.status as TaskStatusValue, status as TaskStatusValue)
        if (!result.valid) {
          console.warn(result.message)
          return
        }
      }
      updateTaskInStore(taskId, { status })
    },
    [storeTasks, updateTaskInStore],
  )

  const {
    columnStates: autoModeStates,
    toggle: toggleAutoMode,
    dismissError: dismissAutoModeError,
  } = useColumnAutoMode({ tasks, updateTaskStatus })

  const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: UITaskStatus) => {
    e.dataTransfer.setData('taskId', taskId)
    e.dataTransfer.setData('taskStatus', taskStatus)
    setDraggingTaskId(taskId)
    setDraggingTaskStatus(taskStatus)
  }

  const handleDrop = (e: React.DragEvent, status: UITaskStatus) => {
    const taskId = e.dataTransfer.getData('taskId')
    const fromStatus = e.dataTransfer.getData('taskStatus') as UITaskStatus
    if (taskId && isValidDropTarget(fromStatus, status)) {
      updateTaskStatus(taskId, status)
    }
    setDragOverColumn(null)
    setDraggingTaskId(null)
    setDraggingTaskStatus(null)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    await updateTaskStatus(cancelTarget.id, 'BLOCKED')
    setCancelTarget(null)
    setCancelReason('')
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#f0f2f5] overflow-hidden font-sans">
      <KanbanHeader
        projectName={project.name}
        projectDescription={project.description}
        onBack={() => router.push('/')}
        onAddTask={async () => {
          const title = window.prompt('Task title:')
          if (!title?.trim()) return
          createTaskInStore({ title, projectId: project.id })
        }}
      />

      <KanbanBoard
        tasks={tasks}
        autoModeStates={autoModeStates}
        dragOverColumn={dragOverColumn}
        draggingTaskId={draggingTaskId}
        draggingTaskStatus={draggingTaskStatus}
        onDragStart={handleDragStart}
        onDragOver={(e, columnId) => setDragOverColumn(columnId)}
        onDragLeave={() => setDragOverColumn(null)}
        onDrop={handleDrop}
        onTaskClick={(taskId, status) => {
          if (status !== 'BLOCKED') router.push(`/chat/${taskId}`)
        }}
        onUpdateStatus={updateTaskStatus}
        onCancelRequest={(task) => setCancelTarget(task)}
        onToggleAutoMode={toggleAutoMode}
        onDismissAutoModeError={dismissAutoModeError}
        getNextStatus={getNextStatus}
        isValidDropTarget={isValidDropTarget}
      />

      <KanbanFooter
        tasks={tasks}
        autoModeStates={autoModeStates}
        onCloseProject={() => router.push(`/summary/${project.id}`)}
      />

      <CancelTaskDialog
        isOpen={!!cancelTarget}
        taskTitle={cancelTarget?.title ?? ''}
        cancelReason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancelConfirm}
        onCancel={() => { setCancelTarget(null); setCancelReason('') }}
      />
    </div>
  )
}

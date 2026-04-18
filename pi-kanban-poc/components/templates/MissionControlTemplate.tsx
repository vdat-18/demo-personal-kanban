'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { KanbanBoard } from '@/components/organisms/KanbanBoard'
import { KanbanHeader } from '@/components/organisms/KanbanHeader'
import { KanbanFooter } from '@/components/organisms/KanbanFooter'
import { CancelTaskDialog } from '@/components/organisms/CancelTaskDialog'
import type { UITaskStatus } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'
import { useColumnAutoMode } from '@/lib/hooks/useColumnAutoMode'

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
  const [project, setProject] = useState(initialProject)
  const [dragOverColumn, setDragOverColumn] = useState<UITaskStatus | null>(null)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [draggingTaskStatus, setDraggingTaskStatus] = useState<UITaskStatus | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const tasks = project.tasks

  const updateTaskStatus = useCallback(async (taskId: string, status: UITaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        if (res.status === 422) {
          const body = await res.json().catch(() => ({}))
          console.warn(`Invalid transition: ${body.from} → ${body.to}. Allowed: ${body.allowed?.join(', ')}`)
        }
        return
      }
      const updated = await res.json()
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...updated } : t)),
      }))
    } catch (err) {
      console.error(err)
    }
  }, [])

  const {
    columnStates: autoModeStates,
    toggle: toggleAutoMode,
    dismissError: dismissAutoModeError,
    autoProcessingTaskIds,
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
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, projectId: project.id }),
          })
          if (res.ok) {
            const task = await res.json()
            setProject((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
          }
        }}
      />

      <KanbanBoard
        tasks={tasks}
        autoModeStates={autoModeStates}
        autoProcessingTaskIds={autoProcessingTaskIds}
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

'use client'

import { Plus } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import type { UITaskStatus } from '@/types/domain'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'

const KANBAN_COLUMNS: Array<{ id: UITaskStatus; label: string }> = [
  { id: 'TODO', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'IN_REVIEW', label: 'In Review' },
  { id: 'DONE', label: 'Done' },
  { id: 'BLOCKED', label: 'Blocked' },
]

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  createdAt: string
  updatedAt: string
  dependsOnTaskIds?: string[]
  blockedByTaskIds?: string[]
  runtimeState?: string
  runtimeLastAction?: string | null
  runtimeNextAction?: string | null
}

export interface KanbanBoardProps {
  tasks: Task[]
  autoModeStates: Record<string, AutoModeColumnState>
  dragOverColumn: UITaskStatus | null
  draggingTaskId: string | null
  draggingTaskStatus: UITaskStatus | null
  onDragStart: (e: React.DragEvent, taskId: string, status: UITaskStatus) => void
  onDragOver: (e: React.DragEvent, columnId: UITaskStatus) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, columnId: UITaskStatus) => void
  onTaskClick: (taskId: string, status: UITaskStatus) => void
  onUpdateStatus: (taskId: string, status: UITaskStatus) => void
  onCancelRequest: (task: Task) => void
  onToggleAutoMode: (columnId: string) => void
  onDismissAutoModeError: (columnId: string) => void
  getNextStatus: (current: UITaskStatus) => UITaskStatus | null
  isValidDropTarget: (from: UITaskStatus, to: UITaskStatus) => boolean
}

export function KanbanBoard({
  tasks,
  autoModeStates,
  dragOverColumn,
  draggingTaskId,
  draggingTaskStatus,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onTaskClick,
  onUpdateStatus,
  onCancelRequest,
  onToggleAutoMode,
  onDismissAutoModeError,
  getNextStatus,
  isValidDropTarget,
}: KanbanBoardProps) {
  return (
    <main className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-6">
      <div className="flex gap-3 h-full min-w-[900px]">
        {KANBAN_COLUMNS.map((column) => {
          const isValid = draggingTaskStatus
            ? isValidDropTarget(draggingTaskStatus, column.id)
            : true
          const isDragging = draggingTaskId !== null
          const isHovering = dragOverColumn === column.id

          return (
            <KanbanColumn
              key={column.id}
              columnId={column.id}
              label={column.label}
              tasks={tasks.filter((t) => t.status === column.id)}
              autoModeState={autoModeStates[column.id]}
              isValidDropTarget={isValid}
              isDragging={isDragging}
              isHovering={isHovering}
              onDragOver={(e) => {
                if (isValid) {
                  e.preventDefault()
                  onDragOver(e, column.id)
                }
              }}
              onDragLeave={onDragLeave}
              onDrop={(e) => {
                if (isValid) onDrop(e, column.id)
              }}
              onDragStart={onDragStart}
              onTaskClick={onTaskClick}
              onUpdateStatus={onUpdateStatus}
              onCancelRequest={onCancelRequest}
              onToggleAutoMode={() => onToggleAutoMode(column.id)}
              onDismissAutoModeError={() => onDismissAutoModeError(column.id)}
              getNextStatus={getNextStatus}
            />
          )
        })}

        {/* Add Column ghost — compact so it doesn't eat column space */}
        <div className="w-10 h-full border-2 border-dashed border-line rounded-2xl flex items-center justify-center hover:bg-surface hover:border-brand transition-all cursor-pointer group shrink-0">
          <Plus className="w-4 h-4 text-ink-subtle group-hover:text-brand transition-colors" />
        </div>
      </div>
    </main>
  )
}

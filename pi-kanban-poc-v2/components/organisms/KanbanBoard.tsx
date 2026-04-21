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
      <div className="flex gap-6 h-full" style={{ minWidth: `${KANBAN_COLUMNS.length * 320 + 100}px` }}>
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
              onDrop={(e) => { if (isValid) onDrop(e, column.id) }}
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

        {/* Add Column Ghost */}
        <div className="w-80 h-full border-2 border-dashed border-gray-200 rounded-[3rem] flex items-center justify-center hover:bg-white hover:border-blue-400/50 transition-all cursor-pointer group shrink-0">
          <div className="flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-[24px] bg-white text-gray-300 flex items-center justify-center group-hover:bg-[#0a192f] group-hover:text-white group-hover:scale-110 group-hover:rotate-90 transition-all shadow-xl shadow-slate-200/50">
              <Plus className="w-7 h-7" />
            </div>
            <span className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em] group-hover:text-[#0a192f] transition-colors">Add Column</span>
          </div>
        </div>
      </div>
    </main>
  )
}

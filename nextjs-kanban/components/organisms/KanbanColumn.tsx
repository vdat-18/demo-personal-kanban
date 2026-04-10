'use client'

import { MoreHorizontal } from 'lucide-react'
import { TaskCard } from '@/components/molecules/TaskCard'
import { EmptyColumnPlaceholder } from '@/components/molecules/EmptyColumnPlaceholder'
import { AutoModeToggle } from '@/components/atoms/AutoModeToggle'
import { AutoModeStatusBar } from '@/components/molecules/AutoModeStatusBar'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: string
  createdAt: string
  updatedAt: string
}

export interface KanbanColumnProps {
  columnId: UITaskStatus
  label: string
  tasks: Task[]
  autoModeState?: AutoModeColumnState
  autoProcessingTaskIds: Set<string>
  isValidDropTarget: boolean
  isDragging: boolean
  isHovering: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, taskId: string, status: UITaskStatus) => void
  onTaskClick: (taskId: string, status: UITaskStatus) => void
  onUpdateStatus: (taskId: string, status: UITaskStatus) => void
  onCancelRequest: (task: Task) => void
  onToggleAutoMode: () => void
  onDismissAutoModeError: () => void
  getNextStatus: (current: UITaskStatus) => UITaskStatus | null
}

export function KanbanColumn({
  columnId,
  label,
  tasks,
  autoModeState,
  autoProcessingTaskIds,
  isValidDropTarget: isValid,
  isDragging,
  isHovering,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onTaskClick,
  onUpdateStatus,
  onCancelRequest,
  onToggleAutoMode,
  onDismissAutoModeError,
  getNextStatus,
}: KanbanColumnProps) {
  const isAutoModeColumn = AUTO_MODE_COLUMNS.includes(columnId as any)

  return (
    <div
      className={`w-80 flex flex-col rounded-[2.5rem] border transition-all duration-200 shrink-0 ${
        isHovering && isValid
          ? 'border-blue-300 bg-blue-50/50'
          : isDragging && !isValid
          ? 'border-gray-200 bg-gray-50/30 opacity-50 cursor-not-allowed'
          : 'border-gray-100 bg-white/80'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-black text-sm text-[#0a192f] uppercase tracking-widest">{label}</h2>
          <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAutoModeColumn && autoModeState && (
            <AutoModeToggle
              enabled={autoModeState.enabled}
              status={autoModeState.status}
              onToggle={onToggleAutoMode}
            />
          )}
          <button className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-white rounded-xl shadow-sm">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-mode status bar */}
      {isAutoModeColumn && autoModeState && autoModeState.enabled && (
        <AutoModeStatusBar
          status={autoModeState.status}
          activeTaskTitle={
            autoModeState.activeTaskId
              ? tasks.find((t) => t.id === autoModeState.activeTaskId)?.title ?? null
              : null
          }
          error={autoModeState.error}
          onDismissError={onDismissAutoModeError}
        />
      )}
      {isAutoModeColumn && autoModeState && autoModeState.status === 'error' && !autoModeState.enabled && (
        <AutoModeStatusBar
          status={autoModeState.status}
          activeTaskTitle={null}
          error={autoModeState.error}
          onDismissError={onDismissAutoModeError}
        />
      )}

      <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            description={task.description}
            status={task.status}
            isAutoProcessing={autoProcessingTaskIds.has(task.id)}
            onDragStart={onDragStart}
            onClick={() => onTaskClick(task.id, task.status)}
            onUpdateStatus={onUpdateStatus}
            onCancelRequest={() => onCancelRequest(task)}
            getNextStatus={getNextStatus}
          />
        ))}

        {tasks.length === 0 && (
          <EmptyColumnPlaceholder columnId={columnId} isDropTarget={isHovering && isValid} />
        )}
      </div>
    </div>
  )
}

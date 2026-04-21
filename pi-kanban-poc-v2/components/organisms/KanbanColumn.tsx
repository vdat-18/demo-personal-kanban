'use client'

import { MoreHorizontal } from 'lucide-react'
import { TaskCard } from '@/components/molecules/TaskCard'
import { EmptyColumnPlaceholder } from '@/components/molecules/EmptyColumnPlaceholder'
import { AutoModeToggle } from '@/components/atoms/AutoModeToggle'
import { AutoModeStatusBar } from '@/components/molecules/AutoModeStatusBar'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'

/**
 * Kanban column.
 *
 * After Tier 1.4 / 4.13 the TODO column no longer exposes a column-level
 * "Auto mode" toggle — the breakdown agent is now triggered per-card via the
 * "✨ Break down" button on each TaskCard. The IN_PROGRESS / IN_REVIEW
 * columns still use the legacy column-level auto-mode flow, so we keep the
 * toggle + status bar conditional on `AUTO_MODE_COLUMNS` (which excludes TODO).
 */

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
  const isLegacyAutoModeColumn = AUTO_MODE_COLUMNS.includes(columnId)

  return (
    <div
      className={`w-80 flex flex-col rounded-[2.5rem] border transition-all duration-500 shrink-0 ${
        isHovering && isValid
          ? 'border-blue-300 bg-blue-50/70 shadow-2xl shadow-blue-500/10 scale-[1.02]'
          : isDragging && !isValid
          ? 'border-gray-200 bg-gray-100/30 opacity-50 cursor-not-allowed'
          : 'border-white bg-white/40 backdrop-blur-xl shadow-xl shadow-slate-200/40'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Column Header */}
      <div className="px-8 pt-10 pb-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="font-black text-[12px] text-[#0a192f] uppercase tracking-[0.25em]">{label}</h2>
          <span className="text-[10px] font-black text-blue-600 bg-white px-3 py-1.5 rounded-[0.8rem] shadow-sm border border-slate-50">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLegacyAutoModeColumn && autoModeState && (
            <AutoModeToggle
              enabled={autoModeState.enabled}
              status={autoModeState.status}
              onToggle={onToggleAutoMode}
            />
          )}
          <button className="text-gray-400 hover:text-black transition-all p-2.5 hover:bg-white rounded-2xl shadow-sm hover:shadow-md active:scale-90">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-mode status bar (legacy columns only) */}
      {isLegacyAutoModeColumn && autoModeState && autoModeState.enabled && (
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
      {isLegacyAutoModeColumn && autoModeState && autoModeState.status === 'error' && !autoModeState.enabled && (
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

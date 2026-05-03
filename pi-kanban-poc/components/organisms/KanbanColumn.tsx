'use client'

import { MoreHorizontal } from 'lucide-react'
import { TaskCard } from '@/components/molecules/TaskCard'
import { EmptyColumnPlaceholder } from '@/components/molecules/EmptyColumnPlaceholder'
import { AutoModeToggle } from '@/components/atoms/AutoModeToggle'
import { AutoModeStatusBar } from '@/components/molecules/AutoModeStatusBar'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'

const COLUMN_CONFIG: Record<UITaskStatus, { dot: string; strip: string; count: string }> = {
  TODO:        { dot: 'bg-slate-400',   strip: 'bg-slate-300',   count: 'bg-slate-50 text-slate-600 border-slate-200' },
  IN_PROGRESS: { dot: 'bg-blue-500',    strip: 'bg-blue-400',    count: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_REVIEW:   { dot: 'bg-amber-500',   strip: 'bg-amber-400',   count: 'bg-amber-50 text-amber-700 border-amber-200' },
  DONE:        { dot: 'bg-green-500',   strip: 'bg-green-400',   count: 'bg-green-50 text-green-700 border-green-200' },
  BLOCKED:     { dot: 'bg-red-400',     strip: 'bg-red-300',     count: 'bg-red-50 text-red-600 border-red-200' },
}

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
  const config = COLUMN_CONFIG[columnId]

  return (
    <div
      className={`w-80 flex flex-col rounded-[2.5rem] border transition-all duration-500 shrink-0 overflow-hidden ${
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
      {/* Color accent strip at top */}
      <div className={`h-1 w-full ${config.strip} shrink-0`} />

      {/* Column Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
          <h2 className="font-bold text-[11px] text-[#0a192f] uppercase tracking-[0.14em]">{label}</h2>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${config.count}`}>
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isLegacyAutoModeColumn && autoModeState && (
            <AutoModeToggle
              enabled={autoModeState.enabled}
              status={autoModeState.status}
              onToggle={onToggleAutoMode}
            />
          )}
          <button className="text-gray-300 hover:text-gray-600 transition-all p-2 hover:bg-white rounded-xl active:scale-90">
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

      <div className="p-4 overflow-y-auto flex flex-col gap-3 flex-1">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            description={task.description}
            status={task.status}
            priority={task.priority}
            dependsOnTaskIds={task.dependsOnTaskIds}
            blockedByTaskIds={task.blockedByTaskIds}
            runtimeState={task.runtimeState}
            runtimeLastAction={task.runtimeLastAction}
            runtimeNextAction={task.runtimeNextAction}
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

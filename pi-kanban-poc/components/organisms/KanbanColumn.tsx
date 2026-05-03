'use client'

import { MoreHorizontal } from 'lucide-react'
import { TaskCard } from '@/components/molecules/TaskCard'
import { EmptyColumnPlaceholder } from '@/components/molecules/EmptyColumnPlaceholder'
import { AutoModeToggle } from '@/components/atoms/AutoModeToggle'
import { AutoModeStatusBar } from '@/components/molecules/AutoModeStatusBar'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'
import { STATUS_DOT } from '@/constants/status'

const COLUMN_COUNT_CHIP: Record<UITaskStatus, string> = {
  TODO: 'bg-surface-muted text-ink-muted border-line',
  IN_PROGRESS: 'bg-info-bg text-info border-info-border',
  IN_REVIEW: 'bg-warning-bg text-warning border-warning-border',
  DONE: 'bg-success-bg text-success border-success-border',
  BLOCKED: 'bg-danger-bg text-danger border-danger-border',
}

const COLUMN_STRIP: Record<UITaskStatus, string> = {
  TODO:        'bg-gradient-to-r from-line-strong to-line',
  IN_PROGRESS: 'bg-gradient-to-r from-brand via-brand/80 to-brand/30',
  IN_REVIEW:   'bg-gradient-to-r from-spark via-spark/70 to-spark/20',
  DONE:        'bg-gradient-to-r from-success via-success/70 to-success/20',
  BLOCKED:     'bg-gradient-to-r from-danger via-danger/70 to-danger/20',
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
  const dot = STATUS_DOT[columnId]
  const countChip = COLUMN_COUNT_CHIP[columnId]
  const strip = COLUMN_STRIP[columnId]

  return (
    <div
      className={`flex-1 min-w-0 flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden bg-surface ${
        isHovering && isValid
          ? 'border-brand shadow-panel ring-2 ring-brand/15'
          : isDragging && !isValid
          ? 'border-line opacity-50 cursor-not-allowed'
          : 'border-line shadow-panel'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Status strip */}
      <div className={`h-[4px] w-full flex-none ${strip}`} />

      {/* Column header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
          <h2 className="text-micro text-ink">{label}</h2>
          <span className={`text-micro normal-case px-2 py-0.5 rounded-md border ${countChip}`}>
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isLegacyAutoModeColumn && autoModeState && (
            <AutoModeToggle
              enabled={autoModeState.enabled}
              status={autoModeState.status}
              onToggle={onToggleAutoMode}
            />
          )}
          <button className="text-ink-subtle hover:text-ink-muted transition-colors p-2 hover:bg-surface-muted rounded-lg active:scale-95">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-mode status bar */}
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

      <div className="p-3 overflow-y-auto flex flex-col gap-2.5 flex-1">
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

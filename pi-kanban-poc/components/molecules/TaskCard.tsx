'use client'

import { useMemo } from 'react'
import { ArrowRight, XCircle, RotateCcw, Sparkles } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { UITaskStatus } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-danger-bg text-danger border-danger-border',
  HIGH: 'bg-warning-bg text-warning border-warning-border',
  MEDIUM: 'bg-surface-muted text-ink-muted border-line',
  LOW: 'bg-surface-muted text-ink-subtle border-line',
}

export interface TaskCardProps {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority?: string
  dependsOnTaskIds?: string[]
  blockedByTaskIds?: string[]
  runtimeState?: string
  runtimeLastAction?: string | null
  runtimeNextAction?: string | null
  onDragStart: (e: React.DragEvent, taskId: string, status: UITaskStatus) => void
  onClick: () => void
  onUpdateStatus: (taskId: string, status: UITaskStatus) => void
  onCancelRequest: () => void
  getNextStatus: (current: UITaskStatus) => UITaskStatus | null
}

export function TaskCard({
  id,
  title,
  description,
  status,
  priority,
  dependsOnTaskIds = [],
  blockedByTaskIds = [],
  runtimeState,
  runtimeLastAction,
  runtimeNextAction,
  onDragStart,
  onClick,
  onUpdateStatus,
  onCancelRequest,
  getNextStatus,
}: TaskCardProps) {
  const allTasks = useKanbanStore((s) => s.tasks)
  const taskRecord = useMemo(() => allTasks.find((t) => t.id === id), [allTasks, id])
  const restoreStatus: UITaskStatus =
    (taskRecord?.statusBeforeBlocked as UITaskStatus | undefined) ?? 'TODO'

  const isCardActive = status === 'IN_PROGRESS'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, id, status)}
      onClick={onClick}
      className={`bg-surface p-4 rounded-2xl border transition-all duration-200 group relative select-none cursor-pointer ${
        status === 'BLOCKED'
          ? 'opacity-60 bg-surface-muted/40 border-line shadow-card'
          : 'border-line shadow-card hover:shadow-card-hover hover:-translate-y-1'
      } ${isCardActive ? 'border-brand/30 ring-2 ring-brand/10' : ''}`}
    >
      {/* Status indicator strip */}
      <div
        className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full transition-colors ${
          status === 'DONE'
            ? 'bg-success'
            : status === 'IN_PROGRESS'
            ? 'bg-brand'
            : status === 'IN_REVIEW'
            ? 'bg-spark'
            : status === 'BLOCKED'
            ? 'bg-danger'
            : 'bg-line-strong'
        }`}
      />

      <div className="flex flex-col gap-2.5 pl-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusPill status={status} />
          {priority && priority !== 'MEDIUM' && (
            <span
              className={`text-micro normal-case px-2 py-0.5 rounded-md border ${
                PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.LOW
              }`}
            >
              {priority.charAt(0) + priority.slice(1).toLowerCase()}
            </span>
          )}
          {status === 'TODO' && (
            <span className="inline-flex items-center gap-1 text-micro normal-case px-2 py-0.5 rounded-md bg-brand-subtle text-brand border border-brand-border">
              <Sparkles className="w-2.5 h-2.5" />
              Plan in chat
            </span>
          )}
        </div>

        <h3
          className={`text-h2 font-bold leading-snug pr-4 ${
            status === 'BLOCKED'
              ? 'text-ink-subtle line-through'
              : 'text-ink group-hover:text-brand transition-colors'
          }`}
        >
          {title}
        </h3>

        {/* Hover actions */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200">
          {status === 'BLOCKED' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUpdateStatus(id, restoreStatus)
              }}
              className="w-8 h-8 rounded-lg bg-success-bg hover:bg-success hover:text-white text-success flex items-center justify-center transition-colors shadow-sm active:scale-95"
              title={`Restore to ${restoreStatus}`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {getAllowedTransitions(status as TaskStatusValue).includes('BLOCKED') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancelRequest()
              }}
              className="w-8 h-8 rounded-lg bg-danger-bg hover:bg-danger hover:text-white text-danger flex items-center justify-center transition-colors shadow-sm active:scale-95"
              title="Block task"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {getNextStatus(status) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const next = getNextStatus(status)
                if (next) onUpdateStatus(id, next)
              }}
              className="w-8 h-8 rounded-lg bg-surface-muted hover:bg-ink hover:text-white text-ink-muted flex items-center justify-center transition-colors shadow-sm active:scale-95"
              title="Move forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {description && status !== 'BLOCKED' && (
          <p className="text-meta text-ink-muted leading-relaxed max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300">
            {description}
          </p>
        )}

        {(dependsOnTaskIds.length > 0 ||
          blockedByTaskIds.length > 0 ||
          runtimeNextAction ||
          runtimeLastAction) && (
          <div className="pt-2 border-t border-line space-y-1">
            {dependsOnTaskIds.length > 0 && (
              <p className="text-meta text-ink-subtle">
                Depends on {dependsOnTaskIds.length} task{dependsOnTaskIds.length === 1 ? '' : 's'}
              </p>
            )}
            {blockedByTaskIds.length > 0 && (
              <p className="text-meta text-warning">
                Blocked by {blockedByTaskIds.length} task{blockedByTaskIds.length === 1 ? '' : 's'}
              </p>
            )}
            {runtimeState && runtimeState.toLowerCase() !== 'idle' && (
              <p className="text-meta text-brand font-semibold">{runtimeState}</p>
            )}
            {runtimeLastAction && (
              <p className="text-meta text-ink-muted leading-relaxed">Last: {runtimeLastAction}</p>
            )}
            {runtimeNextAction && (
              <p className="text-meta text-ink leading-relaxed font-medium">
                Next: {runtimeNextAction}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { ArrowRight, XCircle, RotateCcw, Sparkles, MessageSquare } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { UITaskStatus } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

/**
 * Task card for Kanban board.
 *
 * Displays task title and status. Description is visible on hover.
 * Subtasks and detailed planning are accessible by clicking the task
 * to open the task chat/detail view.
 */

export interface TaskCardProps {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
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
  onDragStart,
  onClick,
  onUpdateStatus,
  onCancelRequest,
  getNextStatus,
}: TaskCardProps) {
  const allTasks = useKanbanStore((s) => s.tasks)

  const hintDismissedOnTask = useMemo(
    () => allTasks.find((t) => t.id === id)?.hintDismissed ?? false,
    [allTasks, id],
  )

  const isCardActive = status === 'IN_PROGRESS'
  const isBusyUI = false

  return (
    <div
      draggable={!isBusyUI}
      onDragStart={(e) => {
        if (isBusyUI) { e.preventDefault(); return }
        onDragStart(e, id, status)
      }}
      onClick={() => {
        if (isBusyUI) return
        onClick()
      }}
      className={`bg-white p-6 rounded-[2rem] shadow-sm border border-white transition-all group relative select-none ${
        isBusyUI
          ? 'ring-2 ring-violet-300 border-violet-200 shadow-2xl shadow-violet-100 cursor-default'
          : status === 'BLOCKED'
          ? 'opacity-60 cursor-default bg-slate-50/50'
          : 'hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer hover:-translate-y-1'
      } ${!isBusyUI && isCardActive ? 'ring-2 ring-blue-100 shadow-2xl shadow-blue-500/10' : ''}`}
    >
      {/* Status indicator line */}
      <div
        className={`absolute left-0 top-7 bottom-7 w-1.5 rounded-r-full transition-colors duration-500 ${
          status === 'DONE'
            ? 'bg-green-400'
            : status === 'IN_PROGRESS'
            ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
            : status === 'BLOCKED'
            ? 'bg-red-400'
            : 'bg-slate-200'
        }`}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          {status === 'TODO' && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Plan in chat
            </span>
          )}
        </div>

        <h3
          className={`font-black text-[15px] tracking-tight leading-snug pr-4 ${
            isBusyUI
              ? 'text-violet-700'
              : status === 'BLOCKED'
              ? 'text-gray-400 line-through'
              : 'text-[#0a192f] group-hover:text-blue-600 transition-colors'
          }`}
        >
          {title}
        </h3>

        {/* Hover actions (status transitions) */}
        <div className="absolute top-5 right-5 flex items-center gap-2 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          {status === 'BLOCKED' && getAllowedTransitions(status as TaskStatusValue).includes('TODO') && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(id, 'TODO') }}
              className="w-9 h-9 rounded-[1rem] bg-green-50 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Restore task"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {getAllowedTransitions(status as TaskStatusValue).includes('BLOCKED') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelRequest() }}
              className="w-9 h-9 rounded-[1rem] bg-red-50 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Cancel task"
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
              className="w-9 h-9 rounded-[1rem] bg-slate-50 hover:bg-[#0a192f] text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Move forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {description && status !== 'BLOCKED' && (
          <p className="text-xs text-slate-400 leading-relaxed font-medium max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

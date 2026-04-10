'use client'

import { ArrowRight, XCircle, RotateCcw } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import type { UITaskStatus } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

export interface TaskCardProps {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  isAutoProcessing?: boolean
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
  isAutoProcessing = false,
  onDragStart,
  onClick,
  onUpdateStatus,
  onCancelRequest,
  getNextStatus,
}: TaskCardProps) {
  return (
    <div
      draggable={!isAutoProcessing}
      onDragStart={(e) => {
        if (isAutoProcessing) { e.preventDefault(); return }
        onDragStart(e, id, status)
      }}
      onClick={() => {
        if (isAutoProcessing) return
        onClick()
      }}
      className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-b-4 transition-all group relative select-none ${
        isAutoProcessing
          ? 'ring-2 ring-violet-300 border-violet-200 shadow-lg shadow-violet-100/50 cursor-default'
          : status === 'BLOCKED'
          ? 'opacity-60 cursor-default border-red-100'
          : 'hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 cursor-pointer'
      } ${!isAutoProcessing && status === 'IN_PROGRESS' ? 'ring-2 ring-blue-100 border-blue-200 shadow-lg' : ''}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          {isAutoProcessing && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md tracking-[0.15em] uppercase bg-violet-50 text-violet-600 border border-violet-200 animate-pulse">
              Auto-processing
            </span>
          )}
        </div>
        <h3 className={`font-bold text-sm leading-snug pr-4 ${
          isAutoProcessing
            ? 'text-violet-700'
            : status === 'BLOCKED' ? 'text-gray-400 line-through' : 'text-[#0a192f] group-hover:text-blue-600 transition-colors'
        }`}>
          {title}
        </h3>

        {/* Hover actions */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          {status === 'BLOCKED' && getAllowedTransitions(status as TaskStatusValue).includes('TODO') && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(id, 'TODO') }}
              className="w-8 h-8 rounded-full bg-green-50 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-md"
              title="Restore task"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {getAllowedTransitions(status as TaskStatusValue).includes('BLOCKED') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelRequest() }}
              className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all shadow-md"
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
              className="w-8 h-8 rounded-full bg-slate-50 hover:bg-[#0a192f] text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md"
              title="Move forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {description && status !== 'BLOCKED' && (
        <p className="text-[11px] text-gray-500 leading-relaxed font-medium mt-3 line-clamp-2">
          {description}
        </p>
      )}
    </div>
  )
}

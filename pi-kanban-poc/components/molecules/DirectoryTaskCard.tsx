'use client'

import type { UITaskStatus } from '@/types/domain'
import { STATUS_DOT } from '@/constants/status'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const STATUS_LABEL: Record<UITaskStatus, string> = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  DONE:        'Done',
  BLOCKED:     'Blocked',
}

const STATUS_STRIP: Record<UITaskStatus, string> = {
  TODO:        'bg-gradient-to-b from-line-strong to-line',
  IN_PROGRESS: 'bg-gradient-to-b from-brand via-brand/80 to-brand/30',
  IN_REVIEW:   'bg-gradient-to-b from-spark via-spark/70 to-spark/20',
  DONE:        'bg-gradient-to-b from-success via-success/70 to-success/20',
  BLOCKED:     'bg-gradient-to-b from-danger via-danger/70 to-danger/20',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-red-50 text-red-600 border-red-200',
  HIGH:   'bg-orange-50 text-orange-600 border-orange-200',
  MEDIUM: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  LOW:    'bg-surface-muted text-ink-muted border-line',
}

export interface DirectoryTaskCardProps {
  id: string
  title: string
  description?: string | null
  status: UITaskStatus
  priority: TaskPriority
  projectName: string
  onClick: () => void
}

export function DirectoryTaskCard({ title, description, status, priority, projectName, onClick }: DirectoryTaskCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-surface rounded-2xl border border-line shadow-card cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200 group overflow-hidden relative"
    >
      {/* Gradient left strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${STATUS_STRIP[status]}`} />

      <div className="p-4 pl-5">
        {/* Breadcrumb */}
        <p className="text-meta text-ink-subtle mb-2 truncate">{projectName}</p>

        {/* Title */}
        <h3 className="font-bold text-body text-ink group-hover:text-brand transition-colors leading-snug mb-1.5 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-meta text-ink-muted line-clamp-2 mb-3 leading-relaxed">{description}</p>
        )}

        {/* Footer: status + priority */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-line">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
            <span className="text-meta text-ink-muted">{STATUS_LABEL[status]}</span>
          </div>
          <span className={`text-micro normal-case px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[priority]}`}>
            {priority.charAt(0) + priority.slice(1).toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

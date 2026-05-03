'use client'

import { ArrowRight } from 'lucide-react'
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

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-red-50 text-red-600 border-red-200',
  HIGH:   'bg-orange-50 text-orange-600 border-orange-200',
  MEDIUM: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  LOW:    'bg-surface-muted text-ink-muted border-line',
}

export interface DirectoryTaskRowProps {
  id: string
  title: string
  description?: string | null
  status: UITaskStatus
  priority: TaskPriority
  projectName: string
  onClick: () => void
  showBorder?: boolean
}

export function DirectoryTaskRow({ title, description, status, priority, projectName, onClick, showBorder = false }: DirectoryTaskRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-surface-muted transition-colors ${showBorder ? 'border-t border-line' : ''}`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
        <span className="text-meta text-ink-muted truncate">{STATUS_LABEL[status]}</span>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p className="text-meta text-ink-subtle mb-0.5 truncate">{projectName}</p>
        <p className="font-medium text-sm text-ink truncate">{title}</p>
        {description && (
          <p className="text-meta text-ink-subtle truncate mt-0.5">{description}</p>
        )}
      </div>

      {/* Priority + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-micro normal-case px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[priority]}`}>
          {priority.charAt(0) + priority.slice(1).toLowerCase()}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-ink-subtle/30" />
      </div>
    </div>
  )
}

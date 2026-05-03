'use client'

import { ArrowRight } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const STATUS_DOT: Record<UITaskStatus, string> = {
  TODO:        'bg-slate-300',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW:   'bg-amber-400',
  DONE:        'bg-green-500',
  BLOCKED:     'bg-red-400',
}

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
  LOW:    'bg-slate-50 text-slate-400 border-slate-200',
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
      className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
    >
      {/* Breadcrumb */}
      <p className="text-[10px] text-slate-400 mb-2 truncate">{projectName}</p>

      {/* Title */}
      <h3 className="font-semibold text-[14px] text-[#0a192f] group-hover:text-blue-600 transition-colors leading-snug mb-1.5 line-clamp-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[12px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">{description}</p>
      )}

      {/* Footer: status + priority */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-50">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
          <span className="text-[11px] text-slate-500">{STATUS_LABEL[status]}</span>
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[priority]}`}>
          {priority.charAt(0) + priority.slice(1).toLowerCase()}
        </span>
      </div>
    </div>
  )
}

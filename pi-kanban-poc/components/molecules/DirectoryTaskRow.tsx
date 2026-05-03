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
      className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors ${showBorder ? 'border-t border-gray-100' : ''}`}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 w-24 shrink-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
        <span className="text-[11px] text-slate-500 truncate">{STATUS_LABEL[status]}</span>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 mb-0.5 truncate">{projectName}</p>
        <p className="font-medium text-sm text-[#0a192f] truncate">{title}</p>
        {description && (
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{description}</p>
        )}
      </div>

      {/* Priority + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[priority]}`}>
          {priority.charAt(0) + priority.slice(1).toLowerCase()}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
      </div>
    </div>
  )
}

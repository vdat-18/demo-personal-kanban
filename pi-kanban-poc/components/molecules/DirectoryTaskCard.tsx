'use client'

import { ArrowRight } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  URGENT: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-slate-100 text-slate-500 border-slate-200',
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
      className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={status} />
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${PRIORITY_COLORS[priority]}`}>
            {priority}
          </span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-500 transition-colors shrink-0" />
      </div>
      <h3 className="font-bold text-sm text-[#0a192f] group-hover:text-blue-600 transition-colors mb-1 line-clamp-2">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{description}</p>
      )}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{projectName}</p>
    </div>
  )
}

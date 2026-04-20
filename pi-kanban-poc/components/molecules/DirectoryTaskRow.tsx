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
      className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${showBorder ? 'border-t border-gray-50' : ''}`}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <StatusPill status={status} className="w-24 text-center shrink-0" />
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${PRIORITY_COLORS[priority]}`}>
          {priority}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm text-[#0a192f] truncate">{title}</p>
          {description && (
            <p className="text-xs text-slate-400 truncate mt-0.5">{description}</p>
          )}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{projectName}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 ml-3" />
    </div>
  )
}

'use client'

import { ArrowRight } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import type { UITaskStatus } from '@/types/domain'

export interface DirectoryTaskCardProps {
  id: string
  title: string
  status: UITaskStatus
  projectName: string
  onClick: () => void
}

export function DirectoryTaskCard({ title, status, projectName, onClick }: DirectoryTaskCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <StatusPill status={status} />
        <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-500 transition-colors" />
      </div>
      <h3 className="font-bold text-sm text-[#0a192f] group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
        {title}
      </h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{projectName}</p>
    </div>
  )
}

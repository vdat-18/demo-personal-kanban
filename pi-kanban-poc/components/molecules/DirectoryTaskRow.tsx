'use client'

import { ArrowRight } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import type { UITaskStatus } from '@/types/domain'

export interface DirectoryTaskRowProps {
  id: string
  title: string
  status: UITaskStatus
  projectName: string
  onClick: () => void
  showBorder?: boolean
}

export function DirectoryTaskRow({ title, status, projectName, onClick, showBorder = false }: DirectoryTaskRowProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors ${showBorder ? 'border-t border-gray-50' : ''}`}
    >
      <div className="flex items-center gap-4">
        <StatusPill status={status} className="w-20 text-center" />
        <div>
          <p className="font-bold text-sm text-[#0a192f]">{title}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{projectName}</p>
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300" />
    </div>
  )
}

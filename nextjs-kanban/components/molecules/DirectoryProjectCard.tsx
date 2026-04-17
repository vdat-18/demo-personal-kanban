'use client'

import { ArrowRight } from 'lucide-react'
import { ProgressBar } from '@/components/atoms/ProgressBar'

export interface DirectoryProjectCardProps {
  id: string
  name: string
  taskCount: number
  doneCount: number
  onClick: () => void
}

export function DirectoryProjectCard({ name, taskCount, doneCount, onClick }: DirectoryProjectCardProps) {
  const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-black text-[#0a192f] group-hover:text-blue-600 transition-colors">{name}</h3>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>{taskCount} tasks</span>
        <span>{doneCount} done</span>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={progress}
          className="h-1.5"
          trackClassName="bg-gray-100 border-0"
          barClassName="bg-gradient-to-r from-blue-500 to-indigo-600"
        />
      </div>
    </div>
  )
}

'use client'

import { ArrowRight, Calendar, Package } from 'lucide-react'
import { ProgressBar } from '@/components/atoms/ProgressBar'
import { getPlaybook } from '@/lib/planning/playbooks'
import type { PlaybookId } from '@/types/domain'

export interface DirectoryProjectCardProps {
  id: string
  name: string
  description?: string | null
  taskCount: number
  doneCount: number
  createdAt?: string
  artifactCount?: number
  playbookId?: PlaybookId
  importedSourceCount?: number
  onClick: () => void
}

export function DirectoryProjectCard({
  name,
  description,
  taskCount,
  doneCount,
  createdAt,
  artifactCount,
  playbookId,
  importedSourceCount = 0,
  onClick,
}: DirectoryProjectCardProps) {
  const progress = taskCount > 0 ? (doneCount / taskCount) * 100 : 0
  const playbook = getPlaybook(playbookId)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-black text-[#0a192f] group-hover:text-blue-600 transition-colors leading-tight line-clamp-2 flex-1 min-w-0 mr-2">
          {name}
        </h3>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors shrink-0 mt-0.5" />
      </div>

      {description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {playbook.label}
        </span>
        {importedSourceCount > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
            {importedSourceCount} source{importedSourceCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        <span className="font-semibold">
          {doneCount}/{taskCount} tasks done
        </span>
        {artifactCount != null && artifactCount > 0 && (
          <span className="flex items-center gap-1 text-indigo-500 font-semibold">
            <Package className="w-3 h-3" />
            {artifactCount} artifact{artifactCount === 1 ? '' : 's'}
          </span>
        )}
        {createdAt && (
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="w-3 h-3" />
            {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <ProgressBar
        value={progress}
        className="h-1.5"
        trackClassName="bg-gray-100 border-0"
        barClassName={
          progress === 100
            ? 'bg-gradient-to-r from-emerald-400 to-green-500'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }
      />
    </div>
  )
}

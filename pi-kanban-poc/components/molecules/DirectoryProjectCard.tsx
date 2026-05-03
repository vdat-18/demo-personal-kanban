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
      className="bg-surface rounded-3xl border border-line shadow-card cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all group overflow-hidden"
    >
      {/* Brand top strip — gradient, same visual language as kanban columns */}
      <div className="h-[4px] bg-gradient-to-r from-brand via-brand/80 to-brand/20 w-full" />
      <div className="p-6">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-ink group-hover:text-brand transition-colors leading-tight line-clamp-2 flex-1 min-w-0 mr-2">
          {name}
        </h3>
        <ArrowRight className="w-4 h-4 text-ink-subtle/40 group-hover:text-brand transition-colors shrink-0 mt-0.5" />
      </div>

      {description && (
        <p className="text-meta text-ink-subtle mb-3 line-clamp-2 leading-relaxed">{description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-lg bg-surface-muted border border-line text-micro text-ink-muted">
          {playbook.label}
        </span>
        {importedSourceCount > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-brand-subtle border border-brand-border text-micro text-brand">
            {importedSourceCount} source{importedSourceCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-meta text-ink-subtle mb-3">
        <span className="font-semibold">
          {doneCount}/{taskCount} tasks done
        </span>
        {artifactCount != null && artifactCount > 0 && (
          <span className="flex items-center gap-1 text-brand font-semibold">
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
        trackClassName="bg-surface-muted border-0"
        barClassName={progress === 100 ? 'bg-success' : 'bg-brand'}
      />
      </div>
    </div>
  )
}

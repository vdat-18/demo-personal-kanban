'use client'

import { Trash2, PlayCircle, Compass, Sparkles } from 'lucide-react'
import { getPlaybook } from '@/lib/planning/playbooks'
import type { PlanningStatus, PlaybookId } from '@/types/domain'

export interface ProjectCardProps {
  id: string
  name: string
  status: string
  planningStatus?: PlanningStatus
  playbookId?: PlaybookId
  importedSourceCount?: number
  tasks: Array<{ id: string; status: string }>
  onClick: () => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

const PLANNING_BADGE: Record<
  PlanningStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  not_started: {
    label: 'Just created',
    className: 'bg-surface-muted text-ink-muted border-line',
    icon: Sparkles,
  },
  in_progress: {
    label: 'Planning',
    className: 'bg-warning-bg text-warning border-warning-border',
    icon: Compass,
  },
  completed: {
    label: 'Active',
    className: 'bg-success-bg text-success border-success-border',
    icon: PlayCircle,
  },
}

export function ProjectCard({
  id,
  name,
  planningStatus = 'not_started',
  playbookId,
  importedSourceCount = 0,
  tasks,
  onClick,
  onDelete,
}: ProjectCardProps) {
  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length || 0
  const totalTasks = tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const badge = PLANNING_BADGE[planningStatus]
  const Icon = badge.icon
  const playbook = getPlaybook(playbookId)
  const destinationHint =
    planningStatus === 'completed'
      ? 'Opens task board'
      : planningStatus === 'in_progress'
      ? 'Resume planning'
      : 'Start planning'

  return (
    <div
      onClick={onClick}
      title={destinationHint}
      className="bg-surface p-5 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group border border-line/70"
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-micro border ${badge.className}`}
        >
          <Icon className="w-3 h-3" />
          {badge.label}
          {planningStatus === 'completed' && totalTasks > 0 && (
            <span className="ml-0.5 opacity-70">· {totalTasks}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-ink border-2 border-surface shadow-sm z-10" />
            <div className="w-7 h-7 rounded-full bg-brand border-2 border-surface flex items-center justify-center text-meta font-bold text-white shadow-sm z-20">
              AI
            </div>
          </div>
          <button
            onClick={(e) => onDelete(e, id)}
            className="p-1.5 ml-1 rounded-lg text-ink-subtle hover:text-danger hover:bg-danger-bg transition-colors opacity-0 group-hover:opacity-100 active:scale-95"
            aria-label="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-h2 mb-1 text-ink line-clamp-2 leading-snug group-hover:text-brand transition-colors">
        {name}
      </h3>

      <p className="text-meta text-ink-subtle mb-4">→ {destinationHint}</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-lg bg-surface-muted border border-line text-micro text-ink-muted">
          {playbook.label}
        </span>
        {importedSourceCount > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-brand-subtle border border-brand-border text-micro text-brand">
            {importedSourceCount} source{importedSourceCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-micro text-ink-muted">
          <span>Completion</span>
          <span className="text-ink">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

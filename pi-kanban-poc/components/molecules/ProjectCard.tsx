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

const PLANNING_BADGE: Record<PlanningStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: {
    label: 'Just created',
    className: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: Sparkles,
  },
  in_progress: {
    label: 'Planning',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Compass,
  },
  completed: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: PlayCircle,
  },
}

export function ProjectCard({ id, name, status, planningStatus = 'not_started', playbookId, importedSourceCount = 0, tasks, onClick, onDelete }: ProjectCardProps) {
  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length || 0
  const totalTasks = tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const badge = PLANNING_BADGE[planningStatus]
  const Icon = badge.icon
  const playbook = getPlaybook(playbookId)
  const destinationHint =
    planningStatus === 'completed'
      ? 'Opens Kanban board'
      : planningStatus === 'in_progress'
      ? 'Resume planning'
      : 'Start planning'

  return (
    <div
      onClick={onClick}
      title={destinationHint}
      className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group border border-slate-100"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] border ${badge.className}`}>
          <Icon className="w-3 h-3" />
          {badge.label}
          {planningStatus === 'completed' && totalTasks > 0 && (
            <span className="ml-0.5 opacity-70">· {totalTasks}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-white shadow z-10" />
            <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow z-20">
              AI
            </div>
          </div>
          <button
            onClick={(e) => onDelete(e, id)}
            className="p-1.5 ml-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
            aria-label="Delete project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-base font-bold mb-1 text-[#0a192f] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors tracking-tight">
        {name}
      </h3>

      <p className="text-[10px] text-slate-400 font-semibold mb-4 uppercase tracking-wider">
        → {destinationHint}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {playbook.label}
        </span>
        {importedSourceCount > 0 && (
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
            {importedSourceCount} source{importedSourceCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">
          <span>Completion</span>
          <span className="text-[#0a192f]">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

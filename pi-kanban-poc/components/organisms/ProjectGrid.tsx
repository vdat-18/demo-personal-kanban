'use client'

import { Clock, Layout } from 'lucide-react'
import { ProjectCard } from '@/components/molecules/ProjectCard'
import type { PlanningStatus, PlaybookId } from '@/types/domain'

interface Project {
  id: string
  name: string
  description?: string | null
  domain?: string
  status: string
  planningStatus?: PlanningStatus
  playbookId?: PlaybookId
  importedSourceCount?: number
  createdAt: string
  tasks: Array<{ id: string; status: string }>
}

export interface ProjectGridProps {
  projects: Project[]
  onProjectClick: (id: string) => void
  onDeleteProject: (e: React.MouseEvent, id: string) => void
}

export function ProjectGrid({ projects, onProjectClick, onDeleteProject }: ProjectGridProps) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out">
      <div className="flex justify-between items-end mb-6 px-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
              Project History
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#0a192f] tracking-tight">
            Your recent journeys
          </h2>
        </div>
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.18em] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
          {projects.length > 0 ? `${projects.length} projects` : 'Ready'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-white/60 rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-blue-400 mb-4">
              <Layout className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-[#0a192f] mb-1">
              Your journeys will appear here
            </p>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Start a new project and let AI help you plan and execute it.
            </p>
          </div>
        ) : (
          projects.slice(0, 6).map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              status={project.status}
              planningStatus={project.planningStatus ?? 'not_started'}
              playbookId={project.playbookId}
              importedSourceCount={project.importedSourceCount ?? 0}
              tasks={project.tasks}
              onClick={() => onProjectClick(project.id)}
              onDelete={onDeleteProject}
            />
          ))
        )}
      </div>
    </section>
  )
}

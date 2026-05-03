'use client'

import { Clock, Layout } from 'lucide-react'
import { ProjectCard } from '@/components/molecules/ProjectCard'
import type { PlanningStatus, PlaybookId } from '@/types/domain'
import { useI18n } from '@/lib/i18n/context'

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
  const { t } = useI18n()
  return (
    <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 ease-out">
      <div className="flex justify-between items-end mb-6 px-1">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-brand" />
            <span className="text-micro text-ink-muted">
              {t('dashboard.projectHistory', 'Project history')}
            </span>
          </div>
          <h2 className="text-h1 text-ink">
            {t('dashboard.recentJourneys', 'Your recent projects')}
          </h2>
        </div>
        <span className="text-micro text-brand bg-brand-subtle px-2.5 py-1 rounded-full border border-brand-border">
          {projects.length > 0
            ? t('dashboard.projectsCount', `${projects.length} projects`)
            : t('dashboard.ready', 'Ready')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-surface/60 rounded-2xl border border-line shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-surface shadow-sm flex items-center justify-center text-brand mb-4">
              <Layout className="w-7 h-7" />
            </div>
            <p className="text-h2 text-ink mb-1">
              {t('dashboard.journeysEmptyTitle', 'Your projects will appear here')}
            </p>
            <p className="text-body text-ink-muted text-center max-w-xs">
              {t(
                'dashboard.journeysEmptyDescription',
                'Start a new project and let AI help you plan and execute it.',
              )}
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

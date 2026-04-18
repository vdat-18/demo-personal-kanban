'use client'

import { Clock, Layout } from 'lucide-react'
import { ProjectCard } from '@/components/molecules/ProjectCard'

interface Project {
  id: string
  name: string
  description?: string | null
  domain?: string
  status: string
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
    <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
      <div className="flex justify-between items-end mb-8 px-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">History</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Recent Projects</h2>
        </div>
        <span className="text-xs font-black text-blue-600 uppercase tracking-widest">
          {projects.length > 0 ? `${projects.length} total` : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {projects.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white/40 rounded-[64px] border border-white shadow-inner">
            <div className="w-24 h-24 rounded-[40px] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-blue-400 mb-8">
              <Layout className="w-10 h-10" />
            </div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-2">
              Your journeys will appear here
            </p>
            <p className="text-xs text-slate-400 text-center max-w-[200px] leading-relaxed">
              Bắt đầu một dự án mới để AI giúp bạn lên kế hoạch nhé!
            </p>
          </div>
        ) : (
          projects.slice(0, 6).map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              status={project.status}
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

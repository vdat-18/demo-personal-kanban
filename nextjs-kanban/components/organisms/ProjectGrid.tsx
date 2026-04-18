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
    <section className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500 ease-out">
      <div className="flex justify-between items-end mb-12 px-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Project History</span>
          </div>
          <h2 className="text-5xl font-black text-[#0a192f] tracking-tighter">Your recent journeys</h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full border border-blue-100 shadow-sm">
            {projects.length > 0 ? `${projects.length} PROJECTS` : 'READY'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {projects.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center bg-white/40 rounded-[5rem] border border-white shadow-2xl shadow-slate-200/20 backdrop-blur-sm">
            <div className="w-28 h-28 rounded-[3rem] bg-white shadow-2xl shadow-slate-200 flex items-center justify-center text-blue-400 mb-10 transition-transform hover:scale-105 duration-700">
              <Layout className="w-12 h-12" />
            </div>
            <p className="text-sm font-black text-[#0a192f] uppercase tracking-[0.25em] text-center mb-4">
              Your journeys will appear here
            </p>
            <p className="text-base text-slate-400 text-center max-w-xs leading-relaxed font-medium">
              Bắt đầu một dự án mới để AI giúp bạn lên kế hoạch và thực thi nhé!
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

'use client'

import { DirectoryProjectCard } from '@/components/molecules/DirectoryProjectCard'

interface Project {
  id: string
  name: string
  tasks: Array<{ id: string; status: string }>
}

export interface DirectoryProjectGridProps {
  projects: Project[]
  onProjectClick: (id: string) => void
}

export function DirectoryProjectGrid({ projects, onProjectClick }: DirectoryProjectGridProps) {
  return (
    <section>
      <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => (
          <DirectoryProjectCard
            key={p.id}
            id={p.id}
            name={p.name}
            taskCount={p.tasks.length}
            doneCount={p.tasks.filter((t) => t.status === 'DONE').length}
            onClick={() => onProjectClick(p.id)}
          />
        ))}
      </div>
    </section>
  )
}

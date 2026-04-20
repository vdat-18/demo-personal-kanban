'use client'

import { DirectoryProjectCard } from '@/components/molecules/DirectoryProjectCard'

interface Project {
  id: string
  name: string
  description?: string | null
  createdAt?: string
  tasks: Array<{ id: string; status: string }>
  artifactCount?: number
}

export interface DirectoryProjectGridProps {
  projects: Project[]
  onProjectClick: (id: string) => void
}

export function DirectoryProjectGrid({ projects, onProjectClick }: DirectoryProjectGridProps) {
  if (projects.length === 0) {
    return (
      <section>
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Projects</h2>
        <div className="py-20 text-center">
          <p className="text-sm font-bold text-gray-300">No projects found.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
        Projects ({projects.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => (
          <DirectoryProjectCard
            key={p.id}
            id={p.id}
            name={p.name}
            description={p.description}
            taskCount={p.tasks.length}
            doneCount={p.tasks.filter((t) => t.status === 'DONE').length}
            createdAt={p.createdAt}
            artifactCount={p.artifactCount}
            onClick={() => onProjectClick(p.id)}
          />
        ))}
      </div>
    </section>
  )
}

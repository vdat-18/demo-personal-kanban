'use client'

import { useEffect, useMemo, use } from 'react'
import { notFound } from 'next/navigation'
import { MissionControlTemplate } from '@/components/templates/MissionControlTemplate'
import { useProject } from '@/lib/hooks/useProjects'
import { useStoreHydrated, useKanbanStore } from '@/lib/storage/kanbanStore'

interface Props {
  params: Promise<{ id: string }>
}

export default function MissionControlPage({ params }: Props) {
  const { id } = use(params)
  const hydrated = useStoreHydrated()
  const { data: project } = useProject(id)
  const tasks = useKanbanStore((s) => s.tasks)

  const serialized = useMemo(() => {
    if (!project) return null
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      tasks: tasks
        .filter((t) => t.projectId === project.id)
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
    }
  }, [project, tasks])

  useEffect(() => {
    if (hydrated && !project) notFound()
  }, [hydrated, project])

  if (!hydrated || !serialized) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading mission control…
      </div>
    )
  }

  return <MissionControlTemplate project={serialized} />
}

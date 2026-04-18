'use client'

import { useMemo } from 'react'
import { DirectoryTemplate } from '@/components/templates/DirectoryTemplate'
import { useProjects } from '@/lib/hooks/useProjects'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

export default function DirectoryPage() {
  const { data: projects = [] } = useProjects()
  const tasks = useKanbanStore((s) => s.tasks)

  const enriched = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status ?? 'planning',
        createdAt: p.createdAt,
        tasks: tasks
          .filter((t) => t.projectId === p.id)
          .map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
          })),
      })),
    [projects, tasks],
  )

  return <DirectoryTemplate projects={enriched} />
}

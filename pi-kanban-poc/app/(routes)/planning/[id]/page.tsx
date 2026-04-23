'use client'

import { useEffect, useMemo, use } from 'react'
import { notFound } from 'next/navigation'
import { PlanningClient } from '@/components/planning/PlanningClient'
import { useProject } from '@/lib/hooks/useProjects'
import { useStoreHydrated } from '@/lib/storage/kanbanStore'

interface Props {
  params: Promise<{ id: string }>
}

export default function PlanningPage({ params }: Props) {
  const { id } = use(params)
  const hydrated = useStoreHydrated()
  const { data: project } = useProject(id)

  const serialized = useMemo(() => {
    if (!project) return null
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      playbookId: project.playbookId,
      importedSources: project.importedSources,
      userContext: project.userContext,
      tasks: (project.tasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        description: null as string | null,
        status: t.status,
        priority: t.priority,
      })),
    }
  }, [project])

  // Wait for localStorage hydration before deciding "not found"
  useEffect(() => {
    if (hydrated && !project) notFound()
  }, [hydrated, project])

  if (!hydrated || !serialized) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading project…
      </div>
    )
  }

  return <PlanningClient project={serialized} />
}

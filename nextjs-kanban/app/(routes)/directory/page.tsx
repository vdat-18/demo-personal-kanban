import { getProjects } from '@/lib/db/projects'
import type { Metadata } from 'next'
import { DirectoryClient } from '@/components/directory/DirectoryClient'

export const metadata: Metadata = {
  title: 'Directory | Personal Kanban',
  description: 'Browse all projects and tasks',
}

type ProjectRow = Awaited<ReturnType<typeof getProjects>>[number]
type TaskRow = ProjectRow['tasks'][number]

export default async function DirectoryPage() {
  let projects: Awaited<ReturnType<typeof getProjects>> = []
  try {
    projects = await getProjects()
  } catch {}

  const serialized = projects.map((p: ProjectRow) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: 'planning',
    createdAt: p.createdAt.toISOString(),
    tasks: (p.tasks ?? []).map((t: TaskRow) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority,
    })),
  }))

  return <DirectoryClient projects={serialized} />
}

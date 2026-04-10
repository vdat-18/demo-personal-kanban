import { getProject } from '@/lib/db/projects'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { MissionControlTemplate } from '@/components/templates/MissionControlTemplate'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  let name = 'Mission Control'
  try {
    const project = await getProject(id)
    if (project) name = project.name
  } catch {}
  return {
    title: `${name} | Personal Kanban`,
    description: `Kanban board for ${name}`,
  }
}

type ProjectRow = NonNullable<Awaited<ReturnType<typeof getProject>>>
type TaskRow = ProjectRow['tasks'][number]

export default async function MissionControlPage({ params }: Props) {
  const { id } = await params
  let project: ProjectRow | null = null
  try {
    project = await getProject(id)
  } catch {}
  if (!project) notFound()

  const serialized = {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    tasks: (project.tasks ?? []).map((t: TaskRow) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  }

  return <MissionControlTemplate project={serialized} />
}

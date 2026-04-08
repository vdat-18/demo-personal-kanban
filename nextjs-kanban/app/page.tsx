import { getProjects } from '@/lib/db/projects'
import { HomeClient } from '@/components/home/HomeClient'

export const metadata = {
  title: 'Home | Personal Kanban',
  description: 'AI-powered personal kanban — start a new project or continue where you left off.',
}

type ProjectRow = Awaited<ReturnType<typeof getProjects>>[number]
type TaskRow = ProjectRow['tasks'][number]

export default async function HomePage() {
  // Fetch projects server-side; fall back gracefully if DB is unavailable
  let projects: Awaited<ReturnType<typeof getProjects>> = []
  try {
    projects = await getProjects()
  } catch {
    // DB may not be running in all environments — render empty state
  }

  const serialized = projects.map((p: ProjectRow) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    status: 'planning',
    createdAt: p.createdAt.toISOString(),
    tasks: (p.tasks ?? []).map((t: TaskRow) => ({ id: t.id, status: t.status })),
  }))

  return <HomeClient initialProjects={serialized} />
}

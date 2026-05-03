'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FolderOpen,
  LayoutGrid,
  List as ListIcon,
  FileStack,
  BookOpen,
  ClipboardList,
} from 'lucide-react'
import { SearchInput } from '@/components/molecules/SearchInput'
import { StatusFilterBar } from '@/components/molecules/StatusFilterBar'
import { DirectoryProjectGrid } from '@/components/organisms/DirectoryProjectGrid'
import { DirectoryTaskCard } from '@/components/molecules/DirectoryTaskCard'
import { DirectoryTaskRow } from '@/components/molecules/DirectoryTaskRow'
import { DirectoryArtifactsPanel } from '@/components/organisms/DirectoryArtifactsPanel'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type SortBy = 'title' | 'priority' | 'date'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: TaskPriority
  createdAt?: string
}

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
  playbookId?: import('@/types/domain').PlaybookId
  importedSources?: import('@/types/domain').ImportedSource[]
  tasks: Task[]
}

type ViewMode = 'grid' | 'list'
type Tab = 'projects' | 'tasks' | 'artifacts'

export interface DirectoryTemplateProps {
  projects: Project[]
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const STATUS_ORDER: UITaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW', 'TODO', 'BLOCKED', 'DONE']

const STATUS_DOT: Record<UITaskStatus, string> = {
  TODO:        'bg-ink-subtle',
  IN_PROGRESS: 'bg-brand',
  IN_REVIEW:   'bg-spark',
  DONE:        'bg-success',
  BLOCKED:     'bg-danger',
}

const STATUS_LABEL: Record<UITaskStatus, string> = {
  TODO:        'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW:   'In Review',
  DONE:        'Done',
  BLOCKED:     'Blocked',
}

const STATUS_COUNT_CHIP: Record<UITaskStatus, string> = {
  TODO:        'bg-surface-muted text-ink-muted border-line',
  IN_PROGRESS: 'bg-info-bg text-info border-info-border',
  IN_REVIEW:   'bg-warning-bg text-warning border-warning-border',
  DONE:        'bg-success-bg text-success border-success-border',
  BLOCKED:     'bg-danger-bg text-danger border-danger-border',
}

export function DirectoryTemplate({ projects }: DirectoryTemplateProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStatus, setSelectedStatus] = useState<UITaskStatus | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [tab, setTab] = useState<Tab>('projects')

  const planningThreads = useKanbanStore((s) => s.planningThreads)
  const visionVersions = useKanbanStore((s) => s.visionVersions)
  const subtasks = useKanbanStore((s) => s.subtasks)
  const storeTasks = useKanbanStore((s) => s.tasks)

  const artifactCountByProject = useMemo(() => {
    const map: Record<string, number> = {}
    projects.forEach((p) => {
      const threads = planningThreads.filter((t) => t.projectId === p.id)
      const visions = threads.flatMap((t) => visionVersions.filter((v) => v.threadId === t.id))
      const pTasks = storeTasks.filter((t) => t.projectId === p.id)
      const deliverableCount = pTasks.reduce((acc, t) => {
        return acc + subtasks.filter((s) => s.taskId === t.id && (s.doerResult || s.output)).length
      }, 0)
      map[p.id] = visions.length + deliverableCount
    })
    return map
  }, [projects, planningThreads, visionVersions, storeTasks, subtasks])

  const allTasks = useMemo(
    () => projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))),
    [projects],
  )

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects
    const q = projectSearch.toLowerCase()
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    )
  }, [projects, projectSearch])

  // Tasks grouped by status
  const tasksByStatus = useMemo(() => {
    const filtered = allTasks.filter((t) => {
      const matchSearch =
        !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus
      return matchSearch && matchStatus
    })

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })

    return STATUS_ORDER
      .map((status) => ({ status, tasks: sorted.filter((t) => t.status === status) }))
      .filter((g) => g.tasks.length > 0)
  }, [allTasks, searchQuery, selectedStatus, sortBy])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allTasks.length }
    allTasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return counts
  }, [allTasks])

  const STATUSES = ['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const

  return (
    <div className="flex flex-col h-full w-full bg-canvas font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 px-8 border-b border-line bg-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-subtle border border-brand-border flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-brand" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-ink tracking-tight">Directory</h1>
            <p className="text-meta text-ink-subtle">
              {projects.length} projects · {allTasks.length} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-subtle text-brand text-xs font-medium hover:bg-brand-subtle/70 transition-colors border border-brand-border"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge Hub
          </Link>
          {tab === 'tasks' && (
            <>
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-ink text-white' : 'text-ink-subtle hover:bg-surface-muted'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-ink text-white' : 'text-ink-subtle hover:bg-surface-muted'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tab switcher */}
      <div className="border-b border-line bg-surface px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 py-2">
          <TabButton active={tab === 'projects'} onClick={() => setTab('projects')} icon={<FolderOpen className="w-3.5 h-3.5" />}>
            Projects
          </TabButton>
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ClipboardList className="w-3.5 h-3.5" />}>
            Tasks
          </TabButton>
          <TabButton active={tab === 'artifacts'} onClick={() => setTab('artifacts')} icon={<FileStack className="w-3.5 h-3.5" />}>
            Artifacts
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-5">

          {/* ── Projects tab ── */}
          {tab === 'projects' && (
            <>
              <SearchInput value={projectSearch} onChange={setProjectSearch} placeholder="Search projects..." />
              {filteredProjects.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-ink-subtle">No projects match your search.</p>
                </div>
              ) : (
                <DirectoryProjectGrid
                  projects={filteredProjects.map((p) => ({
                    ...p,
                    artifactCount: artifactCountByProject[p.id] ?? 0,
                    playbookId: p.playbookId,
                    importedSourceCount: p.importedSources?.length ?? 0,
                  }))}
                  onProjectClick={(id) => router.push(`/planning/${id}`)}
                />
              )}
            </>
          )}

          {/* ── Tasks tab ── */}
          {tab === 'tasks' && (
            <>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search tasks..." />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="h-10 px-3 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="date">Newest first</option>
                  <option value="priority">Priority</option>
                  <option value="title">Title A–Z</option>
                </select>
              </div>

              <StatusFilterBar
                statuses={STATUSES}
                selected={selectedStatus}
                counts={statusCounts}
                onSelect={setSelectedStatus}
              />

              {/* Status-grouped task list */}
              {tasksByStatus.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-ink-subtle">No tasks match your filters.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {tasksByStatus.map(({ status, tasks }) => (
                    <div key={status}>
                      {/* Status section header */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                        <span className="font-semibold text-sm text-ink">{STATUS_LABEL[status]}</span>
                        <span className={`text-micro px-1.5 py-0.5 rounded-md border font-semibold ${STATUS_COUNT_CHIP[status]}`}>
                          {tasks.length}
                        </span>
                        <div className="h-px flex-1 bg-line" />
                      </div>

                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {tasks.map((task) => (
                            <DirectoryTaskCard
                              key={task.id}
                              id={task.id}
                              title={task.title}
                              description={task.description}
                              status={task.status}
                              priority={task.priority}
                              projectName={task.projectName}
                              onClick={() => router.push(`/chat/${task.id}`)}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-card">
                          {tasks.map((task, i) => (
                            <DirectoryTaskRow
                              key={task.id}
                              id={task.id}
                              title={task.title}
                              description={task.description}
                              status={task.status}
                              priority={task.priority}
                              projectName={task.projectName}
                              onClick={() => router.push(`/chat/${task.id}`)}
                              showBorder={i > 0}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Artifacts tab ── */}
          {tab === 'artifacts' && <DirectoryArtifactsPanel />}
        </div>
      </div>
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-xl transition-all ${
        active
          ? 'bg-brand text-white shadow-card'
          : 'text-ink-subtle hover:text-ink hover:bg-surface-muted'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

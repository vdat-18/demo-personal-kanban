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
  ArrowUpDown,
} from 'lucide-react'
import { SearchInput } from '@/components/molecules/SearchInput'
import { StatusFilterBar } from '@/components/molecules/StatusFilterBar'
import { DirectoryProjectGrid } from '@/components/organisms/DirectoryProjectGrid'
import { DirectoryTaskList } from '@/components/organisms/DirectoryTaskList'
import { DirectoryArtifactsPanel } from '@/components/organisms/DirectoryArtifactsPanel'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type SortBy = 'title' | 'priority' | 'status' | 'date'

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
  tasks: Task[]
}

type ViewMode = 'grid' | 'list'
type Tab = 'projects' | 'tasks' | 'artifacts'

export interface DirectoryTemplateProps {
  projects: Project[]
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export function DirectoryTemplate({ projects }: DirectoryTemplateProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStatus, setSelectedStatus] = useState<UITaskStatus | 'ALL'>('ALL')
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [tab, setTab] = useState<Tab>('projects')

  // Pull artifact counts from store so project cards can show them
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
    () =>
      projects.flatMap((p) =>
        p.tasks.map((t) => ({ ...t, projectName: p.name, projectId: p.id })),
      ),
    [projects],
  )

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects
    const q = projectSearch.toLowerCase()
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    )
  }, [projects, projectSearch])

  const filteredTasks = useMemo(() => {
    let result = allTasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus
      const matchProject = selectedProjectId === 'ALL' || t.projectId === selectedProjectId
      return matchSearch && matchStatus && matchProject
    })

    if (sortBy === 'title') result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === 'priority')
      result = [...result].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
      )
    else if (sortBy === 'status') result = [...result].sort((a, b) => a.status.localeCompare(b.status))
    else result = [...result].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

    return result
  }, [allTasks, searchQuery, selectedStatus, selectedProjectId, sortBy])

  const statusCounts = useMemo(() => {
    const base = allTasks.filter(
      (t) => selectedProjectId === 'ALL' || t.projectId === selectedProjectId,
    )
    const counts: Record<string, number> = { ALL: base.length }
    base.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return counts
  }, [allTasks, selectedProjectId])

  const STATUSES = ['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const

  return (
    <div className="flex flex-col h-full w-full bg-[#f8f9fa] font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 px-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="font-bold text-lg text-[#0a192f] tracking-tight">Directory</h1>
            <p className="text-[11px] font-semibold text-slate-400">
              {projects.length} projects · {allTasks.length} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/hub"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
            title="Knowledge Hub — your published plans"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Knowledge Hub
          </Link>
          {tab === 'tasks' && (
            <>
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#0a192f] text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#0a192f] text-white' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tab switcher */}
      <div className="border-b border-slate-100 bg-white px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1">
          <TabButton
            active={tab === 'projects'}
            onClick={() => setTab('projects')}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Projects
          </TabButton>
          <TabButton
            active={tab === 'tasks'}
            onClick={() => setTab('tasks')}
            icon={<ClipboardList className="w-3.5 h-3.5" />}
          >
            Tasks
          </TabButton>
          <TabButton
            active={tab === 'artifacts'}
            onClick={() => setTab('artifacts')}
            icon={<FileStack className="w-3.5 h-3.5" />}
          >
            Artifacts
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">

          {/* ── Projects tab ── */}
          {tab === 'projects' && (
            <>
              <SearchInput
                value={projectSearch}
                onChange={setProjectSearch}
                placeholder="Search projects..."
              />
              {filteredProjects.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm font-bold text-gray-300">No projects match your search.</p>
                </div>
              ) : (
                <DirectoryProjectGrid
                  projects={filteredProjects.map((p) => ({
                    ...p,
                    artifactCount: artifactCountByProject[p.id] ?? 0,
                  }))}
                  onProjectClick={(id) => router.push(`/planning/${id}`)}
                />
              )}
            </>
          )}

          {/* ── Tasks tab ── */}
          {tab === 'tasks' && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search tasks..."
                  />
                </div>

                {/* Filter by project */}
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="ALL">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <div className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-slate-200 bg-white">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none"
                  >
                    <option value="date">Newest first</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </div>
              </div>

              <StatusFilterBar
                statuses={STATUSES}
                selected={selectedStatus}
                counts={statusCounts}
                onSelect={setSelectedStatus}
              />

              <DirectoryTaskList
                tasks={filteredTasks}
                viewMode={viewMode}
                onTaskClick={(id) => router.push(`/chat/${id}`)}
              />
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
      className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? 'text-[#0a192f] border-blue-500'
          : 'text-slate-500 border-transparent hover:text-slate-700'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

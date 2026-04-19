'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, LayoutGrid, List as ListIcon, FileStack, BookOpen } from 'lucide-react'
import { SearchInput } from '@/components/molecules/SearchInput'
import { StatusFilterBar } from '@/components/molecules/StatusFilterBar'
import { DirectoryProjectGrid } from '@/components/organisms/DirectoryProjectGrid'
import { DirectoryTaskList } from '@/components/organisms/DirectoryTaskList'
import { DirectoryArtifactsPanel } from '@/components/organisms/DirectoryArtifactsPanel'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: TaskPriority
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
type Tab = 'tasks' | 'artifacts'

export interface DirectoryTemplateProps {
  projects: Project[]
}

export function DirectoryTemplate({ projects }: DirectoryTemplateProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStatus, setSelectedStatus] = useState<UITaskStatus | 'ALL'>('ALL')
  const [tab, setTab] = useState<Tab>('tasks')

  const allTasks = useMemo(
    () => projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name, projectId: p.id }))),
    [projects]
  )

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus
      return matchSearch && matchStatus
    })
  }, [allTasks, searchQuery, selectedStatus])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allTasks.length }
    allTasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1 })
    return counts
  }, [allTasks])

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
          {/* Knowledge Hub link (#8) — surfaces the published-plan library
              from any directory tab so the user can switch to it quickly. */}
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

      {/* Tab switcher — Tasks | Artifacts */}
      <div className="border-b border-slate-100 bg-white px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-1">
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} icon={<ListIcon className="w-3.5 h-3.5" />}>
            Tasks & Projects
          </TabButton>
          <TabButton active={tab === 'artifacts'} onClick={() => setTab('artifacts')} icon={<FileStack className="w-3.5 h-3.5" />}>
            Artifacts
          </TabButton>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">
          {tab === 'tasks' ? (
            <>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tasks and projects..."
              />

              <StatusFilterBar
                statuses={STATUSES}
                selected={selectedStatus}
                counts={statusCounts}
                onSelect={setSelectedStatus}
              />

              <DirectoryProjectGrid
                projects={projects}
                onProjectClick={(id) => router.push(`/planning/${id}`)}
              />

              <DirectoryTaskList
                tasks={filteredTasks}
                viewMode={viewMode}
                onTaskClick={(id) => router.push(`/chat/${id}`)}
              />
            </>
          ) : (
            <DirectoryArtifactsPanel />
          )}
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

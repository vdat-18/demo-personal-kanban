'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, LayoutGrid, List as ListIcon } from 'lucide-react'
import { SearchInput } from '@/components/molecules/SearchInput'
import { StatusFilterBar } from '@/components/molecules/StatusFilterBar'
import { DirectoryProjectGrid } from '@/components/organisms/DirectoryProjectGrid'
import { DirectoryTaskList } from '@/components/organisms/DirectoryTaskList'
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

export interface DirectoryTemplateProps {
  projects: Project[]
}

export function DirectoryTemplate({ projects }: DirectoryTemplateProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStatus, setSelectedStatus] = useState<UITaskStatus | 'ALL'>('ALL')

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
      <header className="h-20 px-10 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <FolderOpen className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">Directory</h1>
            <p className="text-xs font-bold text-gray-400">{projects.length} projects · {allTasks.length} tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-[#0a192f] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-[#0a192f] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-10 py-8 space-y-8">
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
        </div>
      </div>
    </div>
  )
}

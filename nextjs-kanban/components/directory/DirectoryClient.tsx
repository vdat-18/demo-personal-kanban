'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FolderOpen, LayoutGrid, List as ListIcon, ArrowRight } from 'lucide-react'

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
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

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-500',
}

export function DirectoryClient({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'ALL'>('ALL')

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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks and projects..."
              className="w-full pl-12 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm text-[#0a192f] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
                  selectedStatus === s ? 'bg-[#0a192f] text-white' : 'bg-white text-gray-500 border border-gray-100 hover:border-[#0a192f]/20'
                }`}
              >
                {s} ({statusCounts[s] || 0})
              </button>
            ))}
          </div>

          {/* Projects Section */}
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/planning/${p.id}`)}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-black text-[#0a192f] group-hover:text-blue-600 transition-colors">{p.name}</h3>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{p.tasks.length} tasks</span>
                    <span>{p.tasks.filter((t) => t.status === 'DONE').length} done</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      style={{
                        width: p.tasks.length > 0 ? `${(p.tasks.filter((t) => t.status === 'DONE').length / p.tasks.length) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tasks Section */}
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
              Tasks ({filteredTasks.length})
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/chat/${task.id}`)}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="font-bold text-sm text-[#0a192f] group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                      {task.title}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{task.projectName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {filteredTasks.map((task, i) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/chat/${task.id}`)}
                    className={`flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest w-20 text-center ${STATUS_COLORS[task.status]}`}>
                        {task.status}
                      </span>
                      <div>
                        <p className="font-bold text-sm text-[#0a192f]">{task.title}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{task.projectName}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="p-10 text-center">
                    <p className="text-sm font-bold text-gray-300">No tasks match your search.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

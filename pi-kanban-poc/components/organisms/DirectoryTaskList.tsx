'use client'

import { DirectoryTaskCard } from '@/components/molecules/DirectoryTaskCard'
import { DirectoryTaskRow } from '@/components/molecules/DirectoryTaskRow'
import type { UITaskStatus } from '@/types/domain'

type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

interface Task {
  id: string
  title: string
  description?: string | null
  status: UITaskStatus
  priority: TaskPriority
  projectName: string
}

export interface DirectoryTaskListProps {
  tasks: Task[]
  viewMode: 'grid' | 'list'
  onTaskClick: (taskId: string) => void
}

export function DirectoryTaskList({ tasks, viewMode, onTaskClick }: DirectoryTaskListProps) {
  if (tasks.length === 0) {
    return (
      <section>
        <h2 className="text-meta font-bold text-slate-400 uppercase tracking-[0.1em] mb-4">Tasks (0)</h2>
        <div className="py-20 text-center">
          <p className="text-sm font-bold text-gray-300">No tasks match your filters.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-meta font-bold text-slate-400 uppercase tracking-[0.1em] mb-4">
        Tasks ({tasks.length})
      </h2>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <DirectoryTaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              projectName={task.projectName}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {tasks.map((task, i) => (
            <DirectoryTaskRow
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              status={task.status}
              priority={task.priority}
              projectName={task.projectName}
              onClick={() => onTaskClick(task.id)}
              showBorder={i > 0}
            />
          ))}
        </div>
      )}
    </section>
  )
}

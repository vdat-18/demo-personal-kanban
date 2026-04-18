'use client'

import { DirectoryTaskCard } from '@/components/molecules/DirectoryTaskCard'
import { DirectoryTaskRow } from '@/components/molecules/DirectoryTaskRow'
import type { UITaskStatus } from '@/types/domain'

interface Task {
  id: string
  title: string
  status: UITaskStatus
  projectName: string
}

export interface DirectoryTaskListProps {
  tasks: Task[]
  viewMode: 'grid' | 'list'
  onTaskClick: (taskId: string) => void
}

export function DirectoryTaskList({ tasks, viewMode, onTaskClick }: DirectoryTaskListProps) {
  return (
    <section>
      <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
        Tasks ({tasks.length})
      </h2>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <DirectoryTaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              status={task.status}
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
              status={task.status}
              projectName={task.projectName}
              onClick={() => onTaskClick(task.id)}
              showBorder={i > 0}
            />
          ))}
          {tasks.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-gray-300">No tasks match your search.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

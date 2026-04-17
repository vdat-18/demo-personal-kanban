'use client'

import { ArrowLeft, Plus } from 'lucide-react'

export interface KanbanHeaderProps {
  projectName: string
  projectDescription: string | null
  onBack: () => void
  onAddTask: () => void
}

export function KanbanHeader({ projectName, projectDescription, onBack, onAddTask }: KanbanHeaderProps) {
  return (
    <header className="h-20 px-10 border-b border-gray-100 bg-white flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-extrabold text-2xl text-[#0a192f] tracking-tight">{projectName}</h1>
          <p className="text-sm font-semibold text-gray-400">{projectDescription}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0a192f] text-white rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>
    </header>
  )
}

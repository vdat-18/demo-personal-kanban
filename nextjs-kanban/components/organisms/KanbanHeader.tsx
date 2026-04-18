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
    <header className="h-24 px-10 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-3xl text-[#0a192f] tracking-tight leading-none mb-1">{projectName}</h1>
          <p className="text-sm font-medium text-slate-400">{projectDescription}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-6 py-3 bg-[#0a192f] text-white rounded-2xl text-sm font-semibold tracking-wide hover:bg-[#1a2f4d] transition-all shadow-lg shadow-[#0a192f]/10 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>
    </header>
  )
}

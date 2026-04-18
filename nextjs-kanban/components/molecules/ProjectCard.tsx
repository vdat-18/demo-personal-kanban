'use client'

import { Trash2 } from 'lucide-react'
import { ProgressBar } from '@/components/atoms/ProgressBar'

export interface ProjectCardProps {
  id: string
  name: string
  status: string
  tasks: Array<{ id: string; status: string }>
  onClick: () => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

'use client'

import { Trash2 } from 'lucide-react'
import { ProgressBar } from '@/components/atoms/ProgressBar'

export interface ProjectCardProps {
  id: string
  name: string
  status: string
  tasks: Array<{ id: string; status: string }>
  onClick: () => void
  onDelete: (e: React.MouseEvent, id: string) => void
}

export function ProjectCard({ id, name, status, tasks, onClick, onDelete }: ProjectCardProps) {
  const completedTasks = tasks?.filter((t) => t.status === 'DONE').length || 0
  const totalTasks = tasks?.length || 0
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div
      onClick={onClick}
      className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-700 cursor-pointer group border border-white"
    >
      <div className="flex justify-between items-start mb-10">
        <div className="px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
          {status || 'planning'}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
            <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white shadow-md z-10" />
            <div className="w-9 h-9 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md z-20">AI</div>
          </div>
          <button
            onClick={(e) => onDelete(e, id)}
            className="p-3 ml-2 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h3 className="text-2xl font-black mb-12 text-[#0a192f] line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">
        {name}
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
          <span>Project Completion</span>
          <span className="text-[#0a192f]">{progress}%</span>
        </div>
        <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

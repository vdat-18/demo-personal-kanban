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
      className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-2 transition-all duration-500 cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-8">
        <div className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-blue-50 text-blue-600 border-blue-100">
          {status || 'planning'}
        </div>
        <div className="flex -space-x-2">
          <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-white" />
          <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">AI</div>
        </div>
        <button
          onClick={(e) => onDelete(e, id)}
          className="p-2 ml-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="text-2xl font-black mb-10 text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
        {name}
      </h3>

      <div className="space-y-4">
        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Progress</span>
          <span className="text-slate-900">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </div>
  )
}

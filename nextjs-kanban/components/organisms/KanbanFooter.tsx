'use client'

import { Rocket } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'

interface Task {
  id: string
  status: UITaskStatus
}

export interface KanbanFooterProps {
  tasks: Task[]
  autoModeStates: Record<string, AutoModeColumnState>
  onCloseProject: () => void
}

export function KanbanFooter({ tasks, autoModeStates, onCloseProject }: KanbanFooterProps) {
  const canClose = !tasks.some((t) => t.status !== 'DONE' && t.status !== 'BLOCKED')
  const enabledCount = AUTO_MODE_COLUMNS.filter((col) => autoModeStates[col]?.enabled).length

  return (
    <footer className="h-24 px-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-t border-gray-100 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-10">
        {[
          { label: 'Total', value: tasks.length, color: 'text-[#0a192f]' },
          { label: 'In Progress', value: tasks.filter((t) => t.status !== 'DONE' && t.status !== 'BLOCKED').length, color: 'text-blue-600' },
          { label: 'Done', value: tasks.filter((t) => t.status === 'DONE').length, color: 'text-green-600' },
          { label: 'Cancelled', value: tasks.filter((t) => t.status === 'BLOCKED').length, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
            <span className={`font-bold text-base ${color}`}>{value}</span>
          </div>
        ))}
        {enabledCount > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Auto</span>
            <span className="font-bold text-base text-violet-600">{enabledCount}/{AUTO_MODE_COLUMNS.length}</span>
          </div>
        )}
      </div>
      <button
        onClick={onCloseProject}
        disabled={!canClose}
        className={`px-10 py-4 rounded-[20px] font-black text-sm transition-all flex items-center gap-3 uppercase tracking-[0.2em] ${
          !canClose
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
            : 'bg-[#0a192f] text-white hover:bg-blue-900 shadow-2xl shadow-blue-900/20 active:scale-95'
        }`}
      >
        Close Project <Rocket className="w-5 h-5" />
      </button>
    </footer>
  )
}

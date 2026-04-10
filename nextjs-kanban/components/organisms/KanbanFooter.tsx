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
    <footer className="h-20 px-10 flex items-center justify-between bg-white border-t border-gray-100 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
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
        className={`px-10 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-3 uppercase tracking-widest border-b-4 ${
          !canClose
            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
            : 'bg-[#0a192f] text-white border-blue-950 hover:bg-blue-900 shadow-xl shadow-blue-900/20'
        }`}
      >
        Close Project <Rocket className="w-4 h-4" />
      </button>
    </footer>
  )
}

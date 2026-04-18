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
    <footer className="h-28 px-12 flex items-center justify-between bg-white/70 backdrop-blur-xl border-t border-gray-100 shrink-0 shadow-2xl shadow-slate-200/50 z-40">
      <div className="flex items-center gap-12">
        {[
          { label: 'Total Tasks', value: tasks.length, color: 'text-[#0a192f]' },
          { label: 'In Execution', value: tasks.filter((t) => t.status !== 'DONE' && t.status !== 'BLOCKED').length, color: 'text-blue-600' },
          { label: 'Completed', value: tasks.filter((t) => t.status === 'DONE').length, color: 'text-green-600' },
          { label: 'Archived', value: tasks.filter((t) => t.status === 'BLOCKED').length, color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
            <span className={`font-black text-xl tracking-tighter ${color}`}>{value}</span>
          </div>
        ))}
        {enabledCount > 0 && (
          <div className="flex flex-col gap-1.5 border-l border-gray-100 pl-12">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">Agents Active</span>
            <span className="font-black text-xl tracking-tighter text-violet-600">{enabledCount}/{AUTO_MODE_COLUMNS.length}</span>
          </div>
        )}
      </div>
      <button
        onClick={onCloseProject}
        disabled={!canClose}
        className={`px-12 py-5 rounded-[2rem] font-black text-[13px] transition-all flex items-center gap-3 uppercase tracking-[0.25em] ${
          !canClose
            ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
            : 'bg-[#0a192f] text-white hover:bg-blue-600 shadow-2xl shadow-blue-900/20 active:scale-95 border border-[#0a192f]'
        }`}
      >
        Close Mission <Rocket className="w-5 h-5" />
      </button>
    </footer>
  )
}

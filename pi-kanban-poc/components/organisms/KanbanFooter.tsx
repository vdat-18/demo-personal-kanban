'use client'

import { Rocket, Sparkles } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'
import { useBreakdownConcurrency } from '@/lib/hooks/useBreakdownConcurrency'
import { useKanbanStore } from '@/lib/storage/kanbanStore'

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

  // Tier 3.11 — surface live AI activity as a small feed instead of a static
  // "Agents Active 2/3" pill. Renders nothing when no breakdown calls are
  // active or queued.
  const concurrency = useBreakdownConcurrency()
  const allTasks = useKanbanStore((s) => s.tasks)
  const activeBreakdowns = concurrency.active
    .map((tid) => allTasks.find((t) => t.id === tid))
    .filter((t): t is NonNullable<typeof t> => t != null)
  const queuedBreakdowns = concurrency.queue
    .map((tid) => allTasks.find((t) => t.id === tid))
    .filter((t): t is NonNullable<typeof t> => t != null)
  const hasAnyAi = activeBreakdowns.length > 0 || queuedBreakdowns.length > 0

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
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">Legacy Agents</span>
            <span className="font-black text-xl tracking-tighter text-violet-600">{enabledCount}/{AUTO_MODE_COLUMNS.length}</span>
          </div>
        )}
        {hasAnyAi && (
          <div className="flex flex-col gap-1 border-l border-gray-100 pl-12 max-w-[280px]">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI working on {activeBreakdowns.length}
              {queuedBreakdowns.length > 0 && ` (+${queuedBreakdowns.length} queued)`}
            </span>
            <ul className="text-[10px] text-indigo-600 font-bold leading-snug space-y-0.5">
              {activeBreakdowns.slice(0, 2).map((t) => (
                <li key={t.id} className="truncate">• {t.title}</li>
              ))}
              {queuedBreakdowns.slice(0, 1).map((t) => (
                <li key={t.id} className="truncate text-indigo-300">⏳ {t.title}</li>
              ))}
            </ul>
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

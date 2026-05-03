'use client'

import { Rocket, Sparkles, RefreshCw } from 'lucide-react'
import type { UITaskStatus } from '@/types/domain'
import { AUTO_MODE_COLUMNS } from '@/lib/auto-mode/constants'
import type { AutoModeColumnState } from '@/lib/auto-mode/constants'
import { useBreakdownConcurrency } from '@/lib/hooks/useBreakdownConcurrency'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import { useI18n } from '@/lib/i18n/context'

interface Task {
  id: string
  status: UITaskStatus
}

export interface KanbanFooterProps {
  tasks: Task[]
  autoModeStates: Record<string, AutoModeColumnState>
  onCloseProject: () => void
  runtimeStatus?: import('@/types/domain').RuntimeStatus | null
}

export function KanbanFooter({
  tasks,
  autoModeStates,
  onCloseProject,
  runtimeStatus,
}: KanbanFooterProps) {
  const { t } = useI18n()
  const canClose = !tasks.some((t) => t.status !== 'DONE' && t.status !== 'BLOCKED')
  const enabledCount = AUTO_MODE_COLUMNS.filter((col) => autoModeStates[col]?.enabled).length

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
    <footer className="h-14 px-6 flex items-center justify-between bg-surface/80 backdrop-blur-xl border-t border-line shrink-0 z-40">
      <div className="flex items-center gap-7">
        {[
          { label: t('mission.totalTasks', 'Total'), value: tasks.length, color: 'text-ink' },
          {
            label: t('mission.inExecution', 'Active'),
            value: tasks.filter((t) => t.status !== 'DONE' && t.status !== 'BLOCKED').length,
            color: 'text-brand',
          },
          {
            label: t('mission.completed', 'Done'),
            value: tasks.filter((t) => t.status === 'DONE').length,
            color: 'text-success',
          },
          {
            label: t('mission.archived', 'Blocked'),
            value: tasks.filter((t) => t.status === 'BLOCKED').length,
            color: 'text-ink-subtle',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-baseline gap-2">
            <span className="text-micro text-ink-subtle">{label}</span>
            <span className={`font-bold text-meta ${color}`}>{value}</span>
          </div>
        ))}
        {enabledCount > 0 && (
          <div className="flex items-baseline gap-2 border-l border-line pl-7">
            <span className="text-micro text-brand">{t('mission.agents', 'Agents')}</span>
            <span className="font-bold text-meta text-brand">
              {enabledCount}/{AUTO_MODE_COLUMNS.length}
            </span>
          </div>
        )}
        {hasAnyAi && (
          <div className="flex flex-col gap-1 border-l border-line pl-8 max-w-[280px]">
            <span className="text-micro text-brand inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI working on {activeBreakdowns.length}
              {queuedBreakdowns.length > 0 && ` (+${queuedBreakdowns.length} queued)`}
            </span>
            <ul className="text-meta text-brand font-medium leading-snug space-y-0.5">
              {activeBreakdowns.slice(0, 2).map((task) => (
                <li key={task.id} className="truncate">
                  • {task.title}
                </li>
              ))}
              {queuedBreakdowns.slice(0, 1).map((task) => (
                <li key={task.id} className="truncate text-brand/60">
                  ⏳ {task.title}
                </li>
              ))}
            </ul>
          </div>
        )}
        {runtimeStatus && (
          <div className="flex flex-col gap-1 border-l border-line pl-7 max-w-[260px]">
            <span className="text-micro text-ink-subtle inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {t('mission.runtime', 'Runtime')}
            </span>
            <p className="text-meta text-ink-muted leading-snug">{runtimeStatus.summary}</p>
          </div>
        )}
      </div>
      <button
        onClick={onCloseProject}
        disabled={!canClose}
        className={`px-4 py-2 rounded-xl font-semibold text-meta transition-colors flex items-center gap-2 ${
          !canClose
            ? 'bg-surface-muted text-ink-subtle cursor-not-allowed border border-line'
            : 'bg-ink text-white hover:bg-brand shadow-sm active:scale-95'
        }`}
      >
        {t('mission.closeMission', 'Wrap up')}
        <Rocket className="w-3.5 h-3.5" />
      </button>
    </footer>
  )
}

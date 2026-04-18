'use client'

import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { TaskActivityEntry, TaskActivityType } from '@/types/domain'

/**
 * Per-task activity feed (Tier 3.10).
 *
 * Render-only component. Reads activities for the given task from the store
 * and renders newest-first. Suitable for embedding inside a task detail panel
 * or modal.
 */

const ACTOR_ICON: Record<TaskActivityEntry['actor'], string> = {
  user: '👤',
  ai: '🤖',
  system: '⚙️',
}

const TYPE_COLOR: Partial<Record<TaskActivityType, string>> = {
  created: 'text-slate-600',
  status_changed: 'text-blue-600',
  ai_suggested_breakdown: 'text-indigo-600',
  ai_suggestion_approved: 'text-emerald-600',
  ai_suggestion_dismissed: 'text-slate-400',
  ai_needed_human_input: 'text-amber-600',
  ai_clarification_answered: 'text-amber-600',
  ai_refined: 'text-violet-600',
  subtask_completed: 'text-emerald-600',
  subtask_added_manually: 'text-blue-600',
  subtask_removed: 'text-rose-500',
  user_edited_task: 'text-blue-600',
}

export interface TaskActivityTimelineProps {
  taskId: string
  /** Cap for very long histories. Default 30. */
  maxItems?: number
}

export function TaskActivityTimeline({ taskId, maxItems = 30 }: TaskActivityTimelineProps) {
  const activities = useKanbanStore((s) => s.activities)
  const items = activities
    .filter((a) => a.taskId === taskId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, maxItems)

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-[11px] text-slate-400">
        No activity yet — actions on this task will show here.
      </div>
    )
  }

  return (
    <ul className="space-y-2 relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-100" aria-hidden />
      {items.map((entry) => {
        const colorClass = TYPE_COLOR[entry.type] ?? 'text-slate-600'
        return (
          <li key={entry.id} className="relative pl-8">
            <span
              className={`absolute left-1 top-0.5 w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px]`}
              aria-hidden
            >
              {ACTOR_ICON[entry.actor]}
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-[11px] font-semibold ${colorClass}`}>
                {entry.summary}
              </span>
              <span className="text-[9px] text-slate-400 font-bold">
                {formatTime(entry.timestamp)}
              </span>
            </div>
            {entry.metadata?.fromStatus != null && entry.metadata?.toStatus != null && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {String(entry.metadata.fromStatus)} → {String(entry.metadata.toStatus)}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const ms = Date.now() - d.getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

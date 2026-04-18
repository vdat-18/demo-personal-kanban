'use client'

import { useMemo } from 'react'
import { ArrowRight, XCircle, RotateCcw, CheckCircle2, Circle, Sparkles, MessageSquare } from 'lucide-react'
import { StatusPill } from '@/components/atoms/StatusPill'
import { useKanbanStore } from '@/lib/storage/kanbanStore'
import type { UITaskStatus, Subtask } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

/**
 * Task card.
 *
 * TODO breakdown logic was intentionally moved out of the card and into the
 * task chat screen so the mental model stays simple: click the task → plan the
 * steps in the main chat workspace. The card now only advertises that workflow
 * (hint / badge) and shows approved subtasks once they exist.
 */

export interface TaskCardProps {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  onDragStart: (e: React.DragEvent, taskId: string, status: UITaskStatus) => void
  onClick: () => void
  onUpdateStatus: (taskId: string, status: UITaskStatus) => void
  onCancelRequest: () => void
  getNextStatus: (current: UITaskStatus) => UITaskStatus | null
}

export function TaskCard({
  id,
  title,
  description,
  status,
  onDragStart,
  onClick,
  onUpdateStatus,
  onCancelRequest,
  getNextStatus,
}: TaskCardProps) {
  const allSubtasks = useKanbanStore((s) => s.subtasks)
  const allTasks = useKanbanStore((s) => s.tasks)
  const updateSubtask = useKanbanStore((s) => s.updateSubtask)
  const logActivity = useKanbanStore((s) => s.logActivity)
  const allCachedBreakdowns = useKanbanStore((s) => s.cachedBreakdowns)

  const subtasks = useMemo(
    () => allSubtasks.filter((sub) => sub.taskId === id),
    [allSubtasks, id],
  )
  const hintDismissedOnTask = useMemo(
    () => allTasks.find((t) => t.id === id)?.hintDismissed ?? false,
    [allTasks, id],
  )

  const hasSubtasks = subtasks.length > 0
  const completedCount = subtasks.filter((s) => s.completed).length

  // Check for a cached suggestion only when we don't already have approved subtasks
  const cached = useMemo(
    () =>
      allCachedBreakdowns.find(
        (c) => c.taskId === id && c.approvedAt == null && c.dismissedAt == null,
      ) ?? null,
    [allCachedBreakdowns, id],
  )

  const handleToggleSubtask = (sub: Subtask) => {
    const nextCompleted = !sub.completed
    updateSubtask(sub.id, { completed: nextCompleted })
    if (nextCompleted) {
      logActivity({
        taskId: id,
        type: 'subtask_completed',
        actor: 'user',
        summary: `Completed: ${sub.title}`,
        resourceLink: { type: 'subtask', id: sub.id },
      })
    }
  }

  const isCardActive = status === 'IN_PROGRESS'
  const isBusyUI = false

  return (
    <div
      draggable={!isBusyUI}
      onDragStart={(e) => {
        if (isBusyUI) { e.preventDefault(); return }
        onDragStart(e, id, status)
      }}
      onClick={() => {
        if (isBusyUI) return
        onClick()
      }}
      className={`bg-white p-6 rounded-[2rem] shadow-sm border border-white transition-all group relative select-none ${
        isBusyUI
          ? 'ring-2 ring-violet-300 border-violet-200 shadow-2xl shadow-violet-100 cursor-default'
          : status === 'BLOCKED'
          ? 'opacity-60 cursor-default bg-slate-50/50'
          : 'hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer hover:-translate-y-1'
      } ${!isBusyUI && isCardActive ? 'ring-2 ring-blue-100 shadow-2xl shadow-blue-500/10' : ''}`}
    >
      {/* Status indicator line */}
      <div
        className={`absolute left-0 top-7 bottom-7 w-1.5 rounded-r-full transition-colors duration-500 ${
          status === 'DONE'
            ? 'bg-green-400'
            : status === 'IN_PROGRESS'
            ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
            : status === 'BLOCKED'
            ? 'bg-red-400'
            : 'bg-slate-200'
        }`}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          {hasSubtasks && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              {completedCount}/{subtasks.length}
            </span>
          )}
          {!hasSubtasks && status === 'TODO' && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Plan in chat
            </span>
          )}
          {!hasSubtasks && cached && status === 'TODO' && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
              AI suggestion ready
            </span>
          )}
        </div>

        <h3
          className={`font-black text-[15px] tracking-tight leading-snug pr-4 ${
            isBusyUI
              ? 'text-violet-700'
              : status === 'BLOCKED'
              ? 'text-gray-400 line-through'
              : 'text-[#0a192f] group-hover:text-blue-600 transition-colors'
          }`}
        >
          {title}
        </h3>

        {/* Hover actions (status transitions) */}
        <div className="absolute top-5 right-5 flex items-center gap-2 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          {status === 'BLOCKED' && getAllowedTransitions(status as TaskStatusValue).includes('TODO') && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdateStatus(id, 'TODO') }}
              className="w-9 h-9 rounded-[1rem] bg-green-50 hover:bg-green-600 text-green-500 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Restore task"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {getAllowedTransitions(status as TaskStatusValue).includes('BLOCKED') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelRequest() }}
              className="w-9 h-9 rounded-[1rem] bg-red-50 hover:bg-red-500 text-red-300 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Cancel task"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
          {getNextStatus(status) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const next = getNextStatus(status)
                if (next) onUpdateStatus(id, next)
              }}
              className="w-9 h-9 rounded-[1rem] bg-slate-50 hover:bg-[#0a192f] text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-md active:scale-90"
              title="Move forward"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {description && status !== 'BLOCKED' && (
          <p className="text-xs text-slate-400 leading-relaxed font-medium line-clamp-2">
            {description}
          </p>
        )}

        {!hasSubtasks && status === 'TODO' && !hintDismissedOnTask && (
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 px-3 py-2 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-[11px] text-blue-700 font-semibold leading-snug">
              Kanban is generating steps for this task automatically. Open it to review or refine.
            </span>
          </div>
        )}

        {/* ── Subtask checklist (after approval) ───────────────────── */}
        {hasSubtasks && status !== 'BLOCKED' && (
          <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
            {subtasks.slice(0, 6).map((sub) => (
              <SubtaskRow
                key={sub.id}
                sub={sub}
                onToggle={() => handleToggleSubtask(sub)}
              />
            ))}
            {subtasks.length > 6 && (
              <p className="text-[10px] text-slate-400 pl-4">+ {subtasks.length - 6} more…</p>
            )}
            {status === 'TODO' && (
              <div className="flex items-center gap-1.5 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateStatus(id, 'IN_PROGRESS')
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
                >
                  🚀 Start working
                </button>
                <div className="text-[10px] text-slate-400 font-medium">
                  Need changes? Open chat to refine.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subtask row (checkbox line) ─────────────────────────────────────────────

function SubtaskRow({ sub, onToggle }: { sub: Subtask; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`w-full text-left flex items-start gap-1.5 rounded-lg px-1.5 py-1 text-[11px] transition-colors ${
        sub.completed ? 'text-slate-400 hover:bg-slate-50' : 'text-slate-700 hover:bg-blue-50'
      }`}
    >
      {sub.completed ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-px" />
      ) : (
        <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-px" />
      )}
      <span className={`flex-1 min-w-0 leading-snug ${sub.completed ? 'line-through' : 'font-semibold'}`}>
        {sub.title}
      </span>
      {sub.aiGenerated && (
        <Sparkles className="w-2.5 h-2.5 text-indigo-400 shrink-0 mt-0.5" />
      )}
    </button>
  )
}

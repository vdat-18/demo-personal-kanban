'use client'

import { Check, X, Flag, Clock, RotateCcw } from 'lucide-react'
import type { StructuredTaskProposal } from '@/types/domain'

interface TaskProposalCardProps {
  task: StructuredTaskProposal
  status?: 'pending' | 'approved' | 'dismissed'
  onApprove: () => void
  onDismiss: () => void
  /** Optional: revert an already-decided card back to pending so user can
   *  change their mind before hitting Start Execution. */
  onReset?: () => void
  disabled?: boolean
}

const PRIORITY_STYLE: Record<StructuredTaskProposal['priority'], string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-rose-100 text-rose-700',
}

/**
 * Card for a single task proposal returned in the agent envelope.
 *
 * Users can approve/dismiss each proposal and — with onReset — flip that
 * decision back to pending before committing via Start Execution.
 */
export function TaskProposalCard({
  task,
  status = 'pending',
  onApprove,
  onDismiss,
  onReset,
  disabled,
}: TaskProposalCardProps) {
  if (status === 'approved') {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50/40 px-4 py-2.5 flex items-center gap-2 text-xs">
        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
        <span className="font-semibold text-green-700 truncate flex-1">{task.title}</span>
        <span className="text-[10px] text-green-600/70 uppercase tracking-wider font-black">
          Approved
        </span>
        {onReset && (
          <button
            onClick={onReset}
            disabled={disabled}
            title="Move back to pending"
            className="p-1 rounded-lg text-green-700/60 hover:text-green-700 hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  if (status === 'dismissed') {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-2.5 flex items-center gap-2 text-xs">
        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-500 line-through truncate flex-1">{task.title}</span>
        {onReset && (
          <button
            onClick={onReset}
            disabled={disabled}
            title="Restore to pending"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${PRIORITY_STYLE[task.priority]}`}>
              {task.priority}
            </span>
            {task.milestone && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                <Flag className="w-2.5 h-2.5" />
                {task.milestone}
              </span>
            )}
            {task.estimatedEffort && (
              <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                <Clock className="w-2.5 h-2.5" />
                {task.estimatedEffort}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-[#0a192f] leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onApprove}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-xs font-bold hover:bg-blue-900 transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
        >
          <Check className="w-3 h-3" />
          Approve
        </button>
        <button
          onClick={onDismiss}
          disabled={disabled}
          className="px-3 py-1.5 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-100 transition-colors active:scale-95 disabled:opacity-40"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

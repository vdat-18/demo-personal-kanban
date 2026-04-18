'use client'

import { Check, X, Flag, Clock } from 'lucide-react'
import type { StructuredTaskProposal } from '@/types/domain'

interface TaskProposalCardProps {
  task: StructuredTaskProposal
  status?: 'pending' | 'approved' | 'dismissed'
  onApprove: () => void
  onDismiss: () => void
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
 * Per Tier 2.7 the user approves tasks one by one — flow stays simple and
 * explicit on purpose.
 */
export function TaskProposalCard({
  task,
  status = 'pending',
  onApprove,
  onDismiss,
  disabled,
}: TaskProposalCardProps) {
  if (status === 'approved') {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50/40 px-4 py-2.5 flex items-center gap-2 text-xs">
        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
        <span className="font-semibold text-green-700 truncate">{task.title}</span>
        <span className="ml-auto text-[10px] text-green-600/70 uppercase tracking-wider font-black">
          Approved
        </span>
      </div>
    )
  }

  if (status === 'dismissed') {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-2.5 flex items-center gap-2 text-xs opacity-60">
        <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-500 line-through truncate">{task.title}</span>
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

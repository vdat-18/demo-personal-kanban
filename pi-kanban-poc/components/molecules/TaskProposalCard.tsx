'use client'

import { Check, X, Flag, Clock, RotateCcw } from 'lucide-react'
import type { StructuredTaskProposal } from '@/types/domain'
import { TASK_PRIORITY_LABEL } from '@/lib/display/labels'

interface TaskProposalCardProps {
  task: StructuredTaskProposal
  status?: 'pending' | 'approved' | 'dismissed'
  onApprove: () => void
  onDismiss: () => void
  onReset?: () => void
  disabled?: boolean
}

const PRIORITY_STYLE: Record<StructuredTaskProposal['priority'], string> = {
  LOW: 'bg-surface-muted text-ink-muted',
  MEDIUM: 'bg-brand-subtle text-brand',
  HIGH: 'bg-warning-bg text-warning',
  URGENT: 'bg-danger-bg text-danger',
}

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
      <div className="rounded-xl border border-success-border bg-success-bg/60 px-4 py-3 flex items-center gap-2 text-meta shadow-sm">
        <Check className="w-3.5 h-3.5 text-success shrink-0" />
        <span className="font-semibold text-success truncate flex-1">{task.title}</span>
        <span className="text-micro text-success">Approved</span>
        {onReset && (
          <button
            onClick={onReset}
            disabled={disabled}
            title="Move back to pending"
            className="p-1 rounded-lg text-success/70 hover:text-success hover:bg-success-bg transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  if (status === 'dismissed') {
    return (
      <div className="rounded-xl border border-line bg-surface-muted/60 px-4 py-3 flex items-center gap-2 text-meta shadow-sm">
        <X className="w-3.5 h-3.5 text-ink-subtle shrink-0" />
        <span className="text-ink-subtle line-through truncate flex-1">{task.title}</span>
        {onReset && (
          <button
            onClick={onReset}
            disabled={disabled}
            title="Restore to pending"
            className="p-1 rounded-lg text-ink-subtle hover:text-ink-muted hover:bg-surface-muted transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-micro normal-case px-2 py-0.5 rounded-md ${PRIORITY_STYLE[task.priority]}`}>
              {TASK_PRIORITY_LABEL[task.priority] ?? task.priority}
            </span>
            {task.milestone && (
              <span className="flex items-center gap-1 text-meta text-ink-muted">
                <Flag className="w-3 h-3" />
                {task.milestone}
              </span>
            )}
            {task.estimatedEffort && (
              <span className="flex items-center gap-1 text-meta text-ink-muted">
                <Clock className="w-3 h-3" />
                {task.estimatedEffort}
              </span>
            )}
          </div>
          <p className="text-h2 text-ink leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-meta text-ink-muted mt-1.5 leading-relaxed">{task.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onApprove}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
        >
          <Check className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          onClick={onDismiss}
          disabled={disabled}
          className="px-3 py-2 rounded-xl text-ink-muted text-meta font-semibold hover:bg-surface-muted transition-colors active:scale-95 disabled:opacity-40"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

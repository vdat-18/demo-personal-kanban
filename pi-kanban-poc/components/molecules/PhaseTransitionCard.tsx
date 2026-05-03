'use client'

import { Sparkles, ChevronRight, Undo2 } from 'lucide-react'
import type { PlanningPhase } from '@/types/domain'
import { PHASE_DISPLAY } from '@/constants/phases'

interface PhaseTransitionCardProps {
  suggestedPhase: PlanningPhase
  currentPhase: PlanningPhase
  reason?: string | null
  response?: 'accepted' | 'rejected' | null
  isUserJump?: boolean
  isBackward?: boolean
  onAccept: () => void
  onReject: () => void
  disabled?: boolean
}

export function PhaseTransitionCard({
  suggestedPhase,
  currentPhase,
  reason,
  response,
  isUserJump,
  isBackward,
  onAccept,
  onReject,
  disabled,
}: PhaseTransitionCardProps) {
  const display = PHASE_DISPLAY[suggestedPhase]
  const current = PHASE_DISPLAY[currentPhase]
  const Icon = isBackward ? Undo2 : Sparkles

  if (response === 'accepted') {
    return (
      <div className="mt-3 rounded-xl border border-success-border bg-success-bg/60 px-5 py-3 flex items-center gap-3 text-meta font-semibold text-success">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          Moved from &quot;{current.label}&quot; → &quot;{display.label}&quot;
        </span>
      </div>
    )
  }

  if (response === 'rejected') {
    return (
      <div className="mt-3 rounded-xl border border-line bg-surface-muted/60 px-5 py-3 flex items-center gap-3 text-meta text-ink-muted">
        <span>You chose to stay on &quot;{current.label}&quot; for now.</span>
      </div>
    )
  }

  const isWarning = isBackward
  return (
    <div
      className={`mt-3 rounded-xl border-2 overflow-hidden shadow-sm ${
        isWarning ? 'border-warning-border bg-warning-bg/40' : 'border-brand-border bg-brand-subtle/40'
      }`}
    >
      <div
        className={`px-5 py-3 border-b flex items-center gap-2 ${
          isWarning ? 'border-warning-border bg-warning-bg/60' : 'border-brand-border bg-brand-subtle/60'
        }`}
      >
        <Icon className={`w-4 h-4 ${isWarning ? 'text-warning' : 'text-brand'}`} />
        <span
          className={`text-micro normal-case font-semibold ${
            isWarning ? 'text-warning' : 'text-brand'
          }`}
        >
          {isBackward
            ? `Revisit "${display.label}"`
            : isUserJump
            ? `Jump to "${display.label}"`
            : `Ready to move to "${display.label}"?`}
        </span>
      </div>
      <div className="p-5">
        {reason && <p className="text-body text-ink leading-relaxed mb-3">{reason}</p>}
        <div className="text-meta text-ink-muted mb-4">
          <span className="font-semibold text-ink">What happens next: </span>
          {display.description}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            disabled={disabled}
            className={`flex-1 px-4 py-2.5 rounded-xl text-meta font-semibold text-white transition-colors active:scale-[0.98] disabled:opacity-40 shadow-sm ${
              isWarning ? 'bg-warning hover:opacity-90' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            👍 {isBackward ? 'Yes, revisit' : "Yes, let's go"}
            <ChevronRight className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="px-4 py-2.5 rounded-xl text-meta font-semibold text-ink-muted bg-surface border border-line hover:bg-surface-muted transition-colors active:scale-[0.98] disabled:opacity-40"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}

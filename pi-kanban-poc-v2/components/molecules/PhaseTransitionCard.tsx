'use client'

import { Sparkles, ChevronRight, Undo2 } from 'lucide-react'
import type { PlanningPhase } from '@/types/domain'
import { PHASE_DISPLAY } from '@/constants/phases'

interface PhaseTransitionCardProps {
  /** The phase the agent proposes moving to. */
  suggestedPhase: PlanningPhase
  /** The current phase (for labelling). */
  currentPhase: PlanningPhase
  /** Agent's short human-readable reason for the transition. */
  reason?: string | null
  /** User's prior response if the card is already resolved. */
  response?: 'accepted' | 'rejected' | null
  /** True when the agent was asked to jump by the user (confirmation flow). */
  isUserJump?: boolean
  /** True when jumping backward (revisit). */
  isBackward?: boolean
  onAccept: () => void
  onReject: () => void
  disabled?: boolean
}

/**
 * Rendered below the assistant message whenever the envelope reports
 * readyForNextPhase=true (or the user asked to jump).
 *
 * The card style intentionally differs from a regular chat bubble so the user
 * knows this is a decision point (Tier 2.5).
 */
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
      <div className="mt-3 rounded-3xl border border-green-100 bg-green-50/40 px-5 py-3 flex items-center gap-3 text-xs font-semibold text-green-700">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          Moved from &quot;{current.label}&quot; → &quot;{display.label}&quot;
        </span>
      </div>
    )
  }

  if (response === 'rejected') {
    return (
      <div className="mt-3 rounded-3xl border border-slate-100 bg-slate-50/40 px-5 py-3 flex items-center gap-3 text-xs text-slate-500">
        <span>You chose to stay on &quot;{current.label}&quot; for now.</span>
      </div>
    )
  }

  return (
    <div className={`mt-3 rounded-3xl border-2 overflow-hidden shadow-md ${
      isBackward ? 'border-amber-200 bg-amber-50/40' : 'border-indigo-200 bg-indigo-50/30'
    }`}>
      <div className={`px-5 py-3 border-b flex items-center gap-2 ${
        isBackward ? 'border-amber-100 bg-amber-50/60' : 'border-indigo-100 bg-indigo-50/60'
      }`}>
        <Icon className={`w-4 h-4 ${isBackward ? 'text-amber-600' : 'text-indigo-600'}`} />
        <span className={`text-[11px] font-black uppercase tracking-[0.15em] ${
          isBackward ? 'text-amber-700' : 'text-indigo-700'
        }`}>
          {isBackward
            ? `Revisit "${display.label}"`
            : isUserJump
              ? `Jump to "${display.label}"`
              : `Ready to move to "${display.label}"?`}
        </span>
      </div>
      <div className="p-5">
        {reason && (
          <p className="text-sm text-slate-700 leading-relaxed mb-3">{reason}</p>
        )}
        <div className="text-xs text-slate-500 mb-4">
          <span className="font-semibold text-slate-700">What happens next: </span>
          {display.description}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAccept}
            disabled={disabled}
            className={`flex-1 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95 disabled:opacity-40 shadow-md ${
              isBackward
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
          >
            👍 {isBackward ? 'Yes, revisit' : "Yes, let's go"}
            <ChevronRight className="inline w-3.5 h-3.5 ml-1 -mt-0.5" />
          </button>
          <button
            onClick={onReject}
            disabled={disabled}
            className="px-4 py-3 rounded-2xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors active:scale-95 disabled:opacity-40"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'

/**
 * Inline mini-chat for refining an already-approved subtask list (Tier 3.12).
 *
 * Shown when the user clicks "✨ Refine" on a task that already has subtasks.
 * The "Common asks" dropdown gives non-tech users a fast template; they can
 * still type freeform.
 */

const COMMON_ASKS: string[] = [
  'Add more detail to a specific step',
  'Split a big step into smaller ones',
  'Add missing steps',
  'Remove a step I don’t need',
  'Change the order of the steps',
  'Re-estimate the time',
]

export interface BreakdownRefineDialogProps {
  /** Number of currently approved subtasks (for context display). */
  subtaskCount: number
  onSubmit: (request: string) => void
  onCancel: () => void
  disabled?: boolean
}

export function BreakdownRefineDialog({
  subtaskCount,
  onSubmit,
  onCancel,
  disabled,
}: BreakdownRefineDialogProps) {
  const [text, setText] = useState('')
  const [showAsks, setShowAsks] = useState(false)

  const submit = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onSubmit(trimmed)
  }

  return (
    <div
      className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/40 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2.5 bg-white/50 border-b border-violet-100 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-[10px] font-black text-violet-700 uppercase tracking-[0.15em] flex-1">
          Refine with AI ({subtaskCount} step{subtaskCount === 1 ? '' : 's'})
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="What would you like to change? E.g. 'Split step 2 into smaller parts, add a step for asking my friend for referrals…'"
          rows={3}
          className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs text-[#0a192f] placeholder:text-slate-400 resize-none outline-none focus:border-violet-400"
          disabled={disabled}
        />

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAsks((v) => !v)
            }}
            className="text-[10px] font-bold text-violet-600 hover:text-violet-700 underline"
          >
            Common asks ▼
          </button>
          {showAsks && (
            <div className="absolute z-10 mt-1 w-full rounded-xl bg-white border border-violet-200 shadow-lg overflow-hidden">
              {COMMON_ASKS.map((ask) => (
                <button
                  key={ask}
                  onClick={(e) => {
                    e.stopPropagation()
                    setText(ask + ': ')
                    setShowAsks(false)
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-violet-50 transition-colors"
                >
                  {ask}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
            disabled={disabled}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-white/60 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              submit()
            }}
            disabled={disabled || text.trim().length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-violet-700 transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
          >
            <Send className="w-3 h-3" />
            Send to AI
          </button>
        </div>
      </div>
    </div>
  )
}

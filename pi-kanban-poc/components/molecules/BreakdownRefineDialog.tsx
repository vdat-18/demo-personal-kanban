'use client'

import { useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'

const COMMON_ASKS: string[] = [
  'Add more detail to a specific step',
  'Split a big step into smaller ones',
  'Add missing steps',
  'Remove a step I don’t need',
  'Change the order of the steps',
  'Re-estimate the time',
]

export interface BreakdownRefineDialogProps {
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
      className="mt-3 rounded-xl border border-brand-border bg-brand-subtle/40 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-2.5 bg-surface/50 border-b border-brand-border flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-brand" />
        <span className="text-meta font-semibold text-brand flex-1">
          Refine with AI ({subtaskCount} step{subtaskCount === 1 ? '' : 's'})
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          className="p-1 rounded-lg text-ink-subtle hover:text-ink hover:bg-surface transition-colors"
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
          placeholder="What would you like to change? E.g. 'Split step 2, add a step for asking my friend for referrals…'"
          rows={3}
          className="w-full bg-surface border border-brand-border rounded-xl px-3 py-2 text-meta text-ink placeholder:text-ink-subtle resize-none outline-none focus:border-brand"
          disabled={disabled}
        />

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAsks((v) => !v)
            }}
            className="text-meta font-semibold text-brand hover:text-brand-hover underline"
          >
            Common asks ▼
          </button>
          {showAsks && (
            <div className="absolute z-10 mt-1 w-full rounded-xl bg-surface border border-brand-border shadow-md overflow-hidden">
              {COMMON_ASKS.map((ask) => (
                <button
                  key={ask}
                  onClick={(e) => {
                    e.stopPropagation()
                    setText(ask + ': ')
                    setShowAsks(false)
                  }}
                  className="w-full text-left px-3 py-2 text-meta font-semibold text-ink-muted hover:bg-brand-subtle transition-colors"
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
            className="px-3 py-1.5 rounded-lg text-meta font-semibold text-ink-muted hover:bg-surface transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              submit()
            }}
            disabled={disabled || text.trim().length === 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-95 disabled:opacity-40 shadow-sm"
          >
            <Send className="w-3 h-3" />
            Send to AI
          </button>
        </div>
      </div>
    </div>
  )
}

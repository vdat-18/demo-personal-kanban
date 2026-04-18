'use client'

import { Sparkles, X, Lightbulb, Loader2, RotateCcw } from 'lucide-react'

/**
 * Inline UI primitives used by the per-task breakdown flow (Tier 1.4 + 4.16).
 *
 * Kept as a single file because they're tightly coupled to TaskCard and never
 * used elsewhere — splitting into 4 separate components would be more noise
 * than value.
 */

// ─── Empty-state hint (Tier 4.16) ────────────────────────────────────────────

export interface BreakdownEmptyHintProps {
  onStart: () => void
  onDismissHint: () => void
  /** Apply pulse animation if the user has never seen the feature. */
  showPulse?: boolean
}

export function BreakdownEmptyHint({
  onStart,
  onDismissHint,
  showPulse,
}: BreakdownEmptyHintProps) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-2xl bg-blue-50/60 border border-blue-100 px-3.5 py-2.5">
      <Lightbulb className="w-3.5 h-3.5 text-blue-500 shrink-0" />
      <span className="text-[11px] text-blue-700 font-semibold flex-1 min-w-0">
        No steps yet — let AI break it down.
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStart()
        }}
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95 shadow-sm ${
          showPulse ? 'animate-pulse-soft' : ''
        }`}
        title="AI will break this task into 3-7 small steps. You approve before they're saved."
      >
        <Sparkles className="w-3 h-3" />
        Break down
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismissHint()
        }}
        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
        title="Hide this hint"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

// ─── Plain "Break down" / "Refine" button (when subtasks already exist) ──────

export interface BreakdownActionButtonProps {
  label?: string
  variant?: 'primary' | 'secondary'
  onClick: () => void
  disabled?: boolean
}

export function BreakdownActionButton({
  label = 'Break down',
  variant = 'primary',
  onClick,
  disabled,
}: BreakdownActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-40 ${
        variant === 'primary'
          ? 'bg-[#0a192f] text-white hover:bg-blue-700 shadow-sm'
          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
      title="AI will suggest subtasks. You approve before they're saved."
    >
      <Sparkles className="w-3 h-3" />
      {label}
    </button>
  )
}

// ─── Loading state ───────────────────────────────────────────────────────────

export interface BreakdownLoadingCardProps {
  /** Optional human-readable queue position ("queued — 2 ahead"). */
  queueLabel?: string | null
  onCancel?: () => void
}

export function BreakdownLoadingCard({ queueLabel, onCancel }: BreakdownLoadingCardProps) {
  return (
    <div className="mt-3 rounded-2xl bg-violet-50/60 border border-violet-100 px-4 py-3 flex items-center gap-3">
      <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-black text-violet-700 uppercase tracking-wider">
          {queueLabel ? '⏳ Queued' : '✨ AI is thinking…'}
        </div>
        <div className="text-[10px] text-violet-500 mt-0.5">
          {queueLabel ?? 'Breaking the task into steps'}
        </div>
      </div>
      {onCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          className="shrink-0 p-1.5 rounded-lg text-violet-400 hover:text-violet-700 hover:bg-white/60 transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Error state ─────────────────────────────────────────────────────────────

export interface BreakdownErrorCardProps {
  error: string
  onRetry: () => void
  onDismiss: () => void
}

export function BreakdownErrorCard({ error, onRetry, onDismiss }: BreakdownErrorCardProps) {
  return (
    <div className="mt-3 rounded-2xl bg-rose-50/60 border border-rose-100 px-4 py-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-[11px] font-black text-rose-700 uppercase tracking-wider">
          ❌ AI couldn’t finish
        </span>
      </div>
      <p className="text-[11px] text-rose-600 mb-3 leading-relaxed">{error}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 transition-colors active:scale-95"
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-white/60 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Cached suggestion banner (Tier 4.15) ─────────────────────────────────────

export interface CachedSuggestionBannerProps {
  generatedAt: string  // ISO
  count: number        // number of subtasks suggested
  onReview: () => void
  onRefresh: () => void
  onDismiss: () => void
}

export function CachedSuggestionBanner({
  generatedAt,
  count,
  onReview,
  onRefresh,
  onDismiss,
}: CachedSuggestionBannerProps) {
  const ago = formatTimeAgo(generatedAt)
  return (
    <div className="mt-3 rounded-2xl bg-amber-50/60 border border-amber-100 px-3.5 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span className="text-[11px] text-amber-800 font-semibold flex-1 min-w-0">
          {count} AI step{count === 1 ? '' : 's'} suggested {ago}.
        </span>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReview()
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition-colors"
        >
          Review
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRefresh()
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-700 hover:bg-white/60 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Refresh
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

'use client'

import { Sparkles, X, Lightbulb, Loader2, RotateCcw } from 'lucide-react'

export interface BreakdownEmptyHintProps {
  onStart: () => void
  onDismissHint: () => void
  showPulse?: boolean
}

export function BreakdownEmptyHint({
  onStart,
  onDismissHint,
  showPulse,
}: BreakdownEmptyHintProps) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-subtle/60 border border-brand-border px-3.5 py-2.5">
      <Lightbulb className="w-3.5 h-3.5 text-brand shrink-0" />
      <span className="text-meta text-brand font-semibold flex-1 min-w-0">
        No steps yet — let AI break it down.
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onStart()
        }}
        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-meta font-semibold hover:bg-brand-hover transition-colors active:scale-95 shadow-sm ${
          showPulse ? 'animate-pulse' : ''
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
        className="shrink-0 p-1 rounded-lg text-ink-subtle hover:text-ink-muted hover:bg-surface-muted transition-colors"
        title="Hide this hint"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-meta font-semibold transition-colors active:scale-95 disabled:opacity-40 ${
        variant === 'primary'
          ? 'bg-brand text-white hover:bg-brand-hover shadow-sm'
          : 'bg-surface border border-line text-ink-muted hover:bg-surface-muted'
      }`}
      title="AI will suggest subtasks. You approve before they're saved."
    >
      <Sparkles className="w-3 h-3" />
      {label}
    </button>
  )
}

export interface BreakdownLoadingCardProps {
  queueLabel?: string | null
  onCancel?: () => void
}

export function BreakdownLoadingCard({ queueLabel, onCancel }: BreakdownLoadingCardProps) {
  return (
    <div className="mt-3 rounded-xl bg-brand-subtle/60 border border-brand-border px-4 py-3 flex items-center gap-3">
      <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-meta font-semibold text-brand">
          {queueLabel ? '⏳ Queued' : '✨ AI is thinking…'}
        </div>
        <div className="text-meta text-brand/70 mt-0.5">
          {queueLabel ?? 'Breaking the task into steps'}
        </div>
      </div>
      {onCancel && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel()
          }}
          className="shrink-0 p-1.5 rounded-lg text-brand/70 hover:text-brand hover:bg-brand-subtle transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export interface BreakdownErrorCardProps {
  error: string
  onRetry: () => void
  onDismiss: () => void
}

export function BreakdownErrorCard({ error, onRetry, onDismiss }: BreakdownErrorCardProps) {
  return (
    <div className="mt-3 rounded-xl bg-danger-bg border border-danger-border px-4 py-3">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-meta font-semibold text-danger">❌ AI couldn&apos;t finish</span>
      </div>
      <p className="text-meta text-danger mb-3 leading-relaxed">{error}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRetry()
          }}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-danger text-white text-meta font-semibold hover:opacity-90 transition-opacity active:scale-95"
        >
          <RotateCcw className="w-3 h-3" />
          Retry
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="px-3 py-1.5 rounded-lg text-meta font-semibold text-ink-muted hover:bg-surface-muted transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export interface CachedSuggestionBannerProps {
  generatedAt: string
  count: number
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
    <div className="mt-3 rounded-xl bg-warning-bg/60 border border-warning-border px-3.5 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-warning shrink-0" />
        <span className="text-meta text-warning font-semibold flex-1 min-w-0">
          {count} AI step{count === 1 ? '' : 's'} suggested {ago}.
        </span>
      </div>
      <div className="flex items-center gap-2 ml-5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onReview()
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning text-white text-meta font-semibold hover:opacity-90 transition-opacity"
        >
          Review
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRefresh()
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-meta font-semibold text-warning hover:bg-warning-bg transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Refresh
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="ml-auto p-1 rounded-lg text-ink-subtle hover:text-ink-muted hover:bg-surface-muted transition-colors"
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

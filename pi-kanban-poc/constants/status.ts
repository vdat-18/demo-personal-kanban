// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONSTANTS — color tokens for kanban statuses.
// Single source of truth — semantic mapping:
//   TODO        → neutral (stone)
//   IN_PROGRESS → info (brand blue)
//   IN_REVIEW   → warning (amber)
//   DONE        → success (emerald)
//   BLOCKED     → danger (red, muted)
// ─────────────────────────────────────────────────────────────────────────────

import type { UITaskStatus } from '@/types/domain'

/** Bordered chip — used in kanban board, directory, chat. */
export const STATUS_COLORS: Record<UITaskStatus, string> = {
  TODO: 'bg-surface-muted text-ink-muted border-line',
  IN_PROGRESS: 'bg-info-bg text-info border-info-border',
  IN_REVIEW: 'bg-warning-bg text-warning border-warning-border',
  DONE: 'bg-success-bg text-success border-success-border',
  BLOCKED: 'bg-danger-bg text-danger border-danger-border',
}

/** Compact chip (no border) — used in chat header, summary. */
export const STATUS_COLORS_COMPACT: Record<UITaskStatus, string> = {
  TODO: 'bg-surface-muted text-ink-muted',
  IN_PROGRESS: 'bg-info-bg text-info',
  IN_REVIEW: 'bg-warning-bg text-warning',
  DONE: 'bg-success-bg text-success',
  BLOCKED: 'bg-danger-bg text-danger',
}

/** Solid dot color — used in column header, task row indicators. */
export const STATUS_DOT: Record<UITaskStatus, string> = {
  TODO: 'bg-ink-subtle',
  IN_PROGRESS: 'bg-brand',
  IN_REVIEW: 'bg-spark',
  DONE: 'bg-success',
  BLOCKED: 'bg-danger',
}

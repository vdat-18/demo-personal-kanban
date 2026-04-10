// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONSTANTS — shared status color maps for UI components
// ─────────────────────────────────────────────────────────────────────────────

import type { UITaskStatus } from '@/types/domain'

/**
 * Status → Tailwind class mapping used in kanban board, directory, and chat views.
 * Includes background, text, and border classes for bordered badges.
 */
export const STATUS_COLORS: Record<UITaskStatus, string> = {
  TODO: 'bg-slate-50 text-slate-500 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-600 border-blue-200',
  IN_REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  DONE: 'bg-green-50 text-green-600 border-green-200',
  BLOCKED: 'bg-red-50 text-red-400 border-red-200',
}

/**
 * Compact status color mapping (no border) used in chat and summary views.
 */
export const STATUS_COLORS_COMPACT: Record<UITaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-600',
}

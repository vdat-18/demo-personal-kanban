/**
 * Format helpers — wrap labels with tone + display metadata.
 *
 * Usage:
 *   const { label, tone } = formatTaskStatus(task.status)
 *   <Chip tone={tone}>{label}</Chip>
 */

import type { TaskStatus, TaskPriority } from '@/types/domain'
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TONE,
  REVIEWER_VERDICT_LABEL,
  REVIEWER_VERDICT_TONE,
  AGENT_ROLE_LABEL,
  SUBTASK_APPROVAL_LABEL,
  ERROR_MESSAGE,
  type ReviewerVerdict,
  type AgentErrorCode,
} from './labels'

export interface DisplayChip<T extends string = string> {
  label: string
  tone: T
}

export function formatTaskStatus(status: TaskStatus): DisplayChip<'slate' | 'blue' | 'amber' | 'green' | 'gray'> {
  return {
    label: TASK_STATUS_LABEL[status] ?? status,
    tone: TASK_STATUS_TONE[status] ?? 'slate',
  }
}

export function formatPriority(priority: TaskPriority): DisplayChip<'red' | 'orange' | 'slate' | 'gray'> {
  return {
    label: TASK_PRIORITY_LABEL[priority] ?? priority,
    tone: TASK_PRIORITY_TONE[priority] ?? 'slate',
  }
}

export function formatVerdict(verdict: ReviewerVerdict | string): DisplayChip<'green' | 'amber' | 'orange' | 'red' | 'slate'> {
  const v = verdict as ReviewerVerdict
  return {
    label: REVIEWER_VERDICT_LABEL[v] ?? String(verdict),
    tone: REVIEWER_VERDICT_TONE[v] ?? 'slate',
  }
}

export function formatAgentRole(role: string): string {
  return AGENT_ROLE_LABEL[role] ?? role
}

export function formatSubtaskApproval(status: 'pending' | 'approved' | 'denied'): string {
  return SUBTASK_APPROVAL_LABEL[status] ?? status
}

/**
 * Translate any error (raw string, Error, or known AgentErrorCode) into a
 * friendly Vietnamese message. Dev console keeps the original.
 */
export function formatError(err: unknown): string {
  if (err == null) return ERROR_MESSAGE.E_UNKNOWN

  // AbortError is normal user cancellation.
  if (err instanceof Error) {
    if (err.name === 'AbortError') return ERROR_MESSAGE.E_ABORTED
  }

  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()

  // Known error codes from server
  if (raw.startsWith('E_') && raw in ERROR_MESSAGE) {
    return ERROR_MESSAGE[raw as AgentErrorCode]
  }

  // Heuristic mapping from raw message patterns
  if (lower.includes('aborted') || lower.includes('cancel')) return ERROR_MESSAGE.E_ABORTED
  if (lower.includes('timeout') || lower.includes('timed out')) return ERROR_MESSAGE.E_TIMEOUT
  if (lower.includes('rate') && lower.includes('limit')) return ERROR_MESSAGE.E_RATE_LIMIT
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch'))
    return ERROR_MESSAGE.E_NETWORK
  if (lower.includes('json')) return ERROR_MESSAGE.E_INVALID_JSON
  if (lower.includes('parse')) return ERROR_MESSAGE.E_NO_JSON_FOUND
  if (lower.includes('500') || lower.includes('502') || lower.includes('503'))
    return ERROR_MESSAGE.E_NETWORK

  // Fallback: original message — but only if it looks short and presentable
  if (raw.length > 0 && raw.length < 200) return raw
  return ERROR_MESSAGE.E_UNKNOWN
}

/** Tailwind class fragments for each tone — use in chips/badges. */
export const TONE_CLASS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  gray: 'bg-gray-100 text-gray-600 border-gray-200',
  red: 'bg-rose-100 text-rose-800 border-rose-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function toneClass(tone: string): string {
  return TONE_CLASS[tone] ?? TONE_CLASS.slate
}

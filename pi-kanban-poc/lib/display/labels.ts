/**
 * Centralized UI labels — Vietnamese for non-tech users.
 *
 * Rules:
 * - Domain enum (TaskStatus, TaskPriority, etc.) is SOURCE OF TRUTH stored in zustand.
 * - This file maps enum → friendly label.
 * - To localize later (EN, JP) — only change values here.
 * - AI prompts keep English enum (model understands better).
 */

import type { TaskStatus, TaskPriority } from '@/types/domain'

// ── Task Status ──────────────────────────────────────────────────────────

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
}

export const TASK_STATUS_TONE: Record<TaskStatus, 'slate' | 'blue' | 'amber' | 'green' | 'gray'> = {
  TODO: 'slate',
  IN_PROGRESS: 'blue',
  IN_REVIEW: 'amber',
  DONE: 'green',
  BLOCKED: 'gray',
}

// ── Task Priority ────────────────────────────────────────────────────────

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
}

export const TASK_PRIORITY_TONE: Record<TaskPriority, 'red' | 'orange' | 'slate' | 'gray'> = {
  URGENT: 'red',
  HIGH: 'orange',
  MEDIUM: 'slate',
  LOW: 'gray',
}

// ── Reviewer Verdict ─────────────────────────────────────────────────────

export type ReviewerVerdict = 'approve' | 'minor_revision' | 'major_revision' | 'replan_needed'

export const REVIEWER_VERDICT_LABEL: Record<ReviewerVerdict, string> = {
  approve: 'Approved',
  minor_revision: 'Minor revision',
  major_revision: 'Major revision',
  replan_needed: 'Replan needed',
}

export const REVIEWER_VERDICT_TONE: Record<ReviewerVerdict, 'green' | 'amber' | 'orange' | 'red'> = {
  approve: 'green',
  minor_revision: 'amber',
  major_revision: 'orange',
  replan_needed: 'red',
}

// ── Agent Roles ──────────────────────────────────────────────────────────

export const AGENT_ROLE_LABEL: Record<string, string> = {
  'Step Planner': 'AI Planner',
  'Doer Agent': 'AI Doer',
  'Reviewer Agent': 'AI Reviewer',
  'Reporter Agent': 'AI Reporter',
  step_planner: 'AI Planner',
  doer: 'AI Doer',
  reviewer: 'AI Reviewer',
  reporter: 'AI Reporter',
}

// ── Subtask Approval Status ──────────────────────────────────────────────

export const SUBTASK_APPROVAL_LABEL: Record<'pending' | 'approved' | 'denied', string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
}

// ── Error Codes ──────────────────────────────────────────────────────────

export type AgentErrorCode =
  | 'E_EMPTY_RESPONSE'
  | 'E_NO_JSON_FOUND'
  | 'E_INVALID_JSON'
  | 'E_MISSING_REQUIRED_FIELDS'
  | 'E_SCHEMA_MISMATCH'
  | 'E_NETWORK'
  | 'E_TIMEOUT'
  | 'E_RATE_LIMIT'
  | 'E_ABORTED'
  | 'E_UNKNOWN'

export const ERROR_MESSAGE: Record<AgentErrorCode, string> = {
  E_EMPTY_RESPONSE: 'AI did not respond. The prompt may be too complex — try a shorter version.',
  E_NO_JSON_FOUND: 'AI returned plain text instead of the expected format. Try again or clarify the task.',
  E_INVALID_JSON: 'AI returned a malformed response. Try again — it usually works on the second attempt.',
  E_MISSING_REQUIRED_FIELDS: 'AI omitted required information. Try rephrasing the prompt more clearly.',
  E_SCHEMA_MISMATCH: 'AI returned an unexpected format. Please try again.',
  E_NETWORK: 'Lost connection to AI. Check your network and try again.',
  E_TIMEOUT: 'AI took too long to respond. Try a shorter question.',
  E_RATE_LIMIT: 'Too many requests. Wait a minute and try again.',
  E_ABORTED: 'Cancelled.',
  E_UNKNOWN: 'An error occurred. Please try again.',
}

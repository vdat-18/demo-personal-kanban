/**
 * Frontend ↔ DB status mapping utility.
 *
 * The Prisma schema uses `TaskStatus` (TODO, IN_PROGRESS, …) while the frontend
 * kanban board uses lowercase names (todo, doing, …). This module provides
 * bidirectional conversion plus lifecycle-aware transition helpers that operate
 * in frontend terms, so components never need to import from the DB layer.
 */

import type { LegacyTaskStatus as TaskStatus } from '@/types/domain'
import { getAllowedTransitions } from '@/lib/status-lifecycle'
import type { TaskStatusValue } from '@/lib/status-lifecycle'

// ─────────────────────────────────────────────────────────────────────────────
// Bidirectional mapping tables
// ─────────────────────────────────────────────────────────────────────────────

const FRONTEND_TO_DB: Record<TaskStatus, TaskStatusValue> = {
  todo:      'TODO',
  planning:  'TODO',        // "planning" is a frontend-only sub-state of TODO
  doing:     'IN_PROGRESS',
  review:    'IN_REVIEW',
  done:      'DONE',
  cancelled: 'BLOCKED',
}

const DB_TO_FRONTEND: Record<TaskStatusValue, TaskStatus> = {
  TODO:        'todo',
  IN_PROGRESS: 'doing',
  IN_REVIEW:   'review',
  DONE:        'done',
  BLOCKED:     'cancelled',
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a frontend status to its database (Prisma) equivalent.
 * @throws TypeError if the status is not recognised.
 */
export function toDbStatus(frontendStatus: string): TaskStatusValue {
  const result = FRONTEND_TO_DB[frontendStatus as TaskStatus]
  if (!result) {
    throw new TypeError(`Unknown frontend status: "${frontendStatus}"`)
  }
  return result
}

/**
 * Convert a database (Prisma) status to its frontend equivalent.
 * @throws TypeError if the status is not recognised.
 */
export function toFrontendStatus(dbStatus: string): TaskStatus {
  const result = DB_TO_FRONTEND[dbStatus as TaskStatusValue]
  if (!result) {
    throw new TypeError(`Unknown DB status: "${dbStatus}"`)
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Transition helpers (in frontend terms)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of frontend statuses a task can transition to from `frontendStatus`.
 * Delegates to the canonical `TRANSITION_MAP` via `getAllowedTransitions()`.
 */
export function getAllowedFrontendTransitions(frontendStatus: string): TaskStatus[] {
  const dbStatus = toDbStatus(frontendStatus)
  const allowedDb = getAllowedTransitions(dbStatus)
  return allowedDb.map((s) => toFrontendStatus(s))
}

/**
 * Returns the list of DB statuses a task can transition to from `dbStatus`,
 * keeping everything in DB terms. Thin convenience re-export for components
 * that already work in DB-level statuses.
 */
export function getAllowedDbTransitions(dbStatus: string): TaskStatusValue[] {
  return getAllowedTransitions(dbStatus as TaskStatusValue)
}

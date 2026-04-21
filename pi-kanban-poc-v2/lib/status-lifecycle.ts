/**
 * Task Status Lifecycle — single source of truth for valid status transitions.
 *
 * Importable by both server (API routes, DB layer, agent tools) and client
 * (React components) code. Uses string literals matching the Prisma TaskStatus
 * enum so it works on both sides without importing from generated Prisma client.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Status type (matches Prisma TaskStatus enum values)
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatusValue = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

// ─────────────────────────────────────────────────────────────────────────────
// Transition map — defines every valid (from → to) edge
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSITION_MAP: Record<TaskStatusValue, TaskStatusValue[]> = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'TODO', 'BLOCKED'],
  IN_REVIEW:   ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE:        [],           // terminal — no transitions out
  BLOCKED:     ['TODO'],     // restore only
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of statuses a task can transition to from `from`.
 */
export function getAllowedTransitions(from: TaskStatusValue): TaskStatusValue[] {
  return TRANSITION_MAP[from] ?? []
}

/**
 * Validates whether a transition from `from` to `to` is allowed.
 */
export function validateTransition(
  from: TaskStatusValue,
  to: TaskStatusValue,
): { valid: boolean; allowed: TaskStatusValue[]; message?: string } {
  const allowed = getAllowedTransitions(from)

  if (from === to) {
    return { valid: true, allowed } // no-op transition is always fine
  }

  if (allowed.includes(to)) {
    return { valid: true, allowed }
  }

  const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal status)'
  return {
    valid: false,
    allowed,
    message: `Invalid transition: ${from} → ${to}. Allowed transitions from ${from}: ${allowedStr}.`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  public readonly from: TaskStatusValue
  public readonly to: TaskStatusValue
  public readonly allowed: TaskStatusValue[]

  constructor(from: TaskStatusValue, to: TaskStatusValue, allowed: TaskStatusValue[]) {
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'none (terminal status)'
    super(`Invalid transition: ${from} → ${to}. Allowed transitions from ${from}: ${allowedStr}.`)
    this.name = 'InvalidTransitionError'
    this.from = from
    this.to = to
    this.allowed = allowed
  }
}

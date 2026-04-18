// Agent role labels — kept as semantic hints. The unified /api/agent endpoint
// handles routing internally based on the request's `mode` field.
//
// Note (Tier 4.13): The TODO column's role was renamed from "architect" to
// "breakdown" so the codebase no longer uses software-engineering jargon for
// non-tech users. The IN_PROGRESS / IN_REVIEW roles are kept for now since
// those columns are out of scope for the current breakdown rework.
export type AgentRole = 'breakdown' | 'developer' | 'reviewer'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'

export type AutoModeStatus = 'idle' | 'running' | 'error' | 'disabled'

export interface AutoModeColumnState {
  enabled: boolean
  status: AutoModeStatus
  activeTaskId: string | null
  error: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Columns that previously supported "Auto mode". After the per-task breakdown
 * rework (Tier 1.4), the TODO column no longer exposes a column-level toggle —
 * it's been replaced by per-card "✨ Break down" buttons. We keep this array
 * for IN_PROGRESS / IN_REVIEW which still use the legacy column-level flow.
 */
export const AUTO_MODE_COLUMNS: TaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW']

/**
 * Maps each actionable column to the agent role that handles it.
 * TODO is intentionally not in this map — it's served via the per-task
 * breakdown pipeline, not the column-level auto-mode loop.
 */
export const COLUMN_AGENT_MAP: Record<string, AgentRole> = {
  IN_PROGRESS: 'developer',
  IN_REVIEW: 'reviewer',
}

/** Default prompts sent as the "user message" for each column's agent. */
export const DEFAULT_PROMPTS: Record<string, string> = {
  IN_PROGRESS:
    'Check the subtasks list. Find the first PENDING subtask and execute it completely — deliver the actual output (code, content, analysis, etc.), save your output via subtask_update, then move on to the next PENDING subtask. Continue until all subtasks are completed, then write the Master Report and transition to IN_REVIEW.',
  IN_REVIEW:
    'Review all the work produced for this task. Read the Master Report and any previous subtask outputs carefully. Write a structured Quality Review Report assessing correctness, completeness, and quality. Then call task_update to either approve (DONE) or request changes (IN_PROGRESS).',
}

/** Initial state for a column with auto mode disabled. */
export function createInitialColumnState(): AutoModeColumnState {
  return {
    enabled: false,
    status: 'disabled',
    activeTaskId: null,
    error: null,
  }
}

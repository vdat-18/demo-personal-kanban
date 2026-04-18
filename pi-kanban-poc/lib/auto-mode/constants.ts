import type { AgentRole } from '@/lib/agents/configs'

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

/** Columns that support auto mode (excludes DONE and BLOCKED) */
export const AUTO_MODE_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW']

/** Maps each actionable column to the agent role that handles it */
export const COLUMN_AGENT_MAP: Record<string, AgentRole> = {
  TODO: 'architect',
  IN_PROGRESS: 'developer',
  IN_REVIEW: 'reviewer',
}

/** Default prompts sent as the "user message" for each column's agent */
export const DEFAULT_PROMPTS: Record<string, string> = {
  TODO: 'Analyze this task carefully. If no subtasks exist yet, propose a detailed breakdown of 3-6 actionable subtasks with clear scope. If subtasks already exist, review them and confirm the plan is solid. Then transition the task to IN_PROGRESS.',
  IN_PROGRESS: 'Check the subtasks list. Find the first PENDING subtask and execute it completely — deliver the actual output (code, content, analysis, etc.), save your output via subtask_update, then move on to the next PENDING subtask. Continue until all subtasks are completed, then write the Master Report and transition to IN_REVIEW.',
  IN_REVIEW: 'Review all the work produced for this task. Read the Master Report and any previous subtask outputs carefully. Write a structured Quality Review Report assessing correctness, completeness, and quality. Then call task_update to either approve (DONE) or request changes (IN_PROGRESS).',
}

/** Initial state for a column with auto mode disabled */
export function createInitialColumnState(): AutoModeColumnState {
  return {
    enabled: false,
    status: 'disabled',
    activeTaskId: null,
    error: null,
  }
}

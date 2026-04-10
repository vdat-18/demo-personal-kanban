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
  TODO: 'Analyze this task and create a detailed plan. Break it down into actionable steps with clear requirements and acceptance criteria.',
  IN_PROGRESS: 'Implement this task based on its description and any prior planning conversations. Provide a thorough implementation with clear explanations.',
  IN_REVIEW: 'Review the implementation work done on this task. Check for correctness, quality, completeness, and suggest improvements if needed.',
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

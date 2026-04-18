// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN TYPES — single source of truth for all core data models
// No external dependencies — safe to import from anywhere
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus =
  | "todo"
  | "planning"
  | "doing"
  | "review"
  | "done"
  | "cancelled";

export type AgentHint =
  | "Planner Agent"
  | "Doer Agent"
  | "Reviewer Agent"
  | "Reporter Agent";

// ─────────────────────────────────────────────────────────────────────────────
// UI-layer types — used by frontend components
// These match the Prisma enum values (uppercase) used in API responses
// ─────────────────────────────────────────────────────────────────────────────

export type UITaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
export type UITaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'

export interface UITask {
  id: string
  title: string
  description: string | null
  status: UITaskStatus
  priority: UITaskPriority
  createdAt: string
  updatedAt: string
}

export interface UIProject {
  id: string
  name: string
  description: string | null
  tasks: UITask[]
}

export interface UIConversation {
  id: string
  messages: Array<{ role: string; content: string }>
  result: string | null
  tokenUsage: { input: number; output: number } | null
  createdAt: string
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

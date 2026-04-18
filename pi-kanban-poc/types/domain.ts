/**
 * Domain types — single source of truth for the client-side store.
 * No external dependencies. UPPERCASE enum vocabulary aligns with existing UI components.
 */

export type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'

// Legacy lowercase status — kept for compatibility with constants/agents.ts
export type LegacyTaskStatus =
  | 'todo'
  | 'planning'
  | 'doing'
  | 'review'
  | 'done'
  | 'cancelled'

export type AgentHint =
  | 'Planner Agent'
  | 'Doer Agent'
  | 'Reviewer Agent'
  | 'Reporter Agent'

export interface Project {
  id: string
  name: string
  description: string | null
  domain: ProjectDomain
  status: string | null
  createdAt: string
  updatedAt: string
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  output: string | null
  order: number
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface TokenUsage {
  input: number
  output: number
}

export interface Conversation {
  id: string
  taskId: string
  messages: ConversationMessage[]
  result: string | null
  tokenUsage: TokenUsage | null
  createdAt: string
  updatedAt: string
}

export interface MutationActionState {
  mutationIndex: number
  action: 'approved' | 'dismissed'
}

export interface PlanningMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokenUsage: TokenUsage | null
  createdAt: string
  mutationActions: MutationActionState[]
}

export interface PlanningThread {
  id: string
  projectId: string
  title: string
  phase: PlanningPhase
  visionDocument: string | null
  createdAt: string
  updatedAt: string
  lastMessage: string | null
  lastMessageAt: string | null
}

// UI-friendly aliases used by older components
export type UITaskStatus = TaskStatus
export type UITaskPriority = TaskPriority
export interface UITask extends Task {}
export interface UIProject extends Project {
  tasks: UITask[]
}
export interface UIConversation {
  id: string
  taskId?: string
  messages: ConversationMessage[]
  result: string | null
  tokenUsage: TokenUsage | null
  createdAt: string
  updatedAt?: string
}
export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

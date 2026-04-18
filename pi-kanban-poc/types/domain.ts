/**
 * Domain types — single source of truth for the client-side store.
 * No external dependencies. UPPERCASE enum vocabulary aligns with existing UI components.
 */

export type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS' | 'GENERAL'
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

// ─── Structured agent output (Tier 2.8) ──────────────────────────────────────
// The agent now returns a typed JSON envelope instead of raw text + regex markers.
// All optional fields default to null/empty when the agent has nothing to say.

export type StructuredQuestionInputType =
  | 'text'
  | 'chip_single'
  | 'chip_multi'
  | 'chip_plus_text'

export type QuestionDimension =
  | 'what'
  | 'why'
  | 'who'
  | 'when'
  | 'how'
  | 'constraint'

export interface StructuredQuestion {
  id: string
  dimension: QuestionDimension
  text: string
  hint: string | null
  inputType: StructuredQuestionInputType
  suggestions: string[] | null
  required: boolean
}

export interface StructuredTaskProposal {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  estimatedEffort: string | null
  milestone: string | null
  dependencies: string[] | null
}

export type DetectedUserIntent =
  | 'jump_phase'
  | 'revise_vision'
  | 'approve_all'
  | 'clarify_answer'
  | null

export interface AgentEnvelope {
  content: string
  visionDocument: string | null
  visionChanges: string[] | null
  readyForNextPhase: boolean
  suggestedPhase: PlanningPhase | null
  reasonForTransition: string | null
  detectedUserIntent: DetectedUserIntent
  targetPhase: PlanningPhase | null
  questions: StructuredQuestion[] | null
  tasks: StructuredTaskProposal[] | null
  metadata: {
    confidenceNote: string | null
    openQuestions: string[] | null
    whyProbesUsed?: number
  } | null
}

// ─── Question batch user replies (Tier 1.2) ──────────────────────────────────

export interface QuestionAnswer {
  questionId: string
  answer: string | null
  skipped: boolean
}

export interface QuestionBatchSubmission {
  questions: StructuredQuestion[]
  answers: QuestionAnswer[]
  submittedAt: string
}

// ─── Vision versions (Tier 3.11) ─────────────────────────────────────────────

export type VisionChangeType =
  | 'initial'
  | 'ai_draft'
  | 'user_direct_edit'
  | 'ai_via_chat'
  | 'phase_transition'
  | 'restored'

export interface VisionVersion {
  id: string
  threadId: string
  content: string
  createdAt: string
  createdBy: 'user' | 'ai'
  changeType: VisionChangeType
  summary: string | null
  diffFromPrevious: string[] | null
  triggerMessage: string | null
}

// ─── Planning entities ───────────────────────────────────────────────────────

export interface PlanningMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokenUsage: TokenUsage | null
  createdAt: string
  mutationActions: MutationActionState[]
  /**
   * Structured envelope returned by the agent (Tier 2.8). Only populated for
   * assistant messages produced by the new pipeline. Null for user/system
   * messages and legacy assistant messages persisted before the upgrade.
   */
  envelope?: AgentEnvelope | null
  /**
   * Question batch this message represents an answer submission for (user role).
   */
  batchSubmission?: QuestionBatchSubmission | null
  /**
   * Whether the user already responded to a phase-transition card embedded in
   * an assistant message. Stored on the assistant message itself.
   */
  phaseTransitionResponse?: 'accepted' | 'rejected' | null
  /**
   * Tracks per-task-proposal approval (separate from legacy mutationActions
   * which targets parsed-from-markdown mutations).
   */
  taskProposalActions?: Array<{
    taskId: string
    action: 'approved' | 'dismissed'
  }>
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
  /** Number of "why" probes the agent has used in the current phase (Tier 4.13). */
  whyProbesUsed?: number
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

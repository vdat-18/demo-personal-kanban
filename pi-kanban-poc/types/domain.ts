/**
 * Domain types — single source of truth for the client-side store.
 * No external dependencies. UPPERCASE enum vocabulary aligns with existing UI components.
 */

export type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS' | 'GENERAL'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'
/** Lifecycle of project planning — drives where Recent Journey navigates to. */
export type PlanningStatus = 'not_started' | 'in_progress' | 'completed'

// Legacy lowercase status — kept for compatibility with constants/agents.ts
export type LegacyTaskStatus =
  | 'todo'
  | 'planning'
  | 'doing'
  | 'review'
  | 'done'
  | 'cancelled'

export type AgentHint =
  | 'Step Planner'
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
  /** Tracks whether planning is complete so Home → Recent Journey can route
   *  intelligently (planning vs kanban). Defaults to 'not_started' for new
   *  projects, flips to 'in_progress' when first planning thread is created,
   *  and 'completed' when user clicks Start Execution. */
  planningStatus?: PlanningStatus
}

export type SubtaskType = 'research' | 'create' | 'communicate' | 'decide' | 'custom'

export type SubtaskApprovalStatus = 'pending' | 'approved' | 'denied'

export interface Subtask {
  id: string
  taskId: string
  title: string
  description?: string | null
  estimatedEffort?: string | null
  /** Category used by the UI to render a color chip. AI-suggested subtasks
   *  get one of research/create/communicate/decide; user-added ones default
   *  to 'custom'. Optional for legacy subtasks persisted before the Tier 2
   *  breakdown rework. */
  type?: SubtaskType | null
  /** True when the subtask originated from an AI breakdown suggestion that
   *  the user approved. Drives the "✨" badge in the UI. */
  aiGenerated?: boolean
  completed: boolean
  output: string | null
  order: number
  /** Approval status for subtask workflow - pending/approved/denied */
  approvalStatus?: SubtaskApprovalStatus | null
  /**
   * Richer artifact produced by the Doer Agent while executing this subtask.
   * `output` is kept as the plain-text quick path for backwards compatibility,
   * but the doer flow stores a structured record here so the UI can render a
   * proper "deliverable" card later (summary + full artifact + next step).
   */
  doerResult?: DoerResult | null
  /** Structured review artifact for this step once the Reviewer Agent has
   *  inspected it. Separate from doerResult so the UI can show both "what was
   *  produced" and "what quality concerns were found" side by side. */
  reviewResult?: ReviewerStepResult | null
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
  /** Set to true when the user explicitly dismissed the breakdown hint for
   *  this task (separate from the global dismiss flag). */
  hintDismissed?: boolean
  /**
   * Manual ordering within a project. Floating point so inserting between
   * two tasks only requires computing `(a.order + b.order) / 2`. When
   * absent (legacy rows) the UI falls back to `createdAt` ordering.
   */
  order?: number
  /**
   * ISO timestamp of the last status change. Used by the "Active task"
   * indicator to show e.g. "42m on this task". When absent, the UI uses
   * `updatedAt` as an approximation.
   */
  statusChangedAt?: string
  /**
   * Back-reference to the planning proposal this task was approved from,
   * so the Kanban can offer an "Undo approval" action that both deletes
   * the task AND flips the chat proposal card back to pending.
   */
  sourceProposal?: {
    messageId: string
    proposalId: string
  }
  /**
   * Reviewer auto-loop state (#9). Incremented every time the reviewer
   * completes a cycle on this task. When it hits MAX_REVIEW_ITERATIONS
   * without approve, the UI forces a human gate instead of continuing to
   * auto-send back to the Doer.
   */
  reviewIterationCount?: number
  /** Latest reviewer verdict for quick UI consumption, mirroring the
   *  field on ReviewerEnvelope. */
  lastReviewVerdict?: 'approve' | 'minor_revision' | 'major_revision' | 'replan_needed'
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
  /**
   * Lifecycle status (#4). Every snapshot starts as `draft`. The user can
   * explicitly `publish` a version to mark it as the authoritative plan.
   * Only one version per thread should be published at a time — newer
   * versions reset to draft again after a plan revision, prompting the
   * user to re-publish when they're happy.
   */
  status?: 'draft' | 'published'
  /** ISO timestamp when the user published this version, if applicable. */
  publishedAt?: string
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
    /** When action === 'approved', the id of the Task record that was
     *  created in the store. Stored so "Reset to pending" can roll back by
     *  deleting that task. Undefined for 'dismissed' actions. */
    createdTaskId?: string
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

// ─── Doer agent (IN_PROGRESS execution) ──────────────────────────────────────
// The Doer works at the granularity of a single active subtask. It returns a
// structured envelope so the client can persist artifacts into Subtask.output
// / Subtask.doerResult and advance the flow without brittle regex parsing.

export interface DoerResult {
  /** One-sentence summary shown inline in the step list / sidebar. */
  summary: string
  /** The actual deliverable artifact (draft, comparison notes, email copy,
   *  plan, etc.). Markdown allowed. */
  artifact: string
  /** Optional natural-language recommendation for what to do next. */
  nextAction: string | null
}

export interface DoerEnvelope {
  /** Short confirmation that the agent understood the current step. */
  stepUnderstanding: string
  /** Which subtask this result applies to. */
  targetSubtaskId: string | null
  /** Deliverable generated for that subtask. Null when blocked/clarifying. */
  result: DoerResult | null
  /**
   * When the agent lacks critical context, it should ask exactly one focused
   * question rather than hallucinating a deliverable.
   */
  needsHumanInput: { question: string } | null
  /** Whether the agent believes the current subtask is done well enough to be
   *  marked completed. The UI still lets the user confirm. */
  markSubtaskCompleted: boolean
  /** Whether all subtasks are now complete and the task is ready for review.
   *  The UI uses this to surface a clear "Send to review" CTA instead of
   *  auto-advancing status behind the user's back. */
  readyForReview: boolean
  /** Optional short summary spanning the whole task when all steps are done. */
  taskSummary: string | null
}

// ─── Reviewer agent (IN_REVIEW quality check) ────────────────────────────────

export interface ReviewerStepResult {
  summary: string
  /** Concrete problems / checks discovered for the step. Empty when the step
   *  looks good. */
  findings: string[]
  /** Short recommendation to improve or keep as-is. */
  recommendation: string | null
}

export interface ReviewerEnvelope {
  /** Brief confirmation of what the reviewer thinks this task is meant to achieve. */
  reviewUnderstanding: string
  /** Review result for the whole task. */
  taskReview: {
    summary: string
    findings: string[]
    recommendation: string | null
  } | null
  /** Optional per-step review details, keyed by subtask. */
  stepReviews: Array<{
    subtaskId: string
    summary: string
    findings: string[]
    recommendation: string | null
  }>
  /** If the reviewer is missing critical context, ask one focused question. */
  needsHumanInput: { question: string } | null
  /** True when the reviewer believes the task is good enough for DONE. The UI
   *  still requires a human click to approve. */
  approveTask: boolean
  /** If changes are needed, provide a human-readable explanation. */
  changeRequest: string | null
  /**
   * Structured verdict for the auto-loop (#9). When omitted (legacy
   * envelopes / older AI responses), the UI derives verdict from
   * `approveTask` and the count of `findings` for backward compatibility.
   *
   *   - approve         → mark DONE
   *   - minor_revision  → safe to auto-loop back to Doer (≤ MAX_REVIEW_ITERATIONS)
   *   - major_revision  → human gate, do NOT auto-retry
   *   - replan_needed   → escalate to the Step Planner / Planning phase
   *
   * `confidence` is the reviewer's self-rated likelihood that the verdict
   * is correct (0..1). Used only as a tie-breaker — we don't show it to the
   * user verbatim because that anthropomorphizes the AI more than is
   * useful.
   */
  verdict?: 'approve' | 'minor_revision' | 'major_revision' | 'replan_needed'
  confidence?: number
  /**
   * Optional structured action list a Doer can apply mechanically without
   * re-interpreting prose. When the reviewer returns these, the auto-loop
   * can stitch them into the Doer's next prompt as concrete instructions
   * keyed to specific subtasks.
   */
  changeActions?: Array<{
    subtaskId?: string
    action: 'revise' | 'remove' | 'add' | 'clarify'
    reason: string
    suggestedContent?: string
  }>
}

// ─── TODO breakdown agent (Tier 2.5) ─────────────────────────────────────────
// Separate envelope from the planning-phase agent because the shape + rules
// are different: one task in, structured subtasks out. Reusing the planning
// envelope would bloat it with fields the breakdown agent never uses.

export type TaskKind = 'research' | 'create' | 'communicate' | 'decide' | 'generic'

export interface SubtaskProposal {
  /** Stable id so the UI can reconcile between preview → store + refine diff. */
  id: string
  title: string
  description: string | null
  estimatedEffort: string | null
  type: SubtaskType
}

export interface BreakdownEnvelope {
  /** One-sentence confirmation the AI understood the task. Shown as italic
   *  preamble above the subtask list so the user can catch misunderstandings
   *  immediately. */
  taskUnderstanding: string
  subtasks: SubtaskProposal[]
  prerequisites: string[]
  risks: string[]
  /** When non-null, the UI renders a question card instead of the preview.
   *  Limited to one clarification round per task (enforced client-side). */
  needsHumanInput: { question: string } | null
  /** Self-reported confidence. Kept off the UI (Tier 4.14 principle) but
   *  available for telemetry / debug. */
  confidence: 'high' | 'medium' | 'low'
}

// ─── Activity log (Tier 3.10) ────────────────────────────────────────────────

export type TaskActivityType =
  | 'created'
  | 'status_changed'
  | 'ai_suggested_breakdown'
  | 'ai_suggestion_approved'
  | 'ai_suggestion_dismissed'
  | 'ai_needed_human_input'
  | 'ai_clarification_answered'
  | 'ai_refined'
  | 'doer_started_subtask'
  | 'doer_saved_result'
  | 'doer_marked_subtask_complete'
  | 'doer_ready_for_review'
  | 'doer_needed_human_input'
  | 'reviewer_started'
  | 'reviewer_saved_report'
  | 'reviewer_requested_changes'
  | 'reviewer_ready_for_done'
  | 'reviewer_needed_human_input'
  | 'subtask_completed'
  | 'subtask_added_manually'
  | 'subtask_removed'
  | 'user_edited_task'

export interface TaskActivityEntry {
  id: string
  taskId: string
  timestamp: string
  type: TaskActivityType
  actor: 'user' | 'ai' | 'system'
  /** Plain-language summary shown in the timeline row. Keep non-technical. */
  summary: string
  metadata: Record<string, unknown> | null
  /** Optional pointer to related resource (e.g. the cached breakdown snapshot
   *  so "View original suggestions" works even after approve/dismiss). */
  resourceLink: {
    type: 'subtask' | 'cached_breakdown'
    id: string
  } | null
}

// ─── Cached AI breakdown (Tier 4.15) ─────────────────────────────────────────

export interface CachedBreakdown {
  id: string
  taskId: string
  envelope: BreakdownEnvelope
  generatedAt: string
  /** Snapshots of the inputs at generation time. Used to detect staleness —
   *  when the user edits the task title/description, the cache is invalidated
   *  because the suggestion no longer reflects the task. */
  taskTitleAtGeneration: string
  taskDescriptionAtGeneration: string | null
  /** User decision tracking — null while the suggestion is still pending. */
  dismissedAt: string | null
  approvedAt: string | null
  /** IDs of subtasks actually created in the store from this suggestion.
   *  Lets us render "you approved 3 of 5" in the activity log without
   *  rebuilding state from scratch. */
  approvedSubtaskIds: string[]
}

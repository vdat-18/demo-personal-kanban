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

export interface Subtask {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
}

export interface TaskMoveRecord {
  from: TaskStatus;
  to: TaskStatus;
  timestamp: number;
  by: "agent" | "user";
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** Why this task matters — AI-generated context */
  why?: string;
  status: TaskStatus;
  subtasks: Subtask[];
  agentType: string;
  updatedAt: string;
  lastModifiedBy?: "ai" | "user";
  /**
   * Whether the auto-kickoff greeting has already been sent for this
   * (taskId + status) combination. Prevents duplicate LLM calls on re-render.
   */
  kickoffDone?: boolean;
  /** Reason recorded when task is cancelled */
  cancelReason?: string;
  /** Full move history for audit / context to agents */
  moveHistory?: TaskMoveRecord[];
  history?: {
    title: string;
    description: string;
    timestamp: number;
    author: "ai" | "user";
  }[];
}

export interface PlanningHistoryEntry {
  content: string;
  timestamp: number;
  author: "ai" | "user";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "execution" | "done";
  tasks: Task[];
  /** Full chat history from the planning session */
  planningMessages?: unknown[];
  /** Markdown report generated during planning */
  planningReport?: string;
  /** Version history of the report (for diff view) */
  planningHistory?: PlanningHistoryEntry[];
  /** Structured JSON extracted from the AI report */
  planningStructured?: {
    title: string;
    goal: string;
    suggested_tasks: string[];
  };
  /** AI-elaborated detailed tasks generated before execution */
  planningDetailedTasks?: DetailedTask[];
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI / LLM TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type SuggestedActionType =
  | "generate_report"
  | "proceed_to_tasks"
  | "suggest_tasks";

export interface SuggestedAction {
  type: SuggestedActionType;
  hint: string;
}

export type UserIntent = "confirm" | "explore" | "reject" | "neutral";

export interface AgenticResponse {
  reply: string;
  userIntent: UserIntent;
  suggestedAction: SuggestedAction | null;
  report?: string;
  taskUpdate?: {
    index: number;
    title: string;
    description: string;
  };
}

export type AgentHint =
  | "Starter Agent"
  | "Planner Agent"
  | "Doer Agent"
  | "Reviewer Agent"
  | "Reporter Agent";

export interface DetailedTask {
  title: string;
  description: string;
  why: string;
  suggested_subtasks: string[];
  agent_hint: AgentHint;
  history?: {
    title: string;
    description: string;
    timestamp: number;
    author: "ai" | "user";
  }[];
}

export interface DetailedTasksResponse {
  tasks: DetailedTask[];
  summary: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSET / DIRECTORY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AssetType = "document" | "spreadsheet" | "image" | "pdf" | "other";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  projectId: string; // Link to project
  projectName: string; // Cached for easy display
  agentName: string; // Who created it
  createdAt: string;
  size: string;
  content?: string; // Content for markdown/text or base64 for images
  url?: string; // Dummy URL for now or download blob
}

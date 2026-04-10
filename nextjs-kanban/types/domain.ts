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

// ─────────────────────────────────────────────────────────────────────────────
// AGENT CONSTANTS — single source of truth for agent-related config
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";
import {
  BookOpen,
  Activity,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { LegacyTaskStatus as TaskStatus, AgentHint } from "@/types/domain";

// ── Status → Agent mapping ───────────────────────────────────────────────────

export const AGENT_MAPPING: Record<TaskStatus, string> = {
  todo: "Planner Agent",
  planning: "Planner Agent",
  doing: "Doer Agent",
  review: "Reviewer Agent",
  done: "Reporter Agent",
  cancelled: "System",
};

// ── Agent → Icon mapping (Lucide components) ─────────────────────────────────

export const AGENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Planner Agent": BookOpen,
  "Doer Agent": Activity,
  "Reviewer Agent": Search,
  "Reporter Agent": FileText,
};

// ── Agent → Badge color classes ───────────────────────────────────────────────

export const AGENT_COLORS: Record<AgentHint | string, string> = {
  "Planner Agent": "bg-blue-50 text-blue-600",
  "Doer Agent": "bg-indigo-50 text-indigo-600",
  "Reviewer Agent": "bg-amber-50 text-amber-600",
  "Reporter Agent": "bg-green-50 text-green-600",
};

// ── Status → Badge color classes ──────────────────────────────────────────────

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600 border-slate-200",
  planning: "bg-purple-50 text-purple-600 border-purple-200",
  doing: "bg-blue-50 text-blue-600 border-blue-200",
  review: "bg-amber-50 text-amber-600 border-amber-200",
  done: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-500 border-rose-200",
};

// ── Kanban board column definitions ───────────────────────────────────────────

export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  agent: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo",      label: "TO DO",     Icon: BookOpen,     agent: "Planner Agent"  },
  { id: "doing",     label: "DOING",     Icon: Activity,     agent: "Doer Agent"     },
  { id: "review",    label: "REVIEW",    Icon: Search,       agent: "Reviewer Agent" },
  { id: "done",      label: "DONE",      Icon: CheckCircle2, agent: "Reporter Agent" },
  { id: "cancelled", label: "CANCELLED", Icon: XCircle,      agent: "System"         },
];

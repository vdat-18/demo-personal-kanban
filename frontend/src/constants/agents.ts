// ─────────────────────────────────────────────────────────────────────────────
// AGENT CONSTANTS — single source of truth for agent-related config
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";
import {
  Rocket,
  BookOpen,
  Zap,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { TaskStatus, AgentHint } from "@/types/domain";

// ── Status → Agent mapping ───────────────────────────────────────────────────

export const AGENT_MAPPING: Record<TaskStatus, string> = {
  todo: "Starter Agent",
  planning: "Planner Agent",
  doing: "Doer Agent",
  review: "Reviewer Agent",
  done: "Reporter Agent",
  cancelled: "System",
};

// ── Agent → Icon mapping (Lucide components) ─────────────────────────────────

export const AGENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Starter Agent": Rocket,
  "Planner Agent": BookOpen,
  "Doer Agent": Zap,
  "Reviewer Agent": Search,
  "Reporter Agent": FileText,
};

// ── Agent → Badge color classes ───────────────────────────────────────────────

export const AGENT_COLORS: Record<AgentHint | string, string> = {
  "Starter Agent": "bg-slate-100 text-slate-600",
  "Planner Agent": "bg-blue-50 text-blue-600",
  "Doer Agent": "bg-indigo-50 text-indigo-600",
  "Reviewer Agent": "bg-amber-50 text-amber-600",
  "Reporter Agent": "bg-green-50 text-green-600",
};

// ── Status → Badge color classes ──────────────────────────────────────────────

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-gray-50 text-gray-500 border-gray-200",
  planning: "bg-blue-50 text-blue-600 border-blue-100",
  doing: "bg-blue-50 text-blue-600 border-blue-100",
  review: "bg-amber-50 text-amber-600 border-amber-100",
  done: "bg-green-50 text-green-600 border-green-100",
  cancelled: "bg-red-50 text-red-500 border-red-100",
};

// ── Kanban board column definitions ───────────────────────────────────────────

export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  agent: string;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo",      label: "TO DO",     Icon: Rocket,       agent: "Starter Agent"   },
  { id: "planning",  label: "PLANNING",  Icon: BookOpen,     agent: "Planner Agent"   },
  { id: "doing",     label: "DOING",     Icon: Zap,          agent: "Doer Agent"      },
  { id: "review",    label: "REVIEW",    Icon: Search,       agent: "Reviewer Agent"  },
  { id: "done",      label: "DONE",      Icon: CheckCircle2, agent: "Reporter Agent"  },
  { id: "cancelled", label: "CANCELLED", Icon: XCircle,      agent: "System"          },
];

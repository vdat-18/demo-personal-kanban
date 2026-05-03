// ─────────────────────────────────────────────────────────────────────────────
// AGENT CONSTANTS — single source of truth for agent metadata.
// (Legacy lowercase TaskStatus mapping removed — use TaskStatusValue + the
// enum from @/types/domain in new code.)
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from "react";
import { BookOpen, Activity, Search, FileText } from "lucide-react";
import type { AgentHint } from "@/types/domain";

// ── Agent → Icon (Lucide components) ─────────────────────────────────────────

export const AGENT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Step Planner": BookOpen,
  "Doer Agent": Activity,
  "Reviewer Agent": Search,
  "Reporter Agent": FileText,
};

// ── Agent → Badge color (subtle bg + readable text) ──────────────────────────
// Each agent gets a distinct hue to stay visually separable, but all kept at
// the same low saturation so the chips read as a family.

export const AGENT_COLORS: Record<AgentHint | string, string> = {
  "Step Planner": "bg-brand-subtle text-brand",
  "Doer Agent": "bg-indigo-50 text-indigo-700",
  "Reviewer Agent": "bg-warning-bg text-warning",
  "Reporter Agent": "bg-success-bg text-success",
};

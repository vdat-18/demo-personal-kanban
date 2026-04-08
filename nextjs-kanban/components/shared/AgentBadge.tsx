// ─────────────────────────────────────────────────────────────────────────────
// AgentBadge — shows agent name with color-coded badge
// ─────────────────────────────────────────────────────────────────────────────

import { cn } from "@/lib/utils";
import { AGENT_COLORS, AGENT_ICONS } from "@/constants/agents";

interface Props {
  agentType: string;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

export function AgentBadge({
  agentType,
  size = "sm",
  showIcon = true,
  className,
}: Props) {
  const Icon = AGENT_ICONS[agentType];
  const colorClass = AGENT_COLORS[agentType] ?? "bg-slate-100 text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-black uppercase tracking-widest rounded-lg",
        size === "sm" ? "text-[9px] px-2.5 py-1" : "text-[11px] px-3 py-1.5",
        colorClass,
        className
      )}
    >
      {showIcon && Icon && <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
      {agentType}
    </span>
  );
}

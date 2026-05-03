import { cn } from '@/lib/utils'
import { AGENT_COLORS, AGENT_ICONS } from '@/constants/agents'
import { formatAgentRole } from '@/lib/display/format'

interface Props {
  agentType: string
  size?: 'sm' | 'md'
  showIcon?: boolean
  className?: string
}

export function AgentBadge({ agentType, size = 'sm', showIcon = true, className }: Props) {
  const Icon = AGENT_ICONS[agentType]
  const colorClass = AGENT_COLORS[agentType] ?? 'bg-surface-muted text-ink-muted'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md',
        size === 'sm' ? 'text-micro px-2 py-0.5' : 'text-meta font-semibold px-2.5 py-1',
        colorClass,
        className,
      )}
    >
      {showIcon && Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      {formatAgentRole(agentType)}
    </span>
  )
}

'use client'

export interface AgentOption {
  label: string
  role: string
}

export const AGENT_OPTIONS: AgentOption[] = [
  { label: 'Step Planner', role: 'breakdown' },
  { label: 'Doer Agent', role: 'developer' },
  { label: 'Reviewer Agent', role: 'reviewer' },
]

export interface AgentSelectorProps {
  options?: AgentOption[]
  activeIndex: number
  onSelect: (index: number) => void
  disabled?: boolean
  allowedIndices?: number[]
}

export function AgentSelector({
  options = AGENT_OPTIONS,
  activeIndex,
  onSelect,
  disabled = false,
  allowedIndices,
}: AgentSelectorProps) {
  return (
    <div className="px-6 py-3 border-b border-line flex gap-2 overflow-x-auto shrink-0 bg-surface">
      {options.map((opt, i) => {
        const isLocked = allowedIndices !== undefined && !allowedIndices.includes(i)
        return (
          <button
            key={opt.role}
            onClick={() => {
              if (!isLocked) onSelect(i)
            }}
            disabled={disabled || isLocked}
            title={isLocked ? 'Not available for current task status' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-meta font-semibold whitespace-nowrap transition-colors ${
              isLocked
                ? 'opacity-30 cursor-not-allowed bg-surface-muted text-ink-subtle'
                : activeIndex === i
                ? 'bg-brand text-white'
                : 'bg-surface-muted text-ink-muted hover:bg-line'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

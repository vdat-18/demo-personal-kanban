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
}

export function AgentSelector({
  options = AGENT_OPTIONS,
  activeIndex,
  onSelect,
  disabled = false,
}: AgentSelectorProps) {
  return (
    <div className="px-6 py-3 border-b border-gray-50 flex gap-2 overflow-x-auto shrink-0">
      {options.map((opt, i) => (
        <button
          key={opt.role}
          onClick={() => onSelect(i)}
          disabled={disabled}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 ${
            activeIndex === i
              ? 'bg-[#0a192f] text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

'use client'

import type { UITaskStatus, TaskStatus } from '@/types/domain'
import { formatTaskStatus } from '@/lib/display/format'

const STATUS_DOT: Partial<Record<UITaskStatus, string>> = {
  TODO:        'bg-slate-300',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW:   'bg-amber-400',
  DONE:        'bg-green-500',
  BLOCKED:     'bg-red-400',
}

export interface StatusFilterBarProps {
  statuses: readonly (UITaskStatus | 'ALL')[]
  selected: UITaskStatus | 'ALL'
  counts: Record<string, number>
  onSelect: (status: UITaskStatus | 'ALL') => void
}

function labelFor(s: UITaskStatus | 'ALL'): string {
  if (s === 'ALL') return 'All'
  return formatTaskStatus(s as TaskStatus).label
}

export function StatusFilterBar({ statuses, selected, counts, onSelect }: StatusFilterBarProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {statuses.map((s) => {
        const isSelected = selected === s
        const dot = s !== 'ALL' ? STATUS_DOT[s as UITaskStatus] : null
        return (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
              isSelected
                ? 'bg-[#0a192f] text-white'
                : 'bg-white text-slate-500 border border-gray-100 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {dot && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${isSelected ? 'opacity-70' : ''}`} />
            )}
            {labelFor(s)}
            <span className={`text-[11px] ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>
              {counts[s] || 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

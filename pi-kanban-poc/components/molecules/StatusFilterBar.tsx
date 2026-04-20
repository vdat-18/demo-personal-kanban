'use client'

import type { UITaskStatus, TaskStatus } from '@/types/domain'
import { formatTaskStatus } from '@/lib/display/format'

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
    <div className="flex gap-2 flex-wrap">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
            selected === s ? 'bg-[#0a192f] text-white' : 'bg-white text-gray-500 border border-gray-100 hover:border-[#0a192f]/20'
          }`}
        >
          {labelFor(s)} ({counts[s] || 0})
        </button>
      ))}
    </div>
  )
}

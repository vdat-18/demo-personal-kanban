'use client'

import { Play, Pause, AlertCircle } from 'lucide-react'
import type { AutoModeStatus } from '@/lib/auto-mode/constants'

interface AutoModeToggleProps {
  enabled: boolean
  status: AutoModeStatus
  onToggle: () => void
}

export function AutoModeToggle({ enabled, status, onToggle }: AutoModeToggleProps) {
  const isError = status === 'error'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        isError
          ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
          : enabled
          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
          : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-100'
      }`}
      title={enabled ? 'Disable auto mode' : 'Enable auto mode'}
    >
      {isError ? (
        <AlertCircle className="w-3 h-3" />
      ) : enabled ? (
        <Pause className="w-3 h-3" />
      ) : (
        <Play className="w-3 h-3" />
      )}
      <span>Auto</span>
    </button>
  )
}

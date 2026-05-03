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
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-micro transition-colors border ${
        isError
          ? 'bg-danger-bg text-danger hover:opacity-90 border-danger-border'
          : enabled
          ? 'bg-success-bg text-success hover:opacity-90 border-success-border'
          : 'bg-surface-muted text-ink-muted hover:bg-line border-line'
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

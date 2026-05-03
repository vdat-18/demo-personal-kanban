'use client'

import { XCircle } from 'lucide-react'
import type { AutoModeStatus } from '@/lib/auto-mode/constants'

interface AutoModeStatusBarProps {
  status: AutoModeStatus
  activeTaskTitle: string | null
  error: string | null
  onDismissError: () => void
}

export function AutoModeStatusBar({
  status,
  activeTaskTitle,
  error,
  onDismissError,
}: AutoModeStatusBarProps) {
  if (status === 'disabled' || status === 'idle') return null

  return (
    <div
      className={`mx-4 mb-2 px-4 py-2 rounded-xl flex items-center gap-2 text-meta transition-all border ${
        status === 'error'
          ? 'bg-danger-bg text-danger border-danger-border'
          : 'bg-info-bg text-info border-info-border'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === 'error' ? 'bg-danger' : 'bg-brand animate-pulse'
        }`}
      />
      <span className="truncate flex-1">
        {status === 'error' && <>Auto: error — {error || 'Unknown error'}</>}
        {status === 'running' && <>Auto: running — {activeTaskTitle || 'Processing…'}</>}
      </span>
      {status === 'error' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismissError()
          }}
          className="p-0.5 hover:bg-danger/10 rounded-full transition-colors shrink-0"
          title="Dismiss error"
        >
          <XCircle className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

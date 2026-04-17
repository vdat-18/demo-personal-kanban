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
  if (status === 'disabled') return null

  return (
    <div
      className={`mx-4 mb-2 px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-bold transition-all ${
        status === 'error'
          ? 'bg-red-50 text-red-500 border border-red-100'
          : status === 'running'
          ? 'bg-blue-50 text-blue-600 border border-blue-100'
          : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
      }`}
    >
      {/* Status dot */}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          status === 'error'
            ? 'bg-red-500'
            : status === 'running'
            ? 'bg-blue-500 animate-pulse'
            : 'bg-emerald-500'
        }`}
      />

      {/* Label */}
      <span className="truncate flex-1">
        {status === 'error' && (
          <>Auto: Error — {error || 'Unknown error'}</>
        )}
        {status === 'running' && (
          <>Auto: Running — {activeTaskTitle || 'Processing…'}</>
        )}
        {status === 'idle' && (
          <>Auto: Idle</>
        )}
      </span>

      {/* Dismiss error */}
      {status === 'error' && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismissError()
          }}
          className="p-0.5 hover:bg-red-100 rounded-full transition-colors shrink-0"
          title="Dismiss error"
        >
          <XCircle className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

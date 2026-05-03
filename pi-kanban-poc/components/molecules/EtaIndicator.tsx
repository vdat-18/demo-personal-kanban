'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { formatEta, getEtaMs, isOverEta, type AgentMode } from '@/lib/timing'

interface Props {
  mode: AgentMode
  /** When `running` becomes true, the component starts its local timer.
   *  Setting it back to false resets the elapsed counter. */
  running: boolean
  /** Optional label prefix — e.g. "AI is responding". Default falls back to
   *  a generic "Processing". */
  label?: string
  onAbort?: () => void
  className?: string
}

/**
 * Inline ETA indicator for AI calls.
 *
 * Shows:
 *   Usually ~25s · running 8s   [■ Stop]
 *
 * and flips to a soft warning once elapsed > 1.5× ETA.
 */
export function EtaIndicator({ mode, running, label, onAbort, className }: Props) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [etaMs] = useState(() => getEtaMs(mode))

  useEffect(() => {
    if (!running) {
      setElapsedMs(0)
      return
    }
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 500)
    return () => window.clearInterval(id)
  }, [running])

  if (!running) return null

  const over = isOverEta(elapsedMs, etaMs)

  return (
    <div
      className={`flex items-center gap-3 text-xs ${
        over ? 'text-amber-700' : 'text-slate-600'
      } ${className ?? ''}`}
    >
      {over ? (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Clock className="w-3.5 h-3.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold">
          {label ?? 'Processing'}
          {over && ' — taking longer than usual'}
        </div>
        <div className="text-meta opacity-80">
          Usually ~{formatEta(etaMs)} · elapsed {Math.round(elapsedMs / 1000)}s
        </div>
      </div>
      {onAbort && (
        <button
          onClick={onAbort}
          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-micro hover:bg-slate-50 transition-colors active:scale-95"
        >
          ■ Stop
        </button>
      )}
    </div>
  )
}

import { Zap } from 'lucide-react'
import type { StreamEvent } from '@/lib/hooks/useAgentStream'

export interface StreamEventPillProps {
  event: StreamEvent
}

export function StreamEventPill({ event }: StreamEventPillProps) {
  if (event.type === 'started') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold uppercase tracking-widest">
        <Zap className="w-3 h-3 animate-pulse" /> Agent started...
      </div>
    )
  }
  if (event.type === 'progress') {
    const label =
      typeof event.message === 'string'
        ? event.message
        : typeof event.step === 'string'
        ? event.step
        : 'Processing...'
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-medium truncate">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
        {label}
      </div>
    )
  }
  return null
}

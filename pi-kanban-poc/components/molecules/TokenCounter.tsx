'use client'

import { Coins } from 'lucide-react'
import { formatTokenCount } from '@/lib/tokenEstimate'

interface Props {
  input: number
  output: number
  /** Optional prefix label ("Project này", "Phiên này", …). */
  label?: string
  className?: string
}

/**
 * Compact chip for showing accumulated token usage. PoC scope: raw token
 * counts only, no dollar amount (pricing config not yet wired).
 */
export function TokenCounter({ input, output, label, className }: Props) {
  const total = (input ?? 0) + (output ?? 0)
  if (total === 0) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700 ${className ?? ''}`}
      title={`${input} input · ${output} output tokens`}
    >
      <Coins className="w-3 h-3 text-slate-500" />
      {label ? <span className="text-slate-500">{label}:</span> : null}
      <span className="font-mono">{formatTokenCount(total)}</span>
    </span>
  )
}

'use client'

import { Coins } from 'lucide-react'

// Claude Sonnet 4 pricing: $3/1M input, $15/1M output
const COST_PER_M_INPUT = 3.0
const COST_PER_M_OUTPUT = 15.0

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCost(usd: number): string {
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

interface Props {
  tokenUsage: { input: number; output: number } | null
}

export function TokenDashboard({ tokenUsage }: Props) {
  const input = tokenUsage?.input ?? 0
  const output = tokenUsage?.output ?? 0
  const total = input + output

  const inputCost = (input / 1_000_000) * COST_PER_M_INPUT
  const outputCost = (output / 1_000_000) * COST_PER_M_OUTPUT
  const totalCost = inputCost + outputCost

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Token Usage</h4>
      </div>

      {total === 0 ? (
        <p className="text-[11px] text-slate-400 italic">
          Chưa có hoạt động AI nào trong project này.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Input</p>
            <p className="text-lg font-black text-[#0a192f] mt-1">{formatTokens(input)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{formatCost(inputCost)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Output</p>
            <p className="text-lg font-black text-[#0a192f] mt-1">{formatTokens(output)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{formatCost(outputCost)}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-center">
            <p className="text-[9px] text-indigo-500 uppercase tracking-widest font-black">Total</p>
            <p className="text-lg font-black text-indigo-700 mt-1">{formatTokens(total)}</p>
            <p className="text-[10px] text-indigo-600 mt-0.5 font-bold">{formatCost(totalCost)}</p>
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400">
        Ước tính theo giá Claude Sonnet: $3/1M input · $15/1M output
      </p>
    </div>
  )
}

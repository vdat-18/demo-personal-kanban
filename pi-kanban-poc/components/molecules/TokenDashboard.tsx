'use client'

import { useState } from 'react'
import { Coins, ChevronDown } from 'lucide-react'

interface ModelPricing {
  label: string
  inputPerM: number
  outputPerM: number
}

const MODELS: Record<string, ModelPricing> = {
  'claude-haiku-4-5':  { label: 'Claude Haiku 4.5',  inputPerM: 0.80, outputPerM: 4.0  },
  'claude-sonnet-4-6': { label: 'Claude Sonnet 4.6', inputPerM: 3.0,  outputPerM: 15.0 },
  'claude-opus-4-7':   { label: 'Claude Opus 4.7',   inputPerM: 15.0, outputPerM: 75.0 },
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'

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
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)

  const pricing = MODELS[selectedModel]
  const input = tokenUsage?.input ?? 0
  const output = tokenUsage?.output ?? 0
  const total = input + output

  const inputCost = (input / 1_000_000) * pricing.inputPerM
  const outputCost = (output / 1_000_000) * pricing.outputPerM
  const totalCost = inputCost + outputCost

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-spark" />
          <h4 className="text-xs font-semibold tracking-widest text-ink-muted uppercase">Token Usage</h4>
        </div>

        {/* Model selector */}
        <div className="relative">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1 rounded-lg border border-line bg-surface text-micro text-ink font-medium focus:outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer hover:border-brand-border transition-colors"
          >
            {Object.entries(MODELS).map(([id, m]) => (
              <option key={id} value={id}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-subtle pointer-events-none" />
        </div>
      </div>

      {total === 0 ? (
        <p className="text-meta text-ink-subtle italic">No AI activity yet in this project.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line bg-surface p-3 text-center shadow-card">
            <p className="text-micro text-ink-subtle font-semibold">Input</p>
            <p className="text-lg font-bold text-ink mt-1">{formatTokens(input)}</p>
            <p className="text-meta text-ink-muted mt-0.5">{formatCost(inputCost)}</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center shadow-card">
            <p className="text-micro text-ink-subtle font-semibold">Output</p>
            <p className="text-lg font-bold text-ink mt-1">{formatTokens(output)}</p>
            <p className="text-meta text-ink-muted mt-0.5">{formatCost(outputCost)}</p>
          </div>
          <div className="rounded-xl border border-brand-border bg-brand-subtle p-3 text-center shadow-card">
            <p className="text-micro text-brand font-semibold">Total</p>
            <p className="text-lg font-bold text-brand mt-1">{formatTokens(total)}</p>
            <p className="text-meta text-brand mt-0.5 font-bold">{formatCost(totalCost)}</p>
          </div>
        </div>
      )}

      <p className="text-micro text-ink-subtle">
        {pricing.label} pricing: ${pricing.inputPerM}/1M input · ${pricing.outputPerM}/1M output
      </p>
    </div>
  )
}

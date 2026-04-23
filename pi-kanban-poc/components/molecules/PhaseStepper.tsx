'use client'

import { Lightbulb, ClipboardCheck, ListChecks } from 'lucide-react'
import type { PlanningPhase } from '@/types/domain'
import { PHASE_DISPLAY, PHASE_ORDER } from '@/constants/phases'

const ICON_MAP = {
  lightbulb: Lightbulb,
  'clipboard-check': ClipboardCheck,
  'list-checks': ListChecks,
} as const

interface PhaseStepperProps {
  current: PlanningPhase
  /** Click handler when the user wants to jump to a specific phase (Tier 2.5). */
  onJumpTo?: (target: PlanningPhase) => void
  compact?: boolean
}

export function PhaseStepper({ current, onJumpTo, compact }: PhaseStepperProps) {
  const currentStep = PHASE_DISPLAY[current].step

  return (
    <div className={`inline-flex items-center ${compact ? 'rounded-2xl px-1 py-1 gap-0.5' : 'rounded-[1.5rem] px-2 py-2 gap-0'} border border-slate-200/90 bg-white/90 shadow-[0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-sm`}>
      {PHASE_ORDER.map((phase, idx) => {
        const cfg = PHASE_DISPLAY[phase]
        const Icon = ICON_MAP[cfg.iconKey]
        const isActive = phase === current
        const isDone = cfg.step < currentStep
        const clickable = onJumpTo && !isActive

        const content = (
          <div
            className={`flex items-center transition-all duration-300 ${
              compact
                ? `gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold ${isActive ? `${cfg.bg} ${cfg.color} border ${cfg.border}` : isDone ? 'text-emerald-600' : 'text-slate-400'}`
                : `min-w-[138px] gap-3 px-4 py-3 rounded-[1.2rem] text-[10px] font-black ${isActive ? `${cfg.bg} ${cfg.color} shadow-sm border ${cfg.border}` : isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-transparent text-slate-400 hover:text-slate-600'}`
            } ${clickable ? 'cursor-pointer hover:opacity-90' : ''}`}
          >
            {compact ? (
              <Icon className={`w-3 h-3 shrink-0 ${isActive ? cfg.color : isDone ? 'text-emerald-500' : 'text-slate-400'}`} />
            ) : (
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isActive ? 'bg-white shadow-sm border border-white/80' : isDone ? 'bg-white border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                <Icon className={`w-3.5 h-3.5 ${isActive ? cfg.color : isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
            )}
            <div className="min-w-0">
              <div className="uppercase tracking-[0.14em] text-[10px]">{cfg.label}</div>
            </div>
            {isDone && !compact && (
              <div className="ml-auto w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shrink-0">
                <span className="text-[9px] text-white">✓</span>
              </div>
            )}
            {isDone && compact && <span className="text-emerald-500 text-[9px]">✓</span>}
          </div>
        )

        return (
          <div key={phase} className="flex items-center">
            {clickable ? (
              <button
                onClick={() => onJumpTo!(phase)}
                title={`Jump to "${cfg.label}"`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-2xl"
              >
                {content}
              </button>
            ) : (
              <div title={cfg.tagline}>{content}</div>
            )}
            {idx < PHASE_ORDER.length - 1 && (
              <div className={compact ? 'px-1' : 'px-2 md:px-3'}>
                <div className={`h-[2px] rounded-full transition-all duration-500 ${compact ? 'w-4' : 'w-6 md:w-8'} ${isDone ? 'bg-emerald-200' : 'bg-slate-200'}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

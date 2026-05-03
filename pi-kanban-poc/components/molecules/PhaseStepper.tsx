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
  onJumpTo?: (target: PlanningPhase) => void
  compact?: boolean
}

// Phase color mapping — uses semantic tokens.
// Active = brand-tinted, done = success-tinted, future = neutral.
const PHASE_TONE: Record<PlanningPhase, { bg: string; text: string; border: string }> = {
  discovery: { bg: 'bg-warning-bg', text: 'text-warning', border: 'border-warning-border' },
  blueprint: { bg: 'bg-brand-subtle', text: 'text-brand', border: 'border-brand-border' },
  task_mapping: { bg: 'bg-success-bg', text: 'text-success', border: 'border-success-border' },
}

export function PhaseStepper({ current, onJumpTo, compact }: PhaseStepperProps) {
  const currentStep = PHASE_DISPLAY[current].step

  return (
    <div
      className={`inline-flex items-center ${
        compact ? 'rounded-xl px-1 py-1 gap-0.5' : 'rounded-2xl px-2 py-2 gap-0'
      } border border-line bg-surface/95 shadow-sm backdrop-blur-sm`}
    >
      {PHASE_ORDER.map((phase, idx) => {
        const cfg = PHASE_DISPLAY[phase]
        const tone = PHASE_TONE[phase]
        const Icon = ICON_MAP[cfg.iconKey]
        const isActive = phase === current
        const isDone = cfg.step < currentStep
        const clickable = onJumpTo && !isActive

        const content = (
          <div
            className={`flex items-center transition-colors duration-200 ${
              compact
                ? `gap-1.5 px-3 py-1.5 rounded-lg text-micro normal-case font-semibold ${
                    isActive
                      ? `${tone.bg} ${tone.text} border ${tone.border}`
                      : isDone
                      ? 'text-success'
                      : 'text-ink-subtle'
                  }`
                : `min-w-[138px] gap-3 px-4 py-3 rounded-xl text-micro normal-case font-semibold ${
                    isActive
                      ? `${tone.bg} ${tone.text} shadow-sm border ${tone.border}`
                      : isDone
                      ? 'bg-success-bg text-success border border-success-border'
                      : 'bg-transparent text-ink-subtle hover:text-ink-muted'
                  }`
            } ${clickable ? 'cursor-pointer hover:opacity-90' : ''}`}
          >
            {compact ? (
              <Icon
                className={`w-3 h-3 shrink-0 ${
                  isActive ? tone.text : isDone ? 'text-success' : 'text-ink-subtle'
                }`}
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isActive
                    ? 'bg-surface shadow-sm border border-surface'
                    : isDone
                    ? 'bg-surface border border-success-border'
                    : 'bg-surface-muted border border-line'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? tone.text : isDone ? 'text-success' : 'text-ink-subtle'
                  }`}
                />
              </div>
            )}
            <div className="min-w-0">
              <div className="uppercase tracking-wider text-micro normal-case">{cfg.label}</div>
            </div>
            {isDone && !compact && (
              <div className="ml-auto w-5 h-5 rounded-full bg-success flex items-center justify-center shadow-sm shrink-0">
                <span className="text-micro normal-case text-white">✓</span>
              </div>
            )}
            {isDone && compact && <span className="text-success text-micro normal-case">✓</span>}
          </div>
        )

        return (
          <div key={phase} className="flex items-center">
            {clickable ? (
              <button
                onClick={() => onJumpTo!(phase)}
                title={`Jump to "${cfg.label}"`}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl"
              >
                {content}
              </button>
            ) : (
              <div title={cfg.tagline}>{content}</div>
            )}
            {idx < PHASE_ORDER.length - 1 && (
              <div className={compact ? 'px-1' : 'px-2 md:px-3'}>
                <div
                  className={`h-[2px] rounded-full transition-colors duration-300 ${
                    compact ? 'w-4' : 'w-6 md:w-8'
                  } ${isDone ? 'bg-success/40' : 'bg-line'}`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

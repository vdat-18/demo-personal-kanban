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
    <div className="flex items-center gap-0">
      {PHASE_ORDER.map((phase, idx) => {
        const cfg = PHASE_DISPLAY[phase]
        const Icon = ICON_MAP[cfg.iconKey]
        const isActive = phase === current
        const isDone = cfg.step < currentStep
        const clickable = onJumpTo && !isActive

        const content = (
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[10px] font-black transition-all duration-300 ${
              isActive
                ? `${cfg.bg} ${cfg.color} shadow-sm border ${cfg.border} scale-105`
                : isDone
                ? 'bg-green-50 text-green-600 border border-green-100 opacity-80'
                : 'bg-transparent text-gray-400 opacity-50'
            } ${clickable ? 'cursor-pointer hover:opacity-100 hover:scale-105' : ''}`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isActive ? 'bg-white shadow-sm' : 'bg-transparent'
              }`}
            >
              <Icon
                className={`w-3 h-3 ${
                  isActive ? cfg.color : isDone ? 'text-green-500' : 'text-gray-400'
                }`}
              />
            </div>
            {!compact && <span className="uppercase tracking-[0.1em]">{cfg.label}</span>}
            {isDone && !compact && (
              <div className="ml-1 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-[7px] text-white">✓</span>
              </div>
            )}
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
              <div className="px-4">
                <div
                  className={`h-[1px] w-12 rounded-full transition-all duration-500 ${
                    isDone ? 'bg-green-200' : 'bg-gray-100'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

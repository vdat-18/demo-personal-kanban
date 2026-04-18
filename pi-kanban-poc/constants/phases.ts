/**
 * Planning phase labels, taglines, and icons shown to non-tech users.
 *
 * Backend enum stays `'discovery' | 'blueprint' | 'task_mapping'` (so that
 * persisted data keeps working), but the UI always goes through this mapping.
 */

import type { PlanningPhase } from '@/types/domain'

export interface PhaseDisplayConfig {
  /** Short label shown in steppers and badges. */
  label: string
  /** Longer sentence shown in tooltips / hint banner. */
  tagline: string
  /** Verbose description used in onboarding / help panels. */
  description: string
  /** 1-based index used by the stepper. */
  step: number
  /** Lucide icon name (string) — component resolved by caller. */
  iconKey: 'lightbulb' | 'clipboard-check' | 'list-checks'
  /** Tailwind color classes for active state. */
  color: string
  bg: string
  border: string
}

export const PHASE_DISPLAY: Record<PlanningPhase, PhaseDisplayConfig> = {
  discovery: {
    label: 'Tell me about it',
    tagline: "Share your goal — I'll ask the right questions to understand it deeply.",
    description:
      'Share what you want to do. I will ask a few focused questions so the plan fits your situation.',
    step: 1,
    iconKey: 'lightbulb',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  blueprint: {
    label: 'Confirm the plan',
    tagline: "Here's what I understood. Review and tweak before we break it down.",
    description:
      'Review the plan I drafted from our chat. Edit anything directly, or ask me to revise it.',
    step: 2,
    iconKey: 'clipboard-check',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  task_mapping: {
    label: 'Break into action items',
    tagline: 'Concrete steps you can start doing today.',
    description:
      'Review each proposed task. Approve the ones you want, skip the rest. They move into your Tasks list.',
    step: 3,
    iconKey: 'list-checks',
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
}

export const PHASE_ORDER: PlanningPhase[] = ['discovery', 'blueprint', 'task_mapping']

export function nextPhase(current: PlanningPhase): PlanningPhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1]
}

export function previousPhase(current: PlanningPhase): PlanningPhase | null {
  const idx = PHASE_ORDER.indexOf(current)
  if (idx <= 0) return null
  return PHASE_ORDER[idx - 1]
}

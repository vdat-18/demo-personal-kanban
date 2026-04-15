// ── Domain role labels & backward-compatible SYSTEM_PROMPTS alias ────────────

import type { AgentRole } from './types'
import type { ProjectDomain } from './types'
import { DOMAIN_SYSTEM_PROMPTS } from './domains'

export const DOMAIN_ROLE_LABELS: Record<ProjectDomain, Record<AgentRole, string>> = {
  SOFTWARE_ENGINEERING: {
    architect: 'Planner Agent',
    developer: 'Doer Agent',
    reviewer: 'Reviewer Agent',
  },
  MARKETING: {
    architect: 'Strategist Agent',
    developer: 'Campaign Agent',
    reviewer: 'Brand Reviewer Agent',
  },
  SALES: {
    architect: 'Pipeline Architect Agent',
    developer: 'Deal Agent',
    reviewer: 'Sales Reviewer Agent',
  },
  LOGISTICS: {
    architect: 'Supply Chain Planner Agent',
    developer: 'Operations Agent',
    reviewer: 'Logistics Auditor Agent',
  },
}

// ── Backward-compatible alias (used by configs.ts) ──────────────────────────

export const SYSTEM_PROMPTS: Record<AgentRole, string> = DOMAIN_SYSTEM_PROMPTS.SOFTWARE_ENGINEERING

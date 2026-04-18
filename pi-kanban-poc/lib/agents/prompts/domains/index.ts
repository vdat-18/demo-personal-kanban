// ── Domain system prompts — assembled from per-domain modules ───────────────

import type { AgentRole } from '../types'
import type { ProjectDomain } from '../types'
import { SOFTWARE_ENGINEERING_PROMPTS } from './software-engineering'
import { MARKETING_PROMPTS } from './marketing'
import { SALES_PROMPTS } from './sales'
import { LOGISTICS_PROMPTS } from './logistics'

export const DOMAIN_SYSTEM_PROMPTS: Record<ProjectDomain, Record<AgentRole, string>> = {
  SOFTWARE_ENGINEERING: SOFTWARE_ENGINEERING_PROMPTS,
  MARKETING: MARKETING_PROMPTS,
  SALES: SALES_PROMPTS,
  LOGISTICS: LOGISTICS_PROMPTS,
}

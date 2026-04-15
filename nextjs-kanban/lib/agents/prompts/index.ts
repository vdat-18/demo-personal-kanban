// ── BE prompt builders — single source of truth for all agent prompts ─────────
// FE sends only raw user input + context identifiers (taskId / projectId).
// These functions fetch the necessary data and assemble the full prompt.
//
// This barrel re-exports everything so existing import paths keep working:
//   import { buildChatPrompt, ... } from '@/lib/agents/prompts'

// Types
export type { AgentRole, ProjectDomain, PlanningPhase, PlanConversationMessage, ConversationMessage } from './types'

// Domain system prompts
export { DOMAIN_SYSTEM_PROMPTS } from './domains'

// Role labels & backward-compatible alias
export { DOMAIN_ROLE_LABELS, SYSTEM_PROMPTS } from './role-labels'

// Prompt builders
export { buildChatPrompt } from './builders/chat'
export { buildPlanPrompt, extractPhaseTransition, extractVisionDocument } from './builders/plan'
export { buildGenerateTasksPrompt } from './builders/task-generation'

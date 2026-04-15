// ── Shared types for agent prompts ──────────────────────────────────────────

export type AgentRole = 'architect' | 'developer' | 'reviewer'

export type ProjectDomain = 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'

export type PlanningPhase = 'discovery' | 'blueprint' | 'task_mapping'

export interface PlanConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Shape used by each domain's prompt definition */
export type DomainPrompts = Record<AgentRole, string>

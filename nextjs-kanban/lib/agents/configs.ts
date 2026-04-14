import { AgentConfig } from '@jackchen_me/open-multi-agent'
import { SYSTEM_PROMPTS, DOMAIN_SYSTEM_PROMPTS } from './prompts'
import type { ProjectDomain } from './prompts'

export type AgentRole = 'architect' | 'developer' | 'reviewer'

export const agentConfigs: Record<AgentRole, AgentConfig> = {
  architect: {
    name: 'Architect',
    model: 'gpt-4o',
    provider: 'openai',
    tools: ['db_query', 'project_create'],
    systemPrompt: SYSTEM_PROMPTS.architect,
  },

  developer: {
    name: 'Developer',
    model: 'gpt-4o',
    provider: 'openai',
    tools: ['db_query', 'task_create', 'task_update', 'task_delete', 'project_create', 'subtask_update'],
    systemPrompt: SYSTEM_PROMPTS.developer,
  },

  reviewer: {
    name: 'Reviewer',
    model: 'gpt-4o',
    provider: 'openai',
    tools: ['db_query', 'task_update'],
    systemPrompt: SYSTEM_PROMPTS.reviewer,
  },
}

/** Returns an AgentConfig with domain-specific system prompt. */
export function getAgentConfigForDomain(role: AgentRole, domain: ProjectDomain): AgentConfig {
  return {
    ...agentConfigs[role],
    systemPrompt: DOMAIN_SYSTEM_PROMPTS[domain][role],
  }
}

export function getAgentConfig(role: AgentRole): AgentConfig {
  return agentConfigs[role]
}

export function getAvailableAgents(): AgentRole[] {
  return Object.keys(agentConfigs) as AgentRole[]
}

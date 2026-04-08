import { AgentConfig } from '@jackchen_me/open-multi-agent'
import { allTools } from './tools'

export function registerToolsForAgent(config: AgentConfig): AgentConfig {
  const tools = getToolsForAgent(config.name || '')

  return {
    ...config,
    tools: [...(config.tools || []), ...tools],
  }
}

export function getToolsForAgent(agentName: string): any[] {
  return allTools.filter(tool => {
    if (agentName === 'Architect') {
      return ['db_query', 'project_create'].includes(tool.name)
    }
    if (agentName === 'Developer') {
      return ['db_query', 'task_create', 'task_update', 'task_delete', 'project_create'].includes(tool.name)
    }
    if (agentName === 'Reviewer') {
      return ['db_query'].includes(tool.name)
    }
    return true
  })
}

export function registerCustomTools(tools: any[]): AgentConfig[] {
  const { agentConfigs } = require('./configs')

  return Object.values(agentConfigs).map((config: any) => ({
    ...config,
    tools: [...(config.tools || []), ...tools],
  }))
}

export { allTools }

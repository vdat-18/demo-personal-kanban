import { OpenMultiAgent, ToolRegistry, ToolExecutor, registerBuiltInTools } from '@jackchen_me/open-multi-agent'
import { agentConfigs, AgentRole } from './configs'
import { allTools } from './tools'

let orchestratorInstance: OpenMultiAgent | null = null
let toolRegistry: ToolRegistry | null = null
let toolExecutor: ToolExecutor | null = null

function getToolRegistry(): ToolRegistry {
  if (!toolRegistry) {
    const registry = new ToolRegistry()
    registerBuiltInTools(registry)
    allTools.forEach(tool => registry.register(tool))
    toolRegistry = registry
  }
  return toolRegistry
}

function getToolExecutor(): ToolExecutor {
  if (!toolExecutor) {
    toolExecutor = new ToolExecutor(getToolRegistry())
  }
  return toolExecutor
}

export function getOrchestrator(): OpenMultiAgent {
  if (!orchestratorInstance) {
    orchestratorInstance = new OpenMultiAgent({
      defaultModel: 'claude-sonnet-4-6',
      defaultProvider: 'anthropic',
    })
  }
  return orchestratorInstance
}

export function resetOrchestrator(): void {
  orchestratorInstance = null
}

export async function runAgent(
  role: AgentRole,
  prompt: string,
  onProgress?: (event: any) => void
) {
  const orchestrator = getOrchestrator()
  const config = agentConfigs[role]

  return orchestrator.runAgent(config, prompt)
}

export async function runTeam(
  goal: string,
  agents: AgentRole[],
  onProgress?: (event: any) => void
) {
  const orchestrator = getOrchestrator()
  const teamAgentConfigs = agents.map(role => agentConfigs[role])

  const team = orchestrator.createTeam('task-team', {
    name: 'task-team',
    agents: teamAgentConfigs,
  })

  return orchestrator.runTeam(team, goal)
}

export async function runTasks(
  tasks: Array<{ agent: AgentRole; prompt: string; dependencies?: string[] }>,
  onProgress?: (event: any) => void
) {
  const orchestrator = getOrchestrator()

  // Determine unique agents and build a team
  const uniqueRoles = [...new Set(tasks.map(t => t.agent))]
  const team = orchestrator.createTeam('pipeline', {
    name: 'pipeline',
    agents: uniqueRoles.map(role => agentConfigs[role]),
  })

  const taskDefs = tasks.map(t => ({
    title: t.prompt.slice(0, 80),
    description: t.prompt,
    assignee: agentConfigs[t.agent].name,
    dependsOn: t.dependencies,
  }))

  return orchestrator.runTasks(team, taskDefs)
}

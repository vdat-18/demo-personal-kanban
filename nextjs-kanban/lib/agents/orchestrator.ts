import {
  OpenMultiAgent,
  Agent,
  ToolRegistry,
  ToolExecutor,
  registerBuiltInTools,
} from '@jackchen_me/open-multi-agent'
import type { OrchestratorEvent } from '@jackchen_me/open-multi-agent'
import { agentConfigs, AgentRole } from './configs'
import { allTools } from './tools'

// ── Shared tool registry (built-ins + custom DB tools) ───────────────────────
// Built once per process. All custom tools are registered here so agents can
// reference them by name via AgentConfig.tools.
function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registerBuiltInTools(registry)
  for (const tool of allTools) {
    registry.register(tool)
  }
  return registry
}

const sharedRegistry = buildRegistry()
const sharedExecutor = new ToolExecutor(sharedRegistry)

// ── runAgent — uses Agent directly so the shared registry (custom tools) is available ──
export async function runAgent(
  role: AgentRole,
  prompt: string,
  onProgress?: (event: OrchestratorEvent) => void
) {
  const config = agentConfigs[role]
  const agent = new Agent(config, sharedRegistry, sharedExecutor)
  return agent.run(prompt)
}

// ── runTeam / runTasks — use OpenMultiAgent (coordinator + DAG scheduling) ───
export async function runTeam(
  goal: string,
  agents: AgentRole[],
  onProgress?: (event: OrchestratorEvent) => void
) {
  const orchestrator = new OpenMultiAgent({
    defaultModel: 'gpt-4o-mini',
    defaultProvider: 'openai',
    ...(onProgress ? { onProgress } : {}),
  })
  const teamAgentConfigs = agents.map(role => agentConfigs[role])
  const team = orchestrator.createTeam('task-team', {
    name: 'task-team',
    agents: teamAgentConfigs,
  })
  return orchestrator.runTeam(team, goal)
}

export async function runTasks(
  tasks: Array<{ agent: AgentRole; prompt: string; dependencies?: string[] }>,
  onProgress?: (event: OrchestratorEvent) => void
) {
  const orchestrator = new OpenMultiAgent({
    defaultModel: 'gpt-4o-mini',
    defaultProvider: 'openai',
    ...(onProgress ? { onProgress } : {}),
  })

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

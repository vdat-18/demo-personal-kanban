// ── BE prompt builders — single source of truth for all agent prompts ─────────
// FE sends only raw user input + context identifiers (taskId / projectId).
// These functions fetch the necessary data and assemble the full prompt.

import { getTask } from '@/lib/db/tasks'
import { getProject } from '@/lib/db/projects'
import type { AgentRole } from './configs'

// ── Task-chat prompt ──────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AgentRole, string> = {
  architect: 'Planner Agent',
  developer: 'Doer Agent',
  reviewer: 'Reviewer Agent',
}

export async function buildChatPrompt(
  role: AgentRole,
  userMessage: string,
  taskId: string
): Promise<string> {
  const task = await getTask(taskId)
  if (!task) throw new Error(`Task ${taskId} not found`)

  return [
    `You are a ${ROLE_LABEL[role]} working on task: "${task.title}".`,
    `Task status: ${task.status}`,
    task.description ? `Task description: ${task.description}` : '',
    '',
    `User message: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}

// ── Planning prompt ───────────────────────────────────────────────────────────

export async function buildPlanPrompt(
  userMessage: string,
  projectId: string
): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  const taskSummary =
    project.tasks.length > 0
      ? `\nExisting tasks (${project.tasks.length}):\n` +
        project.tasks.map((t) => `- [${t.status}] ${t.title}`).join('\n')
      : '\nNo tasks yet.'

  return [
    `You are a planning agent for project "${project.name}".`,
    project.description ? `Project description: ${project.description}` : '',
    taskSummary,
    '',
    `Help the user plan their project.`,
    '',
    `User: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}

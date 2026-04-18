// ── Task generation prompt builder ───────────────────────────────────────────

import { getProject } from '@/lib/db/projects'
import type { ProjectDomain, ConversationMessage } from '../types'
import { DOMAIN_ROLE_LABELS } from '../role-labels'

export async function buildGenerateTasksPrompt(
  messages: ConversationMessage[],
  projectId: string
): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  const domain = (project.domain as ProjectDomain) ?? 'SOFTWARE_ENGINEERING'
  const architectLabel = DOMAIN_ROLE_LABELS[domain].architect

  const taskSummary =
    project.tasks.length > 0
      ? `\nExisting tasks (${project.tasks.length}):\n` +
        project.tasks.map((t) => `- [${t.status}] ${t.title}`).join('\n')
      : '\nNo existing tasks yet.'

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  return [
    `You are a ${architectLabel} analysing a planning conversation for project "${project.name}".`,
    project.description ? `Project description: ${project.description}` : '',
    taskSummary,
    '',
    `Here is the full planning conversation:`,
    '',
    conversationHistory,
    '',
    `Based on this conversation, extract a list of actionable tasks for the project.`,
    `Respond with ONLY a JSON code-fenced array of task objects. No explanations, no other text.`,
    `Each object must have:`,
    `  - "title": a short, imperative task title (string, required). Try to keep it high-level.`,
    `  - "description": a brief description of the task (string, optional)`,
    `  - "subtasks": an array of strings representing the granular checklist or subtasks to accomplish the main task (array of strings, required). Break the task down into 3-5 subtasks.`,
    ``,
    `Example format:`,
    '```json',
    `[`,
    `  {`,
    `    "title": "Set up project structure",`,
    `    "description": "Initialize repo with recommended folder layout",`,
    `    "subtasks": ["Create Next.js app layout", "Configure Prettier/ESlint", "Initialize git repo"]`,
    `  }`,
    `]`,
    '```',
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
}

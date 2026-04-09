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

interface PlanConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function buildPlanPrompt(
  userMessage: string,
  projectId: string,
  conversationHistory?: PlanConversationMessage[],
): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  // Task context: include up to 50 most recent tasks with details
  const tasks = project.tasks ?? []
  const maxTasks = 50
  const sortedTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxTasks)

  let taskContext: string
  if (sortedTasks.length === 0) {
    taskContext = '\nNo tasks yet.'
  } else {
    const taskLines = sortedTasks.map(
      (t) =>
        `- [${t.status}] [${t.priority}] "${t.title}" (id: ${t.id})${t.description ? ` — ${t.description.slice(0, 100)}` : ''}`,
    )
    taskContext =
      `\nCurrent tasks (${sortedTasks.length}${tasks.length > maxTasks ? ` of ${tasks.length} total, showing most recently updated` : ''}):\n` +
      taskLines.join('\n')
  }

  // Conversation history for continuity
  let historyBlock = ''
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-20)
    historyBlock =
      '\n\nConversation so far:\n' +
      recentHistory
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')
  }

  // Task mutation instruction
  const mutationInstruction = `

IMPORTANT: You can see all existing tasks above. Use this awareness to:
- Avoid suggesting tasks that already exist
- Suggest updates to existing tasks when relevant (e.g., changing status or priority)
- Suggest deleting tasks that are no longer needed
- Suggest new tasks that are missing

When you want to propose task changes, include a fenced code block tagged "task-mutations" in your response with a JSON array. Each entry should have:
- For adding: { "action": "add", "title": "...", "description": "..." }
- For updating: { "action": "update", "id": "<task-uuid>", "fields": { "status": "DONE" } }
- For deleting: { "action": "delete", "id": "<task-uuid>", "reason": "..." }

Example:
\`\`\`task-mutations
[
  { "action": "add", "title": "Set up CI pipeline", "description": "Configure GitHub Actions" },
  { "action": "update", "id": "abc-123", "fields": { "status": "IN_PROGRESS" } }
]
\`\`\`

Only include the task-mutations block when you are specifically proposing changes. For general discussion, just respond normally.`

  return [
    `You are a planning agent for project "${project.name}".`,
    project.description ? `Project description: ${project.description}` : '',
    taskContext,
    mutationInstruction,
    historyBlock,
    '',
    `Help the user plan their project. Be aware of the existing tasks and their statuses.`,
    '',
    `User: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}

// ── Generate-tasks prompt ─────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function buildGenerateTasksPrompt(
  messages: ConversationMessage[],
  projectId: string
): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  const taskSummary =
    project.tasks.length > 0
      ? `\nExisting tasks (${project.tasks.length}):\n` +
        project.tasks.map((t) => `- [${t.status}] ${t.title}`).join('\n')
      : '\nNo existing tasks yet.'

  const conversationHistory = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')

  return [
    `You are an architect agent analysing a planning conversation for project "${project.name}".`,
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
    `  - "title": a short, imperative task title (string, required)`,
    `  - "description": a brief description of the task (string, optional)`,
    ``,
    `Example format:`,
    `\`\`\`json`,
    `[`,
    `  { "title": "Set up project structure", "description": "Initialize repo with recommended folder layout" },`,
    `  { "title": "Implement user authentication", "description": "Add login/logout with JWT tokens" }`,
    `]`,
    `\`\`\``,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n')
}

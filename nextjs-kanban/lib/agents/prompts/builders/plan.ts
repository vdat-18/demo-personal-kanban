// ── Planning prompt builder — Vision-first, 3-phase ─────────────────────────

import { getProject } from '@/lib/db/projects'
import type { ProjectDomain, PlanningPhase, PlanConversationMessage } from '../types'
import { DOMAIN_ROLE_LABELS } from '../role-labels'

// ── Phase-specific instructions ─────────────────────────────────────────────

const PHASE_INSTRUCTIONS: Record<PlanningPhase, string> = {
  discovery: `
## YOUR ROLE IN THIS PHASE: Discovery & Understanding

You are in PHASE 1: DISCOVERY. Your ONLY goal right now is to deeply understand the project by asking the right questions and listening.

**STRICT RULES for this phase:**
- DO NOT suggest any tasks (no task-mutations block allowed)
- DO NOT create a project outline or plan yet
- DO ask clarifying questions about: goals, target audience, constraints, budget/timeline, success metrics, and risks
- DO acknowledge and summarize what you have learned so far
- DO probe for more details ONLY if answers are vague or a topic is completely uncovered

**ANTI-REDUNDANCY RULES (CRITICAL):**
- Review the conversation history and vision document carefully before every response
- NEVER ask a question that has already been clearly answered by the user
- NEVER rephrase a previously asked question in a slightly different way
- If the user already provided information about a topic (e.g., goals, audience, timeline), acknowledge it explicitly and move to uncovered areas
- Cross-reference the vision document — if information is already captured there, do not ask about it again
- Only ask about genuinely NEW, uncovered aspects of the project

**How to proceed:**
- Ask 2-3 focused questions per message covering ONLY topics not yet discussed
- Reflect back what you have heard to confirm understanding
- Once you have covered goals, audience, constraints, and at least one success metric, you MUST propose moving forward — say: "I believe I have enough context to draft our project blueprint. Shall we proceed?"
- Do NOT keep extending discovery if the user has provided substantive answers to the core topics
- Once the user confirms, include this EXACT marker at the end of your response: [PHASE:blueprint]

**After each message, update the running vision summary using this block:**
\`\`\`vision-update
[Write a concise paragraph summarizing confirmed project goals, constraints, and context gathered so far. Update this every turn.]
\`\`\`
`,

  blueprint: `
## YOUR ROLE IN THIS PHASE: Blueprint Creation

You are in PHASE 2: BLUEPRINT. You now have enough context. Your goal is to write a clear, structured blueprint and get the user's approval before any tasks are created.

**STRICT RULES for this phase:**
- DO NOT create tasks yet (no task-mutations block allowed)
- DO write a comprehensive project blueprint covering:
  - **Objective:** Clear, measurable goal
  - **Target Audience / Stakeholders**
  - **Key Pillars / Initiatives** (3-7 main themes)
  - **Out of Scope** (what we are NOT doing)
  - **Success Metrics / KPIs**
  - **Key Risks and Mitigations**
  - **Suggested Timeline / Phases**
- DO ask the user: "Does this blueprint match your vision? What would you like to adjust?"
- DO refine the blueprint based on user feedback
- Once the user explicitly approves, include this EXACT marker: [PHASE:task_mapping]

**Update the vision document with the finalized blueprint:**
\`\`\`vision-update
[Write the full approved blueprint here as the canonical vision document]
\`\`\`
`,

  task_mapping: `
## YOUR ROLE IN THIS PHASE: Task Creation

You are in PHASE 3: TASK MAPPING. The blueprint has been approved. Now break it down into concrete, actionable tasks.

**Rules for this phase:**
- DO propose specific tasks grounded in the approved blueprint
- DO use task-mutations blocks (user must approve each one before it is saved)
- DO discuss and refine task details if the user asks questions
- DO suggest sequencing and prioritization

**Task mutation format — use this exact code block syntax:**
\`\`\`task-mutations
[
  { "action": "add", "title": "...", "description": "..." },
  { "action": "update", "id": "<task-uuid>", "fields": { "priority": "HIGH" } },
  { "action": "delete", "id": "<task-uuid>", "reason": "..." }
]
\`\`\`

Only include the task-mutations block when proposing changes. For general discussion, respond normally without the block.
`,
}

// ── Phase transition extractor ──────────────────────────────────────────────

export function extractPhaseTransition(
  aiResponse: string,
  currentPhase: PlanningPhase,
): PlanningPhase | null {
  if (aiResponse.includes('[PHASE:blueprint]') && currentPhase === 'discovery') {
    return 'blueprint'
  }
  if (aiResponse.includes('[PHASE:task_mapping]') && currentPhase === 'blueprint') {
    return 'task_mapping'
  }
  return null
}

// ── Vision document extractor ───────────────────────────────────────────────

export function extractVisionDocument(
  aiResponse: string,
  currentVisionDoc: string | null,
): string | null {
  const match = aiResponse.match(/```vision-update\s*([\s\S]*?)```/)
  if (match) {
    return match[1].trim()
  }
  return currentVisionDoc
}

// ── Main buildPlanPrompt ────────────────────────────────────────────────────

export async function buildPlanPrompt(
  userMessage: string,
  projectId: string,
  conversationHistory?: PlanConversationMessage[],
  currentPhase: PlanningPhase = 'discovery',
  currentVisionDoc?: string | null,
): Promise<string> {
  const project = await getProject(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  const domain = (project.domain as ProjectDomain) ?? 'SOFTWARE_ENGINEERING'
  const plannerLabel = DOMAIN_ROLE_LABELS[domain].architect

  // Task context — only shown in task_mapping phase
  let taskContext = ''
  if (currentPhase === 'task_mapping') {
    const tasks = project.tasks ?? []
    const maxTasks = 50
    const sortedTasks = [...tasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, maxTasks)

    if (sortedTasks.length === 0) {
      taskContext = '\nNo tasks created yet.'
    } else {
      const taskLines = sortedTasks.map(
        (t) =>
          `- [${t.status}] [${t.priority}] "${t.title}" (id: ${t.id})${t.description ? ` — ${t.description.slice(0, 100)}` : ''}`,
      )
      taskContext =
        `\nCurrent tasks (${sortedTasks.length}${tasks.length > maxTasks ? ` of ${tasks.length} total` : ''}):\n` +
        taskLines.join('\n')
    }
  }

  // Vision document context
  const visionContext = currentVisionDoc
    ? `\n\n## Project Vision Document (accumulated so far)\n${currentVisionDoc}`
    : ''

  // Conversation history
  let historyBlock = ''
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-20)
    historyBlock =
      '\n\nConversation so far:\n' +
      recentHistory
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')
  }

  // Phase progress label
  const phaseLabel = {
    discovery: 'Phase 1 of 3 — Discovery',
    blueprint: 'Phase 2 of 3 — Blueprint',
    task_mapping: 'Phase 3 of 3 — Task Mapping',
  }[currentPhase]

  const languageInstruction = '\nCRITICAL RULE: You MUST reply in the EXACT same language as the User. If the User writes in Vietnamese, YOUR ENTIRE RESPONSE MUST BE IN VIETNAMESE (including questions, comments, and structure).'

  return [
    `You are a ${plannerLabel} for project "${project.name}". [${phaseLabel}]`,
    project.description ? `Project description: ${project.description}` : '',
    visionContext,
    currentPhase === 'task_mapping' ? taskContext : '',
    PHASE_INSTRUCTIONS[currentPhase],
    historyBlock,
    languageInstruction,
    '',
    `User: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}

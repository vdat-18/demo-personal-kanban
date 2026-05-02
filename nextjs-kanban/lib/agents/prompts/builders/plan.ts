// ── Planning prompt builder — Vision-first, 3-phase ─────────────────────────

import { getProject } from '@/lib/db/projects'
import type { ProjectDomain, PlanningPhase, PlanConversationMessage } from '../types'
import { DOMAIN_ROLE_LABELS } from '../role-labels'

// ── Phase-specific instructions ─────────────────────────────────────────────

// First message: ask rich opening cluster
const DISCOVERY_FIRST_MESSAGE = `
## YOUR ROLE: Deep Discovery — Opening Round

This is the FIRST message in the conversation. Launch a comprehensive opening discovery immediately.

Ask a rich cluster of 5-7 questions covering ALL of these dimensions at once — do NOT ask them one by one in separate turns:
1. **Core goal** — What problem does this project solve? What does success look like in 6 months?
2. **Target audience** — Who are the users? What are their pain points?
3. **Scope** — What must-have features? What is explicitly out of scope?
4. **Constraints** — Budget, timeline, team size, tech stack?
5. **Motivation** — Why now? What triggered this project?
6. **Risks** — What could go wrong? What has been tried before?
7. **Expectations** — What does the ideal end result look like?

Do NOT present Option A/B choices on this first message. Just ask the questions.
`

// Subsequent messages: brainstorm and guide naturally
const DISCOVERY_ONGOING = `
## YOUR ROLE: Project Architect — Strategic Brainstorming

You are in PHASE 1: DISCOVERY. Your goal is to understand the user's vision deeply and build a solid foundation for the project blueprint.

**CORE PRINCIPLES — TALK LIKE A HUMAN COLLEAGUE:**
1. **No Canned Phrases:** Do NOT use repetitive structures like "Thanks for sharing... However...". 
2. **Be Conversational:** React naturally to what the user said. If they gave a great idea, acknowledge its value and expand on it briefly before asking the next thing.
3. **Answer First:** If the user asks you a question (e.g., "Who are you?", "What can you do?"), answer them directly and naturally before steering back to the project.
4. **Read History Carefully:** Build on what's already been confirmed. NEVER ask about a topic already answered.

**GUIDELINES FOR THIS TURN:**
- Briefly reflect on the latest input to show you understood.
- If there are still major gaps in the vision (Goal, Audience, Scope, etc.), ask a cluster of relevant follow-up questions to fill them.
- Suggest strategic angles or hidden risks the user might have missed.
- **DO NOT append the "Option A/B" block.** Just have a natural conversation.

**WHEN TO TRANSITION:**
- When the Vision Document covers most key areas (Goal, Audience, Scope, Constraints), proactively suggest: "I think I have a clear picture now. Should we move on to drafting the Blueprint, or is there anything else you want to refine?"
- If the user says "Yes", "Go ahead", "Proceed", or any similar intent to move forward:
  - Include the marker: [PHASE:blueprint]
  - Then proceed to write the initial Blueprint in the same message (following PHASE 2 instructions).

**After each message, update the running vision summary:**
\`\`\`vision-update
[Concise paragraph summarizing ALL confirmed project info so far. Update every turn to avoid re-asking.]
\`\`\`
`

const PHASE_INSTRUCTIONS: Record<PlanningPhase, string> = {
  discovery: DISCOVERY_ONGOING, // replaced per-call based on isFirstMessage flag

  blueprint: `
## YOUR ROLE IN THIS PHASE: Blueprint Creation & Refinement

You are in PHASE 2: BLUEPRINT. The conversation history contains all context gathered during discovery.

**WHEN FIRST ENTERING THIS PHASE:**
Write a comprehensive initial blueprint covering:
- **Objective:** Clear, measurable goal
- **Target Audience / Stakeholders**
- **Key Pillars / Initiatives** (3-7 main themes)
- **Out of Scope**
- **Success Metrics / KPIs**
- **Key Risks and Mitigations**
- **Suggested Timeline / Phases**

After the blueprint, immediately identify weak spots proactively:
> "Areas I think need clarification:
> - [ ] Missing: specific persona for each customer segment
> - [ ] Unclear: main customer experience flow
> - [ ] Undefined: tech stack / specific POS system
> - ..."

Then present two options at the END of EVERY response:
---
💬 **What would you like to do next?**
- **Option A — Refine the blueprint:** Tell me what needs to change, or pick one of the suggestions above.
- **Option B — Create tasks:** The blueprint looks good — let's break it down into concrete tasks.
---

**ONGOING REFINEMENT RULES:**
- When user gives feedback, show the FULL updated blueprint — not just the diff
- After each update, proactively call out remaining gaps
- STRICT: NO task-mutations block in this phase

**TRANSITION TO TASK MAPPING:**
- Only when user explicitly picks Option B
- Include: [PHASE:task_mapping]

**Update vision document with current blueprint:**
\`\`\`vision-update
[Full current blueprint — update every time it changes]
\`\`\`
`,

  task_mapping: `
## YOUR ROLE IN THIS PHASE: Task Breakdown

You are in PHASE 3: TASK MAPPING. The blueprint is approved. Break it down into concrete, actionable tasks.

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

  // Determine if this is the very first user message (no prior history)
  const isFirstMessage = !conversationHistory || conversationHistory.length === 0

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

  // Conversation history block — placed BEFORE phase instructions so the model
  // reads what has already been said BEFORE deciding what to ask/do next
  let historyBlock = ''
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-20)
    historyBlock =
      '\n\n## Conversation History (read this BEFORE following any instructions below)\n' +
      recentHistory
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')
  }

  // Pick the right discovery instruction based on whether this is the opening message
  const phaseInstruction =
    currentPhase === 'discovery' && isFirstMessage
      ? DISCOVERY_FIRST_MESSAGE
      : PHASE_INSTRUCTIONS[currentPhase]

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
    // History BEFORE instructions — critical ordering
    historyBlock,
    phaseInstruction,
    languageInstruction,
    '',
    `User: ${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n')
}

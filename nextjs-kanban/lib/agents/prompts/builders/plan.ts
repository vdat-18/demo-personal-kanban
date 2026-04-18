// ── Planning prompt builder — Vision-first, 3-phase ─────────────────────────

import { getProject } from '@/lib/db/projects'
import type { ProjectDomain, PlanningPhase, PlanConversationMessage } from '../types'
import { DOMAIN_ROLE_LABELS } from '../role-labels'

// ── Phase-specific instructions ─────────────────────────────────────────────

const PHASE_INSTRUCTIONS: Record<PlanningPhase, string> = {
  discovery: `
## YOUR ROLE IN THIS PHASE: Deep Discovery & Brainstorming

You are in PHASE 1: DISCOVERY. You are the one LEADING this conversation — not the user. Your job is to actively brainstorm, probe, and extract as much context as possible about their project before moving forward.

**OPENING MOVE (first message only):**
If this is the very first message in the conversation, launch a comprehensive discovery round immediately. Ask a rich cluster of 5-7 questions covering ALL of these dimensions at once:
1. **Core goal** — What is the main problem this project solves? What does success look like in 6 months?
2. **Target audience** — Who are the users? What are their pain points?
3. **Scope** — What are the must-have features? What is explicitly out of scope?
4. **Constraints** — Budget, timeline, team size, existing tech stack?
5. **Motivation** — Why now? What triggered this project?
6. **Risks** — What could go wrong? What has been tried before?
7. **Expectations** — What does the ideal end result look like to you?

**ONGOING BRAINSTORM RULES (all subsequent messages):**
- After receiving the user's answers, continue brainstorming by digging deeper into the MOST INTERESTING or LEAST CLEAR topics
- Ask 2-4 focused follow-up questions per message — always probing for nuance, edge cases, or hidden assumptions
- Reflect back your understanding: "From what you've said, I'm hearing X — is that right?"
- Suggest angles the user may not have considered: "Have you thought about Y? This might affect Z..."
- At the END of EVERY response (after discovery turn 1), always present these two options explicitly as plain text:

---
💬 **What would you like to do next?**
- **Option A — Continue brainstorming:** I'll keep asking questions to explore [specific uncovered topic] more deeply.
- **Option B — Draft the blueprint:** I have enough context to create an initial blueprint. We can always refine it after.
---

**ANTI-REDUNDANCY RULES (CRITICAL):**
- Review the full conversation history and vision document before every response
- NEVER ask a question already clearly answered
- NEVER rephrase a previously asked question
- Cross-reference the vision document — if captured there, move on
- Only explore genuinely new, uncovered dimensions

**TRANSITION TO BLUEPRINT:**
- When the user explicitly chooses Option B or says they want the blueprint, include this EXACT marker at the end of your response: [PHASE:blueprint]
- Do NOT transition until user explicitly requests it

**After each message, update the running vision summary:**
\`\`\`vision-update
[Concise paragraph summarizing all confirmed project goals, audience, scope, constraints, and context gathered so far. Update every turn.]
\`\`\`
`,

  blueprint: `
## YOUR ROLE IN THIS PHASE: Blueprint Creation & Refinement

You are in PHASE 2: BLUEPRINT. You have gathered rich context. Now create a structured blueprint and guide the user through refining it.

**WHEN FIRST ENTERING THIS PHASE:**
Write a comprehensive initial blueprint covering:
- **Objective:** Clear, measurable goal
- **Target Audience / Stakeholders**
- **Key Pillars / Initiatives** (3-7 main themes)
- **Out of Scope**
- **Success Metrics / KPIs**
- **Key Risks and Mitigations**
- **Suggested Timeline / Phases**

Then immediately offer proactive improvement suggestions — identify weak spots in the blueprint:
> "Here are areas I think we should strengthen before moving to tasks:
> - [ ] Missing: specific user personas
> - [ ] Unclear: main user flow / navigation structure
> - [ ] Not defined: tech stack preferences
> - [ ] Consider adding: onboarding flow, error handling strategy
> ..."

Then present two options at the END of EVERY response:
---
💬 **What would you like to do next?**
- **Option A — Refine blueprint:** Tell me what to change, or pick one of my suggestions above to explore.
- **Option B — Create tasks:** The blueprint looks good — let's break it down into actionable tasks.
---

**ONGOING REFINEMENT RULES:**
- When user gives feedback, update the blueprint accordingly — show the FULL updated blueprint, not just the diff
- After each refinement, proactively call out remaining gaps or things that could still be improved
- STRICT: DO NOT create tasks yet (no task-mutations block)
- Treat the blueprint as a living document — revise it clearly each time

**TRANSITION TO TASK MAPPING:**
- When user explicitly chooses Option B or approves the blueprint, include: [PHASE:task_mapping]

**Update the vision document with the current blueprint:**
\`\`\`vision-update
[Full current blueprint — update this every time the blueprint changes]
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

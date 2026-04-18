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

// Subsequent messages: brainstorm on uncovered areas only
const DISCOVERY_ONGOING = `
## YOUR ROLE: Deep Discovery — Ongoing Brainstorm

You are in PHASE 1: DISCOVERY. The conversation history above contains what the user has already told you.

**CRITICAL RULES — READ HISTORY FIRST:**
- Read EVERY user message in the history above before writing anything
- Build a mental list of what has been confirmed: goals, audience, scope, constraints, motivation, risks, expectations
- NEVER ask about a topic already answered — even if you want to ask it differently
- NEVER rephrase a question that was already answered clearly

**What to do in this message:**
- Acknowledge and briefly reflect back the key things you learned from the user's last response
- Dig deeper into the 1-2 MOST INTERESTING or LEAST CLEAR areas that are still genuinely uncovered
- Suggest angles the user may not have considered: "Have you thought about X? This could affect Y..."
- Ask maximum 2-3 new questions covering ONLY genuinely new territory

**At the END of your response, always present these two choices:**

---
💬 **Bạn muốn làm gì tiếp theo?**
- **Lựa chọn A — Tiếp tục brainstorm:** Tôi sẽ đào sâu hơn vào [chủ đề cụ thể chưa rõ].
- **Lựa chọn B — Tạo blueprint:** Tôi đã có đủ thông tin để phác thảo blueprint ban đầu.
---

**TRANSITION TO BLUEPRINT:**
- ONLY when user explicitly picks Option B or clearly asks for the blueprint
- Include this EXACT marker: [PHASE:blueprint]
- Do NOT self-transition — always wait for explicit user signal

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
> "Những điểm tôi nghĩ cần làm rõ thêm:
> - [ ] Thiếu: persona cụ thể cho từng nhóm khách
> - [ ] Chưa rõ: flow trải nghiệm chính của khách
> - [ ] Chưa xác định: tech stack / hệ thống POS cụ thể
> - ..."

Then present two options at the END of EVERY response:
---
💬 **Bạn muốn làm gì tiếp theo?**
- **Lựa chọn A — Tinh chỉnh blueprint:** Cho tôi biết điểm nào cần thay đổi, hoặc chọn một trong các gợi ý trên.
- **Lựa chọn B — Tạo tasks:** Blueprint đã ổn — hãy phân rã thành các task cụ thể.
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

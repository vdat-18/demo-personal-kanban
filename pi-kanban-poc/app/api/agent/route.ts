/**
 * Unified agent endpoint backed by @mariozechner/pi-coding-agent SDK.
 *
 * Modes:
 *   - mode: "plan"   → non-streaming JSON envelope (planning thread)
 *   - mode: "chat"   → SSE stream of token deltas + final complete event
 *
 * Architecture notes (Tier 2 + 3):
 *   - Structured output: agent returns a typed JSON envelope (Tier 2.8). The
 *     planning system prompt instructs the model to emit a single JSON object
 *     matching the schema. We parse + validate before returning.
 *   - Session cache: per-thread AgentSession kept in memory with a TTL so that
 *     follow-up requests do not have to replay the full conversation (Tier 3.9).
 *   - Compaction: enabled via SettingsManager so long discovery threads do not
 *     blow the context window (Tier 3.10).
 *   - No domain templates: the agent self-detects the nature of the project
 *     from the user's first message (Tier 2.6).
 *   - Why-probe budget: enforced via instruction; the agent reports usage in
 *     the envelope so the client can stop showing the option after the limit.
 */

import { NextRequest } from 'next/server'
import {
  AgentSession,
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from '@mariozechner/pi-coding-agent'
import type {
  AgentEnvelope,
  DoerEnvelope,
  ReviewerEnvelope,
  PlanningPhase,
  StructuredQuestion,
  StructuredTaskProposal,
} from '@/types/domain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Provider configuration ──────────────────────────────────────────────────

const TROLLLLM_BASE_URL =
  process.env.TROLLLLM_BASE_URL ?? 'https://chat.trollllm.xyz/v1'
const TROLLLLM_API_KEY =
  process.env.TROLLLLM_API_KEY ?? process.env.LLM_API_KEY ?? ''
const TROLLLLM_MODEL_ID = process.env.TROLLLLM_MODEL ?? 'gpt-5.4'

if (!TROLLLLM_API_KEY) {
  console.warn(
    '[api/agent] No TROLLLLM_API_KEY set. Set TROLLLLM_API_KEY in .env.local to enable the agent.',
  )
}

const authStorage = AuthStorage.inMemory()
if (TROLLLLM_API_KEY) {
  authStorage.setRuntimeApiKey('trollllm', TROLLLLM_API_KEY)
}

const modelRegistry = ModelRegistry.inMemory(authStorage)
if (TROLLLLM_API_KEY) {
  modelRegistry.registerProvider('trollllm', {
    baseUrl: TROLLLLM_BASE_URL,
    apiKey: TROLLLLM_API_KEY,
    api: 'openai-completions',
    authHeader: true,
    models: [
      {
        id: TROLLLLM_MODEL_ID,
        name: TROLLLLM_MODEL_ID,
        api: 'openai-completions',
        reasoning: false,
        // Vision is enabled — multimodal upload pipeline will pass image
        // content blocks (Tier 3.12). Non-image files are converted to text
        // server-side before being added to the prompt.
        input: ['text', 'image'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 200_000,
        maxTokens: 8_192,
      },
    ],
  })
}

function getAgentModel() {
  const m = modelRegistry.find('trollllm', TROLLLLM_MODEL_ID)
  if (!m) throw new Error(`Model trollllm/${TROLLLLM_MODEL_ID} not registered`)
  return m
}

// ─── Session cache (Tier 3.9) ────────────────────────────────────────────────
// Per-thread AgentSession kept hot in memory. Avoids re-replaying the entire
// transcript on every follow-up request.
//
// Trade-offs:
//   - Lost on server restart → next call rebuilds from history sent by client.
//   - Single-process only (no Redis). Fine for POC.

interface CacheEntry {
  session: AgentSession
  systemPrompt: string
  lastAccess: number
  /** Number of user prompts already fed to this session. Used to send only
   *  delta when client passes the full message history. */
  promptedCount: number
}

const SESSION_CACHE = new Map<string, CacheEntry>()
const SESSION_TTL_MS = 30 * 60 * 1000 // 30 min

function gcSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS
  for (const [key, entry] of SESSION_CACHE) {
    if (entry.lastAccess < cutoff) {
      try {
        entry.session.dispose()
      } catch {
        /* ignore */
      }
      SESSION_CACHE.delete(key)
    }
  }
}

setInterval(gcSessions, 5 * 60 * 1000).unref?.()

// ─── Request shape ────────────────────────────────────────────────────────────

interface BaseRequest {
  mode: 'plan' | 'chat' | 'breakdown' | 'doer' | 'reviewer'
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}

interface PlanRequest extends BaseRequest {
  mode: 'plan'
  /** Stable identifier for the planning thread. Enables session cache reuse. */
  threadId?: string
  phase?: PlanningPhase
  visionDocument?: string | null
  projectName?: string
  projectDescription?: string | null
  whyProbesUsed?: number
  /** Whether this turn is a user-initiated "force into next/previous phase"
   *  signal. Server passes it as a hint to the model. */
  userPhaseRequest?: { targetPhase: PlanningPhase; confirmed: boolean } | null
  /** When the user just performed a direct edit on the vision document, the
   *  client passes the new content here so the agent is told about it
   *  explicitly via a system note (Tier 1.4). */
  visionDirectEdit?: { newContent: string; previousContent: string | null } | null
  /** Base64-encoded images from the user's last message (Tier 3.12 vision). */
  imageFiles?: Array<{ mimeType: string; base64: string }>
  /** Import onboarding mode: the first turn must summarize the uploaded
   *  material in detail before any task proposal cards appear. */
  importReadbackOnly?: boolean
}

interface ChatRequest extends BaseRequest {
  mode: 'chat'
  taskTitle?: string
  taskDescription?: string | null
  systemPromptOverride?: string
}

interface DoerRequest extends BaseRequest {
  mode: 'doer'
  taskId: string
  taskTitle?: string
  taskDescription?: string | null
  systemPromptOverride?: string
}

interface ReviewerRequest extends BaseRequest {
  mode: 'reviewer'
  taskId: string
  taskTitle?: string
  taskDescription?: string | null
  systemPromptOverride?: string
}

// ─── Breakdown agent (Tier 2.5) ──────────────────────────────────────────────
// Used by the per-task "✨ Break down" flow on the Mission Control board.
// Stateless (no session cache reuse) — each call is a one-shot. Fed structured
// project context up front so subtasks are personalised.

interface BreakdownRequest extends BaseRequest {
  mode: 'breakdown'
  taskId: string
  taskTitle: string
  taskDescription?: string | null
  taskPriority?: string | null
  taskKind?: 'research' | 'create' | 'communicate' | 'decide' | 'generic'
  projectContext?: {
    name: string
    description: string | null
    visionDocument: string | null
    otherTasks?: Array<{ title: string; status: string }>
  } | null
  /** When the user already answered a clarification question, the answer is
   *  appended here so the agent can re-generate without losing context. */
  additionalContext?: string | null
  /** Refine mode (Tier 3.12): pass existing subtasks + user's refine request,
   *  agent returns a FULL updated subtask list for diff/merge. */
  refineMode?: boolean
  existingSubtasks?: Array<{
    id: string
    title: string
    description?: string | null
    completed?: boolean
  }>
  userRefineRequest?: string
}

type AgentRequest = PlanRequest | ChatRequest | BreakdownRequest | DoerRequest | ReviewerRequest

// ─── System prompts ──────────────────────────────────────────────────────────

const PLAN_SCHEMA_DESCRIPTION = `
Respond with a SINGLE JSON object (no surrounding text, no markdown fences) that
matches this TypeScript type EXACTLY:

{
  "content": string,
  "visionDocument": string | null,
  "visionChanges": string[] | null,
  "readyForNextPhase": boolean,
  "suggestedPhase": "discovery" | "blueprint" | "task_mapping" | null,
  "reasonForTransition": string | null,
  "detectedUserIntent":
    | "jump_phase"
    | "revise_vision"
    | "approve_all"
    | "clarify_answer"
    | null,
  "targetPhase": "discovery" | "blueprint" | "task_mapping" | null,
  "questions": Array<{
    "id": string,
    "dimension": "what" | "why" | "who" | "when" | "how" | "constraint",
    "text": string,
    "hint": string | null,
    "inputType": "text" | "chip_single" | "chip_multi" | "chip_plus_text",
    "suggestions": string[] | null,
    "required": boolean
  }> | null,
  "tasks": Array<{
    "id": string,
    "title": string,
    "description": string | null,
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "estimatedEffort": string | null,
    "milestone": string | null,
    "dependencies": string[] | null
  }> | null,
  "metadata": {
    "confidenceNote": string | null,
    "openQuestions": string[] | null,
    "whyProbesUsed": number
  } | null
}

Rules:
- "content" is the human-readable reply that will be shown in the chat bubble.
  Plain markdown is allowed. NEVER include phase markers like <<PHASE>> or
  <<<VISION>>> — those are obsolete.
- Set fields to null/empty arrays when you have nothing to say. Never invent
  tasks or questions just to fill them.
- Output ONLY the JSON object. No prose before or after. No code fences.
`

function buildPlanSystemPrompt(req: PlanRequest): string {
  const phase = req.phase ?? 'discovery'

  const lines: string[] = [
    'You are a friendly planning partner for non-technical users.',
    'Your job is to turn a user idea into a concrete plan and action items',
    'WITHOUT jargon, WITHOUT overwhelming them with questions.',
    '',
    `Current phase: ${phase}.`,
    '',
    '── Phase semantics (internal labels) ─────────────────────────',
    '- discovery: gather enough context to draft a solid blueprint. Ask',
    '  questions in BATCHES of AT LEAST 4 and IDEALLY 5-7 questions per turn.',
    '  Returning fewer than 4 questions in discovery phase is a failure mode —',
    '  you are meant to explore, not to interview one bullet at a time. Cover',
    '  the 6 discovery dimensions systematically across 2-3 batches before',
    '  declaring readyForNextPhase:',
    '    • WHAT: the concrete output/deliverable, scope boundaries (in/out)',
    '    • WHY: the underlying reason, success metrics, cost of inaction',
    '    • WHO: audience, stakeholders who must approve, people who execute',
    '    • WHEN: hard deadline, intermediate milestones, blocking dependencies',
    '    • HOW: budget, available tools/platforms, preferred methods',
    '    • CONSTRAINT: compliance, brand guidelines, resource caps, risks',
    '  For each question set the "dimension" field. Prefer chip suggestions for',
    '  closed-domain answers (timeline windows, budget tier, audience type,',
    '  yes/no). Use free text only when the answer is genuinely open-ended.',
    '  Adapt phrasing/examples to the nature of the project (event, business,',
    '  learning, personal life, ...). Do NOT ask the user to declare a domain.',
    '- blueprint: produce or revise the vision document in markdown. The',
    '  document lives in the visionDocument field. IMPORTANT: even during',
    '  discovery you MAY and SHOULD return an updated visionDocument as soon',
    '  as you have enough to draft a v1 (after the first batch of answers).',
    '  Each subsequent batch should ENRICH/REVISE the draft — never start from',
    '  scratch. Mark it as a draft in the content if confidence is still low.',
    '  Keep "content" short — the user reads the document, not the chat bubble.',
    '- task_mapping: propose concrete tasks via the "tasks" array. Return them',
    '  in the structured field, NEVER as inline markdown bullets. Group with',
    '  the milestone field when natural. Tasks should be small enough to act on.',
    '',
    '── Progressive blueprint drafting ────────────────────────────',
    '- After the user answers batch 1 of discovery questions, produce an',
    '  initial visionDocument (even if thin). Tag sections as "draft" when',
    '  information is still missing.',
    '- After each subsequent batch, REVISE the existing visionDocument:',
    '    • add newly learned details in the appropriate section,',
    '    • remove obsolete assumptions the user contradicted,',
    '    • tighten language as the picture stabilizes.',
    '- Keep section headings stable across versions so the diff reads cleanly.',
    '- Never regenerate the document from scratch unless the user explicitly',
    '  asks to start over.',
    '',
    '── Phase transitions ─────────────────────────────────────────',
    '- When you believe the current phase is "done enough", set',
    '  readyForNextPhase=true, suggestedPhase=<next>, reasonForTransition=<short',
    '  human reason>. Only suggest moving on AFTER covering at least WHAT/WHY/',
    '  WHEN in discovery and producing a visionDocument draft. NEVER change',
    '  phase silently.',
    '- If the user asks to skip ahead or jump back ("just give me the tasks",',
    '  "let\'s revisit the goal"), set detectedUserIntent="jump_phase" and',
    '  targetPhase=<their target>. Do not refuse — the client will confirm with',
    '  the user if needed.',
    '',
    '── "Why" probes (rare, valuable) ─────────────────────────────',
    `- You may ask at most 2 deeper "why" questions per phase. Already used: ${req.whyProbesUsed ?? 0}.`,
    '- Only probe when the answer reveals an arbitrary-looking decision or a',
    '  conflict. Never probe trivial preferences. Increment metadata.whyProbesUsed',
    '  in your response when you do probe.',
    '',
    '── Output format ─────────────────────────────────────────────',
    PLAN_SCHEMA_DESCRIPTION,
  ]

  if (req.importReadbackOnly) {
    lines.push(
      '',
      '── Imported document readback mode ─────────────────────────',
      '- This is the FIRST turn after the user imported files into the project.',
      '- Your job on THIS turn is to read back the uploaded material carefully',
      '  before proposing any work.',
      '- In "content", provide a FULL structured summary with these sections:',
      '  1. "What I understood overall"',
      '  2. "File-by-file summary"',
      '  3. "Additional notes from you" if the user included extra text',
      '  4. "What still needs clarification"',
      '- You MUST explicitly reference each uploaded file individually.',
      '- You MUST summarise each file in detail, not just the whole bundle.',
      '- Do NOT propose tasks on this turn. Set "tasks" to null.',
      '- Do NOT transition to task mapping on this turn.',
      '- Stay in discovery. Ask focused clarifying questions after the readback.',
      '- You MAY draft or update the visionDocument if helpful, but task cards',
      '  must not appear yet.',
    )
  }

  if (req.projectName) {
    lines.push('', `Project name: ${req.projectName}`)
    if (req.projectDescription) lines.push(`Description: ${req.projectDescription}`)
  }

  if (req.visionDocument) {
    lines.push('', '── Existing vision document ─────────────────────────────')
    lines.push(req.visionDocument)
  }

  if (req.visionDirectEdit) {
    lines.push('', '── User just edited the plan directly ────────────────────')
    lines.push('Do NOT re-ask anything they edited. Acknowledge briefly if it')
    lines.push('reveals new information, then continue.')
    lines.push('New version:')
    lines.push(req.visionDirectEdit.newContent)
  }

  if (req.userPhaseRequest) {
    lines.push('', '── User-requested phase jump ─────────────────────────────')
    lines.push(`Target phase: ${req.userPhaseRequest.targetPhase}`)
    lines.push(`Confirmed by user: ${req.userPhaseRequest.confirmed}`)
    lines.push(
      'If confirmed, perform the phase transition immediately (set the',
      'appropriate phase field). If not yet confirmed and the jump is forward',
      '(skipping work), include a brief warning in "content".',
    )
  }

  return lines.join('\n')
}

function buildChatSystemPrompt(req: ChatRequest): string {
  if (req.systemPromptOverride) return req.systemPromptOverride
  const lines: string[] = [
    'You are a friendly assistant collaborating on a single kanban task.',
    'Be concise, propose concrete next steps, and ask clarifying questions',
    'when ambiguous.',
  ]
  if (req.taskTitle) lines.push('', `Task: ${req.taskTitle}`)
  if (req.taskDescription) lines.push(`Details: ${req.taskDescription}`)
  return lines.join('\n')
}

function normalizeDoerEnvelope(obj: unknown): DoerEnvelope {
  const o = (obj ?? {}) as Record<string, unknown>
  const result = o.result as Record<string, unknown> | null | undefined
  return {
    stepUnderstanding: typeof o.stepUnderstanding === 'string' ? o.stepUnderstanding : '',
    targetSubtaskId: typeof o.targetSubtaskId === 'string' ? o.targetSubtaskId : null,
    result: result
      ? {
          summary: typeof result.summary === 'string' ? result.summary : '',
          artifact: typeof result.artifact === 'string' ? result.artifact : '',
          nextAction: typeof result.nextAction === 'string' ? result.nextAction : null,
        }
      : null,
    needsHumanInput:
      o.needsHumanInput && typeof (o.needsHumanInput as Record<string, unknown>).question === 'string'
        ? { question: (o.needsHumanInput as Record<string, unknown>).question as string }
        : null,
    markSubtaskCompleted: o.markSubtaskCompleted === true,
    readyForReview: o.readyForReview === true,
    taskSummary: typeof o.taskSummary === 'string' ? o.taskSummary : null,
  }
}

function normalizeReviewerEnvelope(obj: unknown): ReviewerEnvelope {
  const o = (obj ?? {}) as Record<string, unknown>
  const taskReview = o.taskReview as Record<string, unknown> | null | undefined
  const stepReviewsRaw = Array.isArray(o.stepReviews) ? o.stepReviews : []
  return {
    reviewUnderstanding:
      typeof o.reviewUnderstanding === 'string' ? o.reviewUnderstanding : '',
    taskReview: taskReview
      ? {
          summary: typeof taskReview.summary === 'string' ? taskReview.summary : '',
          findings: Array.isArray(taskReview.findings)
            ? taskReview.findings.filter((f): f is string => typeof f === 'string')
            : [],
          recommendation:
            typeof taskReview.recommendation === 'string'
              ? taskReview.recommendation
              : null,
        }
      : null,
    stepReviews: stepReviewsRaw.map((raw) => {
      const s = raw as Record<string, unknown>
      return {
        subtaskId: typeof s.subtaskId === 'string' ? s.subtaskId : '',
        summary: typeof s.summary === 'string' ? s.summary : '',
        findings: Array.isArray(s.findings)
          ? s.findings.filter((f): f is string => typeof f === 'string')
          : [],
        recommendation:
          typeof s.recommendation === 'string' ? s.recommendation : null,
      }
    }).filter((r) => r.subtaskId.length > 0),
    needsHumanInput:
      o.needsHumanInput && typeof (o.needsHumanInput as Record<string, unknown>).question === 'string'
        ? { question: (o.needsHumanInput as Record<string, unknown>).question as string }
        : null,
    approveTask: o.approveTask === true,
    changeRequest: typeof o.changeRequest === 'string' ? o.changeRequest : null,
    verdict:
      o.verdict === 'approve'
        || o.verdict === 'minor_revision'
        || o.verdict === 'major_revision'
        || o.verdict === 'replan_needed'
        ? (o.verdict as ReviewerEnvelope['verdict'])
        : undefined,
    confidence: typeof o.confidence === 'number' ? o.confidence : undefined,
    changeActions: Array.isArray(o.changeActions)
      ? (o.changeActions as Array<Record<string, unknown>>)
          .map((a) => {
            const action = a.action
            if (action !== 'revise' && action !== 'remove' && action !== 'add' && action !== 'clarify') {
              return null
            }
            return {
              subtaskId: typeof a.subtaskId === 'string' ? a.subtaskId : undefined,
              action: action as 'revise' | 'remove' | 'add' | 'clarify',
              reason: typeof a.reason === 'string' ? a.reason : '',
              suggestedContent:
                typeof a.suggestedContent === 'string' ? a.suggestedContent : undefined,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null && x.reason.length > 0)
      : undefined,
  }
}

// ─── Envelope parsing & validation ───────────────────────────────────────────

function safeParseEnvelope(raw: string): AgentEnvelope | null {
  // Strip optional ```json fences just in case the model adds them.
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
  }
  // Locate the outermost JSON object — handles cases where the model adds
  // a stray sentence before/after.
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return null
  const slice = text.slice(start, end + 1)

  try {
    const obj = JSON.parse(slice)
    return normalizeEnvelope(obj)
  } catch {
    return null
  }
}

function normalizeEnvelope(obj: unknown): AgentEnvelope {
  const o = (obj ?? {}) as Record<string, unknown>
  const envelope: AgentEnvelope = {
    content: typeof o.content === 'string' ? o.content : '',
    visionDocument: typeof o.visionDocument === 'string' ? o.visionDocument : null,
    visionChanges: Array.isArray(o.visionChanges)
      ? (o.visionChanges as unknown[]).filter((s): s is string => typeof s === 'string')
      : null,
    readyForNextPhase: o.readyForNextPhase === true,
    suggestedPhase: isPhase(o.suggestedPhase) ? (o.suggestedPhase as PlanningPhase) : null,
    reasonForTransition:
      typeof o.reasonForTransition === 'string' ? o.reasonForTransition : null,
    detectedUserIntent: ((): AgentEnvelope['detectedUserIntent'] => {
      const v = o.detectedUserIntent
      if (v === 'jump_phase' || v === 'revise_vision' || v === 'approve_all' || v === 'clarify_answer') {
        return v
      }
      return null
    })(),
    targetPhase: isPhase(o.targetPhase) ? (o.targetPhase as PlanningPhase) : null,
    questions: Array.isArray(o.questions) ? o.questions.map(normalizeQuestion).filter(Boolean) as StructuredQuestion[] : null,
    tasks: Array.isArray(o.tasks) ? o.tasks.map(normalizeTask).filter(Boolean) as StructuredTaskProposal[] : null,
    metadata: ((): AgentEnvelope['metadata'] => {
      const m = o.metadata as Record<string, unknown> | undefined
      if (!m) return null
      return {
        confidenceNote: typeof m.confidenceNote === 'string' ? m.confidenceNote : null,
        openQuestions: Array.isArray(m.openQuestions)
          ? (m.openQuestions as unknown[]).filter((s): s is string => typeof s === 'string')
          : null,
        whyProbesUsed: typeof m.whyProbesUsed === 'number' ? m.whyProbesUsed : undefined,
      }
    })(),
  }
  return envelope
}

function isPhase(v: unknown): boolean {
  return v === 'discovery' || v === 'blueprint' || v === 'task_mapping'
}

function normalizeQuestion(raw: unknown): StructuredQuestion | null {
  const o = (raw ?? {}) as Record<string, unknown>
  if (typeof o.text !== 'string' || o.text.length === 0) return null
  const inputType = (o.inputType as string) ?? 'text'
  const validInput =
    inputType === 'text' || inputType === 'chip_single' || inputType === 'chip_multi' || inputType === 'chip_plus_text'
  return {
    id: typeof o.id === 'string' ? o.id : `q_${Math.random().toString(36).slice(2, 10)}`,
    dimension:
      o.dimension === 'what' || o.dimension === 'why' || o.dimension === 'who'
        || o.dimension === 'when' || o.dimension === 'how' || o.dimension === 'constraint'
        ? o.dimension
        : 'what',
    text: o.text,
    hint: typeof o.hint === 'string' ? o.hint : null,
    inputType: validInput ? (inputType as StructuredQuestion['inputType']) : 'text',
    suggestions: Array.isArray(o.suggestions)
      ? (o.suggestions as unknown[]).filter((s): s is string => typeof s === 'string')
      : null,
    required: o.required === true,
  }
}

function normalizeTask(raw: unknown): StructuredTaskProposal | null {
  const o = (raw ?? {}) as Record<string, unknown>
  if (typeof o.title !== 'string' || o.title.length === 0) return null
  const validPriority = (p: unknown): p is StructuredTaskProposal['priority'] =>
    p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT'
  return {
    id: typeof o.id === 'string' ? o.id : `t_${Math.random().toString(36).slice(2, 10)}`,
    title: o.title,
    description: typeof o.description === 'string' ? o.description : null,
    priority: validPriority(o.priority) ? o.priority : 'MEDIUM',
    estimatedEffort: typeof o.estimatedEffort === 'string' ? o.estimatedEffort : null,
    milestone: typeof o.milestone === 'string' ? o.milestone : null,
    dependencies: Array.isArray(o.dependencies)
      ? (o.dependencies as unknown[]).filter((s): s is string => typeof s === 'string')
      : null,
  }
}

// ─── Session helpers ─────────────────────────────────────────────────────────

async function buildFreshSession(systemPrompt: string): Promise<AgentSession> {
  const settingsManager = SettingsManager.inMemory({
    // Compaction (Tier 3.10) — let the SDK summarize old turns when the
    // context window is mostly consumed. Defaults are sensible; tweak the
    // utilization if needed.
    compaction: { enabled: true },
  })

  const { DefaultResourceLoader } = await import('@mariozechner/pi-coding-agent')
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    settingsManager,
    systemPromptOverride: () => systemPrompt,
  })
  await loader.reload()

  const { session } = await createAgentSession({
    model: getAgentModel(),
    thinkingLevel: 'off',
    sessionManager: SessionManager.inMemory(),
    settingsManager,
    authStorage,
    modelRegistry,
    resourceLoader: loader,
    // No filesystem / shell tools — this POC keeps the agent read-only.
    tools: [],
  })

  return session
}

async function getOrCreateSession(
  cacheKey: string | null,
  systemPrompt: string,
  fullHistory: BaseRequest['messages'],
): Promise<{ session: AgentSession; promptToFeed: string; shouldDispose: boolean }> {
  // No threadId → no caching, run a one-shot session and dispose afterwards.
  if (!cacheKey) {
    const session = await buildFreshSession(systemPrompt)
    const transcript = serializeTranscript(fullHistory)
    return { session, promptToFeed: transcript, shouldDispose: true }
  }

  const existing = SESSION_CACHE.get(cacheKey)
  // System prompt changes between turns (phase, vision content) — rebuild if so.
  if (existing && existing.systemPrompt === systemPrompt) {
    existing.lastAccess = Date.now()
    // Determine which user messages haven't been fed yet.
    const userPrompts = fullHistory.filter((m) => m.role === 'user')
    const newUserPrompts = userPrompts.slice(existing.promptedCount)
    if (newUserPrompts.length === 0) {
      // Nothing new — caller passed stale history. Re-feed last user message
      // as a defensive fallback.
      const last = userPrompts[userPrompts.length - 1]
      return {
        session: existing.session,
        promptToFeed: last?.content ?? '',
        shouldDispose: false,
      }
    }
    const promptToFeed = newUserPrompts.map((m) => m.content).join('\n\n')
    existing.promptedCount += newUserPrompts.length
    return { session: existing.session, promptToFeed, shouldDispose: false }
  }

  // Either no entry, or system prompt changed → rebuild.
  if (existing) {
    try {
      existing.session.dispose()
    } catch {
      /* ignore */
    }
    SESSION_CACHE.delete(cacheKey)
  }
  const session = await buildFreshSession(systemPrompt)
  const transcript = serializeTranscript(fullHistory)
  const userPromptCount = fullHistory.filter((m) => m.role === 'user').length
  SESSION_CACHE.set(cacheKey, {
    session,
    systemPrompt,
    lastAccess: Date.now(),
    promptedCount: userPromptCount,
  })
  return { session, promptToFeed: transcript, shouldDispose: false }
}

function serializeTranscript(messages: BaseRequest['messages']): string {
  return messages.map((m) => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n')
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * When the last user message contains images, we bypass the SDK and call the
 * OpenAI-compatible endpoint directly with multimodal content blocks.
 */
async function callMultimodalPlan(
  systemPrompt: string,
  messages: BaseRequest['messages'],
  imageFiles: Array<{ mimeType: string; base64: string }>,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  // Build a messages array where the LAST user message gets image_url blocks prepended
  const openaiMessages: Array<{ role: string; content: string | unknown[] }> = [
    { role: 'system', content: systemPrompt },
  ]
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const isLastUser = m.role === 'user' && i === messages.length - 1
    if (isLastUser && imageFiles.length > 0) {
      const content: unknown[] = imageFiles.map((img) => ({
        type: 'image_url',
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      }))
      content.push({ type: 'text', text: m.content })
      openaiMessages.push({ role: 'user', content })
    } else {
      openaiMessages.push({ role: m.role, content: m.content })
    }
  }

  const resp = await fetch(`${TROLLLLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TROLLLLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: TROLLLLM_MODEL_ID,
      messages: openaiMessages,
      max_tokens: 8192,
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Multimodal API error (${resp.status}): ${err}`)
  }
  const data = await resp.json() as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

async function handlePlan(req: PlanRequest): Promise<Response> {
  const systemPrompt = buildPlanSystemPrompt(req)

  let assistantText = ''
  let inputTokens = 0
  let outputTokens = 0

  if (req.imageFiles && req.imageFiles.length > 0) {
    // Vision path — call the multimodal API directly
    const result = await callMultimodalPlan(systemPrompt, req.messages, req.imageFiles)
    assistantText = result.text
    inputTokens = result.inputTokens
    outputTokens = result.outputTokens
  } else {
    // Normal text path — use the SDK session (with caching)
    const cacheKey = req.threadId ?? null
    const { session, promptToFeed, shouldDispose } = await getOrCreateSession(
      cacheKey,
      systemPrompt,
      req.messages,
    )

    const unsubscribe = session.subscribe((event: any) => {
      if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
        assistantText += event.assistantMessageEvent.delta as string
      }
      if (event.type === 'turn_end' && event.message?.usage) {
        inputTokens += event.message.usage.input ?? 0
        outputTokens += event.message.usage.output ?? 0
      }
    })

    try {
      await session.prompt(promptToFeed)
    } finally {
      unsubscribe()
      if (shouldDispose) session.dispose()
    }
  }

  // Try to parse structured envelope. If the model misbehaved, fall back to
  // a synthetic envelope that just shows the raw text.
  let envelope = safeParseEnvelope(assistantText)
  if (!envelope) {
    envelope = {
      content: assistantText.trim(),
      visionDocument: null,
      visionChanges: null,
      readyForNextPhase: false,
      suggestedPhase: null,
      reasonForTransition: null,
      detectedUserIntent: null,
      targetPhase: null,
      questions: null,
      tasks: null,
      metadata: { confidenceNote: 'fallback_unparsed', openQuestions: null },
    }
  }

  if (req.importReadbackOnly) {
    envelope.tasks = null
    envelope.suggestedPhase = envelope.suggestedPhase === 'task_mapping' ? 'blueprint' : envelope.suggestedPhase
    envelope.targetPhase = envelope.targetPhase === 'task_mapping' ? null : envelope.targetPhase
    envelope.readyForNextPhase = false
  }

  return Response.json({
    envelope,
    tokenUsage: { input: inputTokens, output: outputTokens },
  })
}

async function handleChat(req: ChatRequest): Promise<Response> {
  const systemPrompt = buildChatSystemPrompt(req)
  const session = await buildFreshSession(systemPrompt)

  const transcript = serializeTranscript(req.messages)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      let inputTokens = 0
      let outputTokens = 0
      let finalText = ''

      const unsubscribe = session.subscribe((event: any) => {
        if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
          const delta = event.assistantMessageEvent.delta as string
          finalText += delta
          send({ type: 'token', delta })
        }
        if (event.type === 'turn_end' && event.message?.usage) {
          inputTokens += event.message.usage.input ?? 0
          outputTokens += event.message.usage.output ?? 0
        }
      })

      send({ type: 'started', role: 'assistant' })

      try {
        await session.prompt(transcript)
        send({
          type: 'complete',
          tokenUsage: { input: inputTokens, output: outputTokens },
          conversation: null,
          result: finalText,
        })
      } catch (err) {
        send({
          type: 'error',
          error: err instanceof Error ? err.message : 'Unknown agent error',
        })
      } finally {
        unsubscribe()
        session.dispose()
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

async function handleDoer(req: DoerRequest): Promise<Response> {
  const systemPrompt = req.systemPromptOverride ?? [
    'You are the Doer Agent for a single kanban subtask.',
    'Return structured JSON only.',
    req.taskTitle ? `Task: ${req.taskTitle}` : '',
    req.taskDescription ? `Details: ${req.taskDescription}` : '',
  ].filter(Boolean).join('\n')
  const session = await buildFreshSession(systemPrompt)

  const transcript = serializeTranscript(req.messages)

  let assistantText = ''
  let inputTokens = 0
  let outputTokens = 0

  const unsubscribe = session.subscribe((event: any) => {
    if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
      assistantText += event.assistantMessageEvent.delta as string
    }
    if (event.type === 'turn_end' && event.message?.usage) {
      inputTokens += event.message.usage.input ?? 0
      outputTokens += event.message.usage.output ?? 0
    }
  })

  try {
    await session.prompt(transcript)
  } finally {
    unsubscribe()
    session.dispose()
  }

  let text = assistantText.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  let envelope: DoerEnvelope | null = null
  if (start !== -1 && end !== -1 && end > start) {
    try {
      envelope = normalizeDoerEnvelope(JSON.parse(text.slice(start, end + 1)))
    } catch {
      envelope = null
    }
  }

  if (!envelope) {
    envelope = {
      stepUnderstanding: '',
      targetSubtaskId: null,
      result: null,
      needsHumanInput: {
        question: 'I could not format the work result correctly. Please tell me exactly what kind of deliverable you want from this step.',
      },
      markSubtaskCompleted: false,
      readyForReview: false,
      taskSummary: null,
    }
  }

  return Response.json({
    envelope,
    tokenUsage: { input: inputTokens, output: outputTokens },
  })
}

async function handleReviewer(req: ReviewerRequest): Promise<Response> {
  const systemPrompt = req.systemPromptOverride ?? [
    'You are the Reviewer Agent for a kanban task.',
    'Return structured JSON only.',
    req.taskTitle ? `Task: ${req.taskTitle}` : '',
    req.taskDescription ? `Details: ${req.taskDescription}` : '',
  ].filter(Boolean).join('\n')
  const session = await buildFreshSession(systemPrompt)

  const transcript = serializeTranscript(req.messages)

  let assistantText = ''
  let inputTokens = 0
  let outputTokens = 0

  const unsubscribe = session.subscribe((event: any) => {
    if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
      assistantText += event.assistantMessageEvent.delta as string
    }
    if (event.type === 'turn_end' && event.message?.usage) {
      inputTokens += event.message.usage.input ?? 0
      outputTokens += event.message.usage.output ?? 0
    }
  })

  try {
    await session.prompt(transcript)
  } finally {
    unsubscribe()
    session.dispose()
  }

  let text = assistantText.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  let envelope: ReviewerEnvelope | null = null
  if (start !== -1 && end !== -1 && end > start) {
    try {
      envelope = normalizeReviewerEnvelope(JSON.parse(text.slice(start, end + 1)))
    } catch {
      envelope = null
    }
  }

  if (!envelope) {
    envelope = {
      reviewUnderstanding: '',
      taskReview: null,
      stepReviews: [],
      needsHumanInput: {
        question: 'I could not format the review result correctly. Please tell me what quality standard you want me to review against.',
      },
      approveTask: false,
      changeRequest: null,
    }
  }

  return Response.json({
    envelope,
    tokenUsage: { input: inputTokens, output: outputTokens },
  })
}

// ─── Breakdown agent ─────────────────────────────────────────────────────────
// Separate system-prompt builder + schema so the breakdown contract is
// documented right next to the handler. The main structural difference vs
// the planning envelope is: one task → subtasks, no phase transitions.

const BREAKDOWN_SCHEMA_DESCRIPTION = `
Respond with a SINGLE JSON object (no surrounding text, no markdown fences)
matching this TypeScript type EXACTLY:

{
  "taskUnderstanding": string,
  "subtasks": Array<{
    "id": string,
    "title": string,
    "description": string | null,
    "estimatedEffort": string | null,
    "type": "research" | "create" | "communicate" | "decide"
  }>,
  "prerequisites": string[],
  "risks": string[],
  "needsHumanInput": { "question": string } | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- "taskUnderstanding" is ONE short sentence confirming you understood the
  task. Example: "Got it — this is a venue selection task with budget and
  accessibility as the main constraints."
- "subtasks" contains 3–7 ACTIONABLE items. Each title begins with an action
  verb. Each id is stable ("st_<short_slug>"). Effort estimates are in
  natural units ("30 min", "2 hours", "1 day", "1 week").
- If the task is too vague or lacks critical information to break down
  meaningfully, DO NOT fabricate subtasks. Return:
    subtasks: [], needsHumanInput: { question: "<specific question>" }
  The question MUST ask for the single most important missing piece. If it
  has a closed set of answers, end it with "Options: A / B / C".
- "prerequisites" lists prep the user must do BEFORE starting any subtask
  (e.g. "Confirm guest count with family"). Empty array if none.
- "risks" lists pitfalls or time-critical notes. Empty array if none.
- Output ONLY the JSON object. No prose before/after. No code fences.
`

// Type-specific prompt sections (Tier 2.6)
const KIND_GUIDANCE: Record<string, string> = {
  research: `
This task is RESEARCH-oriented. Breakdown pattern:
1. Define criteria / requirements (what "good" looks like)
2. Gather candidates (where to search, how many)
3. Evaluate against criteria (comparison matrix or shortlist)
4. Narrow down (top 3 → top 1)
5. Final verification (visit, demo, interview, test)

Each subtask must be measurable and time-bounded. Avoid vague verbs like
"explore" without an endpoint. Do not mix execution steps here.
`,
  create: `
This task is CREATE-oriented. Breakdown pattern:
1. Clarify requirements (format, length, audience, purpose)
2. Research references / inspiration (if creative)
3. Outline / wireframe / skeleton
4. First draft
5. Review & iterate
6. Finalize & publish/submit

Each subtask should be execution-focused and produce an artifact.
`,
  communicate: `
This task is COMMUNICATION-oriented. Breakdown pattern:
1. Identify audience (exact recipients, how many, segments)
2. Draft core message (key points, tone, call-to-action)
3. Choose channel & timing (email / WhatsApp / in-person; when)
4. Personalize for segments if needed (VIP vs general)
5. Send + track responses
6. Follow up on non-responders (if applicable)

Always include specific recipient counts / lists and timing recommendations.
Avoid generic "notify people" without channel/audience.
`,
  decide: `
This task is DECISION-oriented. Breakdown pattern:
1. Define decision criteria (what matters, with weights if possible)
2. List options with pros/cons
3. Consult stakeholders (if any)
4. Weigh tradeoffs
5. Make & document the decision
6. Communicate decision to affected parties

Each subtask supports analysis and choice, not execution of the chosen path.
`,
  generic: `
Break the task into sequential, actionable steps. Aim for 3–7 subtasks,
each with a specific action verb and an effort estimate. Do not invent
subtasks just to fill the list.
`,
}

function buildBreakdownSystemPrompt(req: BreakdownRequest): string {
  const kind = req.taskKind ?? 'generic'
  const guidance = KIND_GUIDANCE[kind] ?? KIND_GUIDANCE.generic

  const lines: string[] = [
    'You are a "Step Planner" — a friendly planning partner for non-technical',
    'users. Your ONLY job is to take ONE task and break it into 3–7 smaller,',
    'actionable steps. You do NOT execute the task. You do NOT chat beyond the',
    'JSON response. You do NOT use jargon.',
    '',
    '── PROJECT CONTEXT ──────────────────────────────────',
  ]

  if (req.projectContext) {
    const ctx = req.projectContext
    lines.push(`Project: ${ctx.name}`)
    if (ctx.description) lines.push(`Description: ${ctx.description}`)
    if (ctx.visionDocument) {
      const truncated =
        ctx.visionDocument.length > 2000
          ? ctx.visionDocument.slice(0, 2000) + '\n…[truncated]'
          : ctx.visionDocument
      lines.push('', 'Vision document (what the user is planning):')
      lines.push('---')
      lines.push(truncated)
      lines.push('---')
    }
    if (ctx.otherTasks && ctx.otherTasks.length > 0) {
      lines.push('', 'Other tasks in this project:')
      for (const t of ctx.otherTasks.slice(0, 20)) {
        lines.push(`  [${t.status.padEnd(12)}] ${t.title}`)
      }
    }
  } else {
    lines.push('(No project context provided — break down using task info only.)')
  }

  lines.push('', '── CURRENT TASK ─────────────────────────────────────')
  lines.push(`Title: ${req.taskTitle}`)
  if (req.taskDescription) lines.push(`Description: ${req.taskDescription}`)
  if (req.taskPriority) lines.push(`Priority: ${req.taskPriority}`)

  lines.push('', '── TASK KIND ────────────────────────────────────────')
  lines.push(`Detected kind: ${kind}.`)
  lines.push(guidance.trim())

  if (req.additionalContext) {
    lines.push('', '── USER CLARIFICATION ───────────────────────────────')
    lines.push(req.additionalContext)
    lines.push('')
    lines.push(
      'This extra info should FULLY UNBLOCK you. Do NOT return',
      '"needsHumanInput" again unless something new is missing.',
    )
  }

  if (req.refineMode && req.existingSubtasks && req.existingSubtasks.length > 0) {
    lines.push('', '── REFINEMENT MODE ──────────────────────────────────')
    lines.push('The user already has these subtasks approved:')
    lines.push('')
    for (const st of req.existingSubtasks) {
      const checkbox = st.completed ? '[✓ DONE]' : '[ TODO ]'
      lines.push(`  ${checkbox} ${st.id} — ${st.title}`)
      if (st.description) lines.push(`      ${st.description}`)
    }
    if (req.userRefineRequest) {
      lines.push('', `User request: "${req.userRefineRequest}"`)
    }
    lines.push('')
    lines.push(
      'Return the FULL updated subtask list. For each subtask:',
      '- If unchanged, keep same id and content.',
      '- If modified, keep same id but update fields.',
      '- If new, assign a new "st_..." id.',
      '- If removed, OMIT from the list.',
      '',
      'Rules:',
      '- DO NOT modify or remove subtasks marked [✓ DONE] unless the user',
      '  explicitly requested it in plain language above.',
      '- DO NOT return "needsHumanInput" in refine mode — if the request is',
      '  unclear, make your best interpretation and note it in',
      '  "taskUnderstanding".',
    )
  }

  lines.push('', '── OUTPUT FORMAT ────────────────────────────────────')
  lines.push(BREAKDOWN_SCHEMA_DESCRIPTION)

  return lines.join('\n')
}

function normalizeBreakdownEnvelope(obj: unknown): {
  taskUnderstanding: string
  subtasks: Array<{
    id: string
    title: string
    description: string | null
    estimatedEffort: string | null
    type: 'research' | 'create' | 'communicate' | 'decide'
  }>
  prerequisites: string[]
  risks: string[]
  needsHumanInput: { question: string } | null
  confidence: 'high' | 'medium' | 'low'
} {
  const o = (obj ?? {}) as Record<string, unknown>

  const subtasks = Array.isArray(o.subtasks)
    ? (o.subtasks as unknown[])
        .map((raw) => {
          const s = (raw ?? {}) as Record<string, unknown>
          if (typeof s.title !== 'string' || s.title.length === 0) return null
          const type: 'research' | 'create' | 'communicate' | 'decide' =
            s.type === 'research' || s.type === 'create'
              || s.type === 'communicate' || s.type === 'decide'
              ? s.type
              : 'research'
          return {
            id: typeof s.id === 'string' ? s.id : `st_${Math.random().toString(36).slice(2, 10)}`,
            title: s.title,
            description: typeof s.description === 'string' ? s.description : null,
            estimatedEffort: typeof s.estimatedEffort === 'string' ? s.estimatedEffort : null,
            type,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : []

  const needsHuman = (() => {
    const nhi = o.needsHumanInput as Record<string, unknown> | undefined | null
    if (!nhi || typeof nhi !== 'object') return null
    const q = (nhi as Record<string, unknown>).question
    if (typeof q !== 'string' || q.length === 0) return null
    return { question: q }
  })()

  const confidence =
    o.confidence === 'high' || o.confidence === 'medium' || o.confidence === 'low'
      ? o.confidence
      : 'medium'

  return {
    taskUnderstanding:
      typeof o.taskUnderstanding === 'string' ? o.taskUnderstanding : '',
    subtasks,
    prerequisites: Array.isArray(o.prerequisites)
      ? (o.prerequisites as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    risks: Array.isArray(o.risks)
      ? (o.risks as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    needsHumanInput: needsHuman,
    confidence,
  }
}

async function handleBreakdown(req: BreakdownRequest): Promise<Response> {
  if (!req.taskTitle?.trim()) {
    return Response.json({ error: 'taskTitle is required' }, { status: 400 })
  }

  const systemPrompt = buildBreakdownSystemPrompt(req)

  // Build the user-facing instruction: mostly re-iterate the task for the
  // model (the real info lives in the system prompt).
  const userMessage = req.refineMode
    ? `Refine the subtask list for the task "${req.taskTitle}" based on the instruction above. Output the JSON envelope.`
    : `Break down the task "${req.taskTitle}" into actionable subtasks. Output the JSON envelope.`

  const session = await buildFreshSession(systemPrompt)

  let assistantText = ''
  let inputTokens = 0
  let outputTokens = 0

  const unsubscribe = session.subscribe((event: any) => {
    if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
      assistantText += event.assistantMessageEvent.delta as string
    }
    if (event.type === 'turn_end' && event.message?.usage) {
      inputTokens += event.message.usage.input ?? 0
      outputTokens += event.message.usage.output ?? 0
    }
  })

  try {
    await session.prompt(userMessage)
  } finally {
    unsubscribe()
    session.dispose()
  }

  // Parse (reuse helper from plan envelope path)
  let parsedRaw: unknown = null
  let text = assistantText.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    try {
      parsedRaw = JSON.parse(text.slice(start, end + 1))
    } catch {
      parsedRaw = null
    }
  }

  let envelope = parsedRaw
    ? normalizeBreakdownEnvelope(parsedRaw)
    : {
        taskUnderstanding: '',
        subtasks: [],
        prerequisites: [],
        risks: [],
        needsHumanInput: {
          question:
            "Something went wrong parsing the AI response. Can you describe this task in more detail so I can try again?",
        },
        confidence: 'low' as const,
      }

  // Safety: if refineMode, never bubble up needsHumanInput (prompt already
  // instructs against it but guard anyway — user explicitly asked to refine,
  // not re-clarify).
  if (req.refineMode && envelope.needsHumanInput) {
    envelope = { ...envelope, needsHumanInput: null }
  }

  return Response.json({
    envelope,
    taskId: req.taskId,
    taskKind: req.taskKind ?? 'generic',
    tokenUsage: { input: inputTokens, output: outputTokens },
  })
}

// ─── Entry ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: AgentRequest
  try {
    body = (await req.json()) as AgentRequest
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  // Breakdown and doer modes are stateless + don't need a rich messages
  // thread from the client; other modes do.
  if (body.mode !== 'breakdown'
      && body.mode !== 'doer'
      && body.mode !== 'reviewer'
      && (!Array.isArray(body.messages) || body.messages.length === 0)) {
    return Response.json({ error: 'messages[] is required' }, { status: 400 })
  }

  // Per-mode hard timeout. Beyond this we return 504 with a friendly code so
  // the client can show "AI took too long" instead of a hung spinner.
  const TIMEOUT_MS: Record<string, number> = {
    plan: 120_000,
    breakdown: 120_000,
    doer: 120_000,
    reviewer: 120_000,
    chat: 180_000,
  }
  const timeoutMs = TIMEOUT_MS[body.mode] ?? 120_000

  const dispatch = async (): Promise<Response> => {
    if (body.mode === 'plan') return await handlePlan(body)
    if (body.mode === 'chat') return await handleChat(body)
    if (body.mode === 'breakdown') return await handleBreakdown(body)
    if (body.mode === 'doer') return await handleDoer(body)
    if (body.mode === 'reviewer') return await handleReviewer(body)
    return Response.json(
      { error: `Unknown mode: ${(body as { mode: string }).mode}` },
      { status: 400 },
    )
  }

  try {
    return await Promise.race<Response>([
      dispatch(),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('E_TIMEOUT')), timeoutMs),
      ),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent error'
    if (message === 'E_TIMEOUT') {
      return Response.json({ error: 'E_TIMEOUT' }, { status: 504 })
    }
    return Response.json({ error: message }, { status: 500 })
  }
}

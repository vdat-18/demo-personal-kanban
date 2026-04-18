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
  mode: 'plan' | 'chat'
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
}

interface ChatRequest extends BaseRequest {
  mode: 'chat'
  taskTitle?: string
  taskDescription?: string | null
  systemPromptOverride?: string
}

type AgentRequest = PlanRequest | ChatRequest

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
    '- discovery: gather just enough context. Ask questions in BATCHES (3-7 at a',
    '  time), never one at a time. Use chip suggestions whenever the answer is',
    '  closed-domain (timeline, budget tier, audience type, yes/no). Use free',
    '  text only when the answer is open-ended. Adapt question phrasing and',
    '  examples to the nature of the user\'s project (event, business, learning,',
    '  personal life, ...). Do NOT ask the user to declare a domain.',
    '- blueprint: produce or revise the vision document in markdown. The',
    '  document lives in the visionDocument field. Keep "content" short — the',
    '  user reads the document, not the chat bubble.',
    '- task_mapping: propose concrete tasks via the "tasks" array. Return them',
    '  in the structured field, NEVER as inline markdown bullets. Group with',
    '  the milestone field when natural. Tasks should be small enough to act on.',
    '',
    '── Phase transitions ─────────────────────────────────────────',
    '- When you believe the current phase is "done enough", set',
    '  readyForNextPhase=true, suggestedPhase=<next>, reasonForTransition=<short',
    '  human reason>. NEVER change phase silently.',
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

async function handlePlan(req: PlanRequest): Promise<Response> {
  const systemPrompt = buildPlanSystemPrompt(req)
  const cacheKey = req.threadId ?? null
  const { session, promptToFeed, shouldDispose } = await getOrCreateSession(
    cacheKey,
    systemPrompt,
    req.messages,
  )

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
    await session.prompt(promptToFeed)
  } finally {
    unsubscribe()
    if (shouldDispose) session.dispose()
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
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages[] is required' }, { status: 400 })
  }

  try {
    if (body.mode === 'plan') return await handlePlan(body)
    if (body.mode === 'chat') return await handleChat(body)
    return Response.json(
      { error: `Unknown mode: ${(body as { mode: string }).mode}` },
      { status: 400 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent error'
    return Response.json({ error: message }, { status: 500 })
  }
}

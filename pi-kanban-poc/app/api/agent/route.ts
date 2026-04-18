/**
 * Unified agent endpoint backed by @mariozechner/pi-coding-agent SDK.
 *
 * Modes:
 *   - mode: "plan"   → non-streaming JSON response (used by planning thread)
 *   - mode: "chat"   → SSE stream of token deltas + final complete event
 *
 * Auth: relies on env vars (ANTHROPIC_API_KEY / OPENAI_API_KEY / etc.)
 *       resolved by AuthStorage. No client-side keys.
 */

import { NextRequest } from 'next/server'
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createAgentSession,
} from '@mariozechner/pi-coding-agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Provider configuration ──────────────────────────────────────────────────
// Trollllm is an OpenAI-compatible gateway. We register it at module load so
// every request reuses the same registry/auth instances.

const TROLLLLM_BASE_URL =
  process.env.TROLLLLM_BASE_URL ?? 'https://chat.trollllm.xyz/v1'
const TROLLLLM_API_KEY =
  process.env.TROLLLLM_API_KEY ?? process.env.LLM_API_KEY ?? ''
const TROLLLLM_MODEL_ID = process.env.TROLLLLM_MODEL ?? 'claude-sonnet-4.6'

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
        input: ['text'],
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

// ─── Request shape ────────────────────────────────────────────────────────────

interface BaseRequest {
  mode: 'plan' | 'chat'
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}

interface PlanRequest extends BaseRequest {
  mode: 'plan'
  phase?: 'discovery' | 'blueprint' | 'task_mapping'
  visionDocument?: string | null
  projectName?: string
  projectDescription?: string | null
  domain?: string
}

interface ChatRequest extends BaseRequest {
  mode: 'chat'
  taskTitle?: string
  taskDescription?: string | null
  systemPromptOverride?: string
}

type AgentRequest = PlanRequest | ChatRequest

// ─── Prompt assembly ──────────────────────────────────────────────────────────

function buildPlanSystemPrompt(req: PlanRequest): string {
  const phase = req.phase ?? 'discovery'
  const lines: string[] = [
    'You are a product/project planning architect. Help the user clarify a project vision.',
    '',
    `Current phase: ${phase}.`,
    '',
    'Phase semantics:',
    '- discovery: ask focused clarifying questions about goals, users, constraints.',
    '- blueprint: synthesize the discussion into a concise vision document.',
    '- task_mapping: propose a list of concrete tasks ready to be created.',
    '',
    'Output rules:',
    '- Keep responses short and structured (markdown allowed).',
    '- When the discovery has produced enough information, transition to blueprint by ending your',
    '  message with the line: <<PHASE: blueprint>>',
    '- When the blueprint is ready, transition to task_mapping with: <<PHASE: task_mapping>>',
    '- When you produce/update the vision, wrap it with <<<VISION>>> ... <<<END VISION>>>',
  ]
  if (req.projectName) {
    lines.push('', `Project: ${req.projectName}`)
    if (req.projectDescription) lines.push(`Description: ${req.projectDescription}`)
    if (req.domain) lines.push(`Domain: ${req.domain}`)
  }
  if (req.visionDocument) {
    lines.push('', 'Existing vision document:', req.visionDocument)
  }
  return lines.join('\n')
}

function buildChatSystemPrompt(req: ChatRequest): string {
  if (req.systemPromptOverride) return req.systemPromptOverride
  const lines: string[] = [
    'You are a coding assistant collaborating on a single kanban task.',
    'Be concise, propose concrete next steps, and ask clarifying questions when ambiguous.',
  ]
  if (req.taskTitle) lines.push('', `Task: ${req.taskTitle}`)
  if (req.taskDescription) lines.push(`Details: ${req.taskDescription}`)
  return lines.join('\n')
}

// ─── Phase / vision extraction ────────────────────────────────────────────────

function extractPhase(text: string): 'discovery' | 'blueprint' | 'task_mapping' | undefined {
  const m = text.match(/<<PHASE:\s*(discovery|blueprint|task_mapping)\s*>>/i)
  return m ? (m[1].toLowerCase() as 'discovery' | 'blueprint' | 'task_mapping') : undefined
}

function extractVision(text: string): string | undefined {
  const m = text.match(/<<<VISION>>>([\s\S]*?)<<<END VISION>>>/)
  return m ? m[1].trim() : undefined
}

// ─── Session helper ───────────────────────────────────────────────────────────

async function buildSession(systemPrompt: string) {
  const settingsManager = SettingsManager.inMemory({
    compaction: { enabled: false },
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
    // No tools: this POC does not give the agent filesystem/bash access.
    tools: [],
  })

  return session
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handlePlan(req: PlanRequest): Promise<Response> {
  const systemPrompt = buildPlanSystemPrompt(req)
  const session = await buildSession(systemPrompt)

  // Concatenate prior chat into a single prompt. We could replay turns, but
  // a single "transcript" prompt is simpler and works fine for a POC.
  const transcript = req.messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join('\n\n')

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

  return Response.json({
    content: assistantText.trim(),
    tokenUsage: { input: inputTokens, output: outputTokens },
    phase: extractPhase(assistantText),
    visionDocument: extractVision(assistantText) ?? null,
  })
}

async function handleChat(req: ChatRequest): Promise<Response> {
  const systemPrompt = buildChatSystemPrompt(req)
  const session = await buildSession(systemPrompt)

  const transcript = req.messages
    .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
    .join('\n\n')

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

// ─── Entry ────────────────────────────────────────────────────────────────────

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
    return Response.json({ error: `Unknown mode: ${(body as any).mode}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent error'
    return Response.json({ error: message }, { status: 500 })
  }
}

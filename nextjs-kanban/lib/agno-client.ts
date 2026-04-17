/**
 * Client for communicating with the Agno microservice.
 */

const AGNO_SERVICE_URL =
  process.env.AGNO_SERVICE_URL || 'http://localhost:8000'

// ── Backend toggle ──────────────────────────────────────────────────────────

export type AgentBackend = 'agno' | 'multi-agent'

export function getAgentBackend(): AgentBackend {
  return (process.env.AGENT_BACKEND as AgentBackend) || 'agno'
}

export function isAgnoBackend(): boolean {
  return getAgentBackend() === 'agno'
}

// ── Error class ─────────────────────────────────────────────────────────────

export type AgnoErrorCode = 'CONNECTION_FAILED' | 'TIMEOUT' | 'INVALID_RESPONSE'

export class AgnoServiceError extends Error {
  code: AgnoErrorCode

  constructor(code: AgnoErrorCode, message: string) {
    super(message)
    this.name = 'AgnoServiceError'
    this.code = code
  }
}

// ── Request / Response types ────────────────────────────────────────────────

export interface SmartRunRequest {
  message: string
  stream?: boolean
  files?: Array<{ name: string; path: string }>
  project_id?: string
  domain?: string
}

export interface SmartRunResponse {
  result: string
  agents_used: string[]
  tools_used: string[]
  routing_reason: string
}

// ── Functions ───────────────────────────────────────────────────────────────

/**
 * Send a request to the Agno service and get a JSON response.
 */
export async function smartRun(
  request: SmartRunRequest
): Promise<SmartRunResponse> {
  try {
    const res = await fetch(`${AGNO_SERVICE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: false }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      throw new AgnoServiceError(
        'INVALID_RESPONSE',
        `Agno service returned ${res.status}: ${await res.text()}`
      )
    }

    return (await res.json()) as SmartRunResponse
  } catch (err) {
    if (err instanceof AgnoServiceError) throw err
    if (err instanceof TypeError || (err as any)?.cause?.code === 'ECONNREFUSED') {
      throw new AgnoServiceError(
        'CONNECTION_FAILED',
        'Could not connect to Agno service'
      )
    }
    if ((err as any)?.name === 'TimeoutError') {
      throw new AgnoServiceError('TIMEOUT', 'Agno service request timed out')
    }
    throw new AgnoServiceError(
      'CONNECTION_FAILED',
      `Agno service error: ${(err as Error).message}`
    )
  }
}

/**
 * Send a request to the Agno service and get an SSE stream back.
 * Returns the raw Response so the caller can pipe the stream.
 */
export async function smartRunStream(
  request: SmartRunRequest
): Promise<Response> {
  try {
    const res = await fetch(`${AGNO_SERVICE_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal: AbortSignal.timeout(120_000),
    })

    if (!res.ok) {
      throw new AgnoServiceError(
        'INVALID_RESPONSE',
        `Agno service returned ${res.status}: ${await res.text()}`
      )
    }

    return res
  } catch (err) {
    if (err instanceof AgnoServiceError) throw err
    if (err instanceof TypeError || (err as any)?.cause?.code === 'ECONNREFUSED') {
      throw new AgnoServiceError(
        'CONNECTION_FAILED',
        'Could not connect to Agno service'
      )
    }
    if ((err as any)?.name === 'TimeoutError') {
      throw new AgnoServiceError('TIMEOUT', 'Agno service request timed out')
    }
    throw new AgnoServiceError(
      'CONNECTION_FAILED',
      `Agno service error: ${(err as Error).message}`
    )
  }
}

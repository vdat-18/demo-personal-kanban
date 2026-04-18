import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { runAgent } from '@/lib/agents/orchestrator'
import { runAgentSchema } from '@/lib/validations/schemas'
import { isAgnoBackend, smartRun, AgnoServiceError } from '@/lib/agno-client'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = runAgentSchema.parse(body)

  // ── Agno backend (default) ────────────────────────────────────────────────
  if (isAgnoBackend()) {
    try {
      const result = await smartRun({ message: data.prompt })
      return NextResponse.json({
        output: result.result,
        tokenUsage: null,
        agentsUsed: result.agents_used,
        toolsUsed: result.tools_used,
      })
    } catch (err) {
      if (err instanceof AgnoServiceError) {
        console.warn(`[run] Agno unavailable (${err.code}), falling back to multi-agent`)
        const result = await runAgent(data.role, data.prompt)
        return NextResponse.json(result)
      }
      throw err
    }
  }

  // ── Multi-agent backend ───────────────────────────────────────────────────
  const result = await runAgent(data.role, data.prompt)
  return NextResponse.json(result)
})

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { runTeam } from '@/lib/agents/orchestrator'
import { teamAgentSchema } from '@/lib/validations/schemas'
import { isAgnoBackend, smartRun, AgnoServiceError } from '@/lib/agno-client'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = teamAgentSchema.parse(body)

  // ── Agno backend (default) ────────────────────────────────────────────────
  if (isAgnoBackend()) {
    try {
      const result = await smartRun({ message: data.goal })
      return NextResponse.json({
        result: result.result,
        teamOutput: {
          agentsUsed: result.agents_used,
          toolsUsed: result.tools_used,
          routingReason: result.routing_reason,
        },
      })
    } catch (err) {
      if (err instanceof AgnoServiceError) {
        console.warn(`[team] Agno unavailable (${err.code}), falling back to multi-agent`)
        const result = await runTeam(data.goal, data.agents)
        return NextResponse.json(result)
      }
      throw err
    }
  }

  // ── Multi-agent backend ───────────────────────────────────────────────────
  const result = await runTeam(data.goal, data.agents)
  return NextResponse.json(result)
})

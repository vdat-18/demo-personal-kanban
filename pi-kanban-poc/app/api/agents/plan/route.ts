import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { AgentService } from '@/lib/services/agent.service'
import { planRequestSchema } from '@/lib/validations/schemas'
import { isAgnoBackend, smartRun, AgnoServiceError } from '@/lib/agno-client'
import { buildPlanPrompt } from '@/lib/agents/prompts'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { projectId, userMessage } = planRequestSchema.parse(body)

  // ── Agno backend (default) ────────────────────────────────────────────────
  if (isAgnoBackend()) {
    try {
      const prompt = await buildPlanPrompt(userMessage, projectId)
      const result = await smartRun({
        message: prompt,
        project_id: projectId,
      })
      return NextResponse.json({
        result: result.result,
        agentsUsed: result.agents_used,
        toolsUsed: result.tools_used,
      })
    } catch (err) {
      if (err instanceof AgnoServiceError) {
        console.warn(`[plan] Agno unavailable (${err.code}), falling back to multi-agent`)
        const { result, tokenUsage } = await AgentService.runPlan(projectId, userMessage)
        return NextResponse.json({ result, ...(tokenUsage ? { tokenUsage } : {}) })
      }
      throw err
    }
  }

  // ── Multi-agent backend ───────────────────────────────────────────────────
  const { result, tokenUsage } = await AgentService.runPlan(projectId, userMessage)
  return NextResponse.json({ result, ...(tokenUsage ? { tokenUsage } : {}) })
})

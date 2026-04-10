import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { AgentService } from '@/lib/services/agent.service'
import { planRequestSchema } from '@/lib/validations/schemas'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { projectId, userMessage } = planRequestSchema.parse(body)
  const { result, tokenUsage } = await AgentService.runPlan(projectId, userMessage)
  return NextResponse.json({ result, ...(tokenUsage ? { tokenUsage } : {}) })
})

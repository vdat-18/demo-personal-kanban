import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { runTeam } from '@/lib/agents/orchestrator'
import { teamAgentSchema } from '@/lib/validations/schemas'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = teamAgentSchema.parse(body)
  const result = await runTeam(data.goal, data.agents)
  return NextResponse.json(result)
})

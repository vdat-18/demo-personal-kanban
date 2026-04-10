import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/api/error-handler'
import { runAgent } from '@/lib/agents/orchestrator'
import { runAgentSchema } from '@/lib/validations/schemas'

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = runAgentSchema.parse(body)
  const result = await runAgent(data.role, data.prompt)
  return NextResponse.json(result)
})

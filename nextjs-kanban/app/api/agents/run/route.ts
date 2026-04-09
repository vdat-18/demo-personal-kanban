import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agents/orchestrator'
import type { AgentRole } from '@/lib/agents/configs'
import { z } from 'zod'
import { runAgentSchema } from '@/lib/validations/schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = runAgentSchema.parse(body)

    const result = await runAgent(
      validatedData.role,
      validatedData.prompt
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error running agent:', error)
    return NextResponse.json(
      { error: 'Failed to run agent' },
      { status: 500 }
    )
  }
}

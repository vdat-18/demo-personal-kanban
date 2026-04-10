import { NextRequest, NextResponse } from 'next/server'
import { runTeam } from '@/lib/agents/orchestrator'
import type { AgentRole } from '@/lib/agents/configs'
import { z } from 'zod'

const agentRoleEnum = z.enum(['architect', 'developer', 'reviewer'])

const runTeamSchema = z.object({
  goal: z.string().min(1, 'Goal is required'),
  agents: z.array(agentRoleEnum).min(1, 'At least one agent is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = runTeamSchema.parse(body)

    const result = await runTeam(
      validatedData.goal,
      validatedData.agents
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error running team:', error)
    return NextResponse.json(
      { error: 'Failed to run team' },
      { status: 500 }
    )
  }
}

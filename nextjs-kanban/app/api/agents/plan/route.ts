import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agents/orchestrator'
import { buildPlanPrompt } from '@/lib/agents/prompts'
import { z } from 'zod'
import { uuidSchema } from '@/lib/validations/schemas'

const planSchema = z.object({
  projectId: uuidSchema,
  userMessage: z.string().min(1).max(10000),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, userMessage } = planSchema.parse(body)

    // Assemble the full prompt on the BE — FE only sends raw user input + projectId
    const prompt = await buildPlanPrompt(userMessage, projectId)

    const agentResult = await runAgent('architect', prompt)

    const result = (agentResult as any)?.output ?? agentResult
    const tokenUsage = (agentResult as any)?.tokenUsage ?? null

    return NextResponse.json({ result, ...(tokenUsage ? { tokenUsage } : {}) })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error running plan agent:', error)
    return NextResponse.json(
      { error: 'Failed to run plan agent' },
      { status: 500 }
    )
  }
}

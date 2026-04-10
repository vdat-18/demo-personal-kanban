import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/agents/orchestrator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType } = body

    if (testType === 'simple') {
      const result = await runAgent('developer', 'What is 2 + 2? Please respond with just the number.')
      return NextResponse.json({ success: true, test: 'simple_execution', result })
    }

    if (testType === 'token_tracking') {
      const result = await runAgent('developer', 'Count from 1 to 5.')
      return NextResponse.json({ success: true, test: 'token_tracking', result })
    }

    if (testType === 'multi_provider') {
      const claudeResult = await runAgent('developer', 'Say "Claude works"')
      return NextResponse.json({ success: true, test: 'multi_provider', claudeResult })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid test type. Use: simple, token_tracking, or multi_provider' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Agent test error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

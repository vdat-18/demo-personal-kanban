import { NextRequest, NextResponse } from 'next/server'

import {
  smartRun,
  smartRunStream,
  AgnoServiceError,
  type SmartRunRequest,
} from '@/lib/agno-client'
import { AgentService } from '@/lib/services/agent.service'

/**
 * POST /api/agents/smart-run
 *
 * Proxies requests to the Agno microservice for dynamic agent routing.
 * Falls back to the existing TypeScript agent system if Agno is unreachable.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SmartRunRequest

    if (!body.message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    // Streaming mode
    if (body.stream) {
      try {
        const agnoResponse = await smartRunStream(body)

        return new Response(agnoResponse.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        })
      } catch (err) {
        if (err instanceof AgnoServiceError) {
          // Fallback to existing TS agent system
          const stream = AgentService.createStream(
            'architect',
            body.message,
            'smart-run-fallback'
          )

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Agent-Fallback': 'true',
            },
          })
        }
        throw err
      }
    }

    // Non-streaming mode
    try {
      const result = await smartRun(body)
      return NextResponse.json(result)
    } catch (err) {
      if (err instanceof AgnoServiceError) {
        // Fallback to existing TS agent system
        const stream = AgentService.createStream(
          'architect',
          body.message,
          'smart-run-fallback'
        )

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Agent-Fallback': 'true',
          },
        })
      }
      throw err
    }
  } catch (error) {
    console.error('[smart-run] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

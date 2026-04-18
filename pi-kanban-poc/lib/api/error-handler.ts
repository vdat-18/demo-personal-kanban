/**
 * Shared error handler wrapper for all API routes.
 * Catches known error types and returns consistent JSON responses.
 *
 * Usage:
 *   export const GET = withErrorHandler(async (req) => { ... })
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { NotFoundError } from './errors'
import { InvalidTransitionError } from '@/lib/status-lifecycle'

type RouteContext = { params: Promise<Record<string, string>> }

type RouteHandler<T extends RouteContext = RouteContext> = (
  request: NextRequest,
  context: T,
) => Promise<Response | NextResponse>

export function withErrorHandler<T extends RouteContext>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (request: NextRequest, context: T) => {
    try {
      return await handler(request, context)
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: err.flatten() },
          { status: 400 },
        )
      }

      if (err instanceof NotFoundError) {
        return NextResponse.json(
          { error: err.message },
          { status: 404 },
        )
      }

      if (err instanceof InvalidTransitionError) {
        return NextResponse.json(
          {
            error: err.message,
            from: err.from,
            to: err.to,
            allowed: err.allowed,
          },
          { status: 422 },
        )
      }

      console.error('Unhandled API error:', err)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      )
    }
  }
}

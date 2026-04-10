## Context

The Next.js Kanban app backend comprises ~2,300 LOC across 19 API route files, 6 database abstraction files, 4 agent system files, a validation schema file, and utilities. The tech stack is Next.js 16 App Router, Prisma ORM, Zod validation, and OpenAI-based agents. Business logic is currently mixed into route handlers, 7 routes redefine schemas already centralized in `lib/validations/schemas.ts`, and error handling varies per-route. The frontend was just refactored into Atomic Design; this change applies similar architectural discipline to the backend.

## Goals / Non-Goals

**Goals:**
- Introduce a service layer (`lib/services/`) that encapsulates all business logic between routes and the DB layer.
- Eliminate every inline Zod schema redefinition in route files; single source of truth is `lib/validations/schemas.ts`.
- Standardize error handling across all 19 routes with a shared wrapper.
- Replace all `any` type assertions in `lib/db/`, `lib/agents/tools/`, and routes with proper typed interfaces.
- Move 3 routes' direct Prisma calls into the DB abstraction layer.
- Centralize agent model configuration.

**Non-Goals:**
- Changing any API endpoint URL or request/response contract.
- Refactoring the frontend, hooks (`lib/hooks/`), or stores.
- Adding authentication, authorization, or rate limiting.
- Changing the Prisma schema or running migrations.
- Introducing new npm dependencies.
- Adding tests (they can follow in a separate change).

## Decisions

### 1. Service layer sits between routes and DB — routes become thin dispatchers

```
Route Handler  →  Service Layer  →  DB Layer  →  Prisma
   (parse)        (business logic)   (queries)
```

Each service class is a plain object of exported functions (not a class constructor), matching the existing pattern of the DB layer. Services own: input validation via imported schemas, business logic (e.g., status transitions, token aggregation, auto-titling), and orchestration of multiple DB calls.

**Rationale**: Routes currently contain 30-80% business logic. Extracting to services makes logic testable without HTTP plumbing and allows reuse (e.g., `TokenUsageService.aggregate()` used by both `conversations/token-usage` and `analytics/token-usage` routes).

**Alternative considered**: Controller classes — rejected because the codebase uses functional patterns, not OOP.

### 2. Five service modules aligned with domain entities

| Service | Responsibility |
|---------|---------------|
| `lib/services/task.service.ts` | Task CRUD + status transition validation + batch operations |
| `lib/services/project.service.ts` | Project CRUD + domain validation |
| `lib/services/conversation.service.ts` | Conversation CRUD + token usage aggregation |
| `lib/services/planning.service.ts` | Thread management + message creation + auto-titling logic |
| `lib/services/agent.service.ts` | Agent orchestration + streaming + task generation parsing |

**Rationale**: 1:1 with existing DB modules keeps the mental model simple. `agent.service.ts` consolidates the scattered agent-calling logic currently in `agents/stream/route.ts`, `agents/generate-tasks/route.ts`, and `agents/plan/route.ts`.

### 3. Shared `withErrorHandler` wrapper for all routes

```typescript
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try { return await handler(req, ctx) }
    catch (err) {
      if (err instanceof ZodError) return NextResponse.json({ error: 'Validation error', details: err.flatten() }, { status: 400 })
      if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
      if (err instanceof InvalidTransitionError) return NextResponse.json({ error: err.message, from: err.from, to: err.to, allowed: err.allowed }, { status: 422 })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
```

**Rationale**: Currently, every route has its own try/catch with slightly different error shapes. The wrapper gives a consistent `{ error: string, details?: object }` contract. Known error types (`ZodError`, `NotFoundError`, `InvalidTransitionError`) are already defined or easily added.

**Alternative considered**: Next.js middleware — rejected because middleware runs before route handlers and can't catch thrown errors from within them.

### 4. Schema consolidation strategy — import and re-export, don't move

All inline schemas are deleted from route files. If a route needs a schema that isn't yet in `lib/validations/schemas.ts`, it is added there. Routes import via:
```typescript
import { createTaskSchema, updateTaskSchema } from '@/lib/validations/schemas'
```

**Rationale**: `lib/validations/schemas.ts` already has 25+ schemas and is the established pattern. Keeping a single file (rather than per-domain schema files) matches the existing convention and keeps the change minimal.

### 5. Type safety strategy — Zod inference replaces `any`

Every `any` cast in the DB layer is replaced with either:
- `z.infer<typeof someSchema>` for validated inputs, or
- Prisma-generated types for DB return values.

The `Message` interface in `lib/db/conversations.ts` gets proper typing for `toolCalls`. The `tokenUsage` JSON field gets a typed interface instead of `any`.

### 6. Agent model configuration centralized via env var

A single `AGENT_MODEL` env var (default: `gpt-4o-mini`) replaces the 3 hardcoded model strings in `lib/agents/configs.ts`. The `envSchema` in `lib/validations/schemas.ts` is extended to validate it.

### 7. Implementation order — bottom-up, entity-by-entity

1. Foundation: Error handler + type definitions
2. Schema consolidation (eliminate all inline schemas)
3. DB layer type fixes
4. Service layer (one entity at a time)
5. Route thinning (replace inline logic with service calls)
6. Agent system cleanup
7. Verification

**Rationale**: Bottom-up ensures each layer is solid before the layer above depends on it. Entity-by-entity (tasks first, then projects, etc.) allows incremental verification.

## Risks / Trade-offs

- **Large diff across many files** → Mitigated by working entity-by-entity with verification after each.
- **Subtle behavior changes** → Mitigated by preserving exact error messages and response shapes; the `withErrorHandler` introduces consistency but doesn't change existing valid responses.
- **Service layer adds indirection** → Accepted trade-off: routes gain clarity, logic becomes testable, and duplicate code is eliminated.
- **Single `schemas.ts` file gets larger** → At ~200 lines with additions, still manageable. Can split later if it grows past 400.

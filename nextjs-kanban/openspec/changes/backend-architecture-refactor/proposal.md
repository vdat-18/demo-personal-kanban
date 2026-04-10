## Why

The backend of the Next.js Kanban app (~2,300 LOC across 21 files) has accumulated significant structural debt. Seven of 19 API routes redefine Zod schemas that already exist in `lib/validations/schemas.ts`, there are 20+ `any` type assertions across the DB and agent layers, 3 routes bypass the database abstraction layer with direct Prisma calls, and error handling is inconsistent across every route. Business logic (validation, aggregation, auto-titling) is inlined in route handlers rather than isolated in a service layer. The recent frontend Atomic Design refactor exposed this asymmetry — a clean component hierarchy now sits atop a tangled backend. Refactoring now prevents the debt from compounding as new features land.

## What Changes

- **Eliminate schema duplication**: Remove all 12+ inline Zod schema redefinitions across 7 route files; import exclusively from `lib/validations/schemas.ts`.
- **Introduce a service layer** (`lib/services/`): Extract business logic from API routes into `TaskService`, `ProjectService`, `ConversationService`, `PlanningService`, and `TokenUsageService`.
- **Standardize error handling**: Create a shared `withErrorHandler` route wrapper for consistent JSON error responses, Zod parse-error formatting, and status codes.
- **Fix type safety**: Replace all `any` casts in `lib/db/`, `lib/agents/tools/`, and route files with proper typed interfaces and Zod inference.
- **Consolidate direct Prisma access**: Move inline Prisma queries from `conversations/token-usage/route.ts`, `analytics/token-usage/route.ts`, and `planning-threads/[id]/messages/[messageId]/mutations/route.ts` into the DB abstraction layer.
- **Centralize agent configuration**: Extract hardcoded model names (`gpt-4o-mini`) and tool arrays from `lib/agents/configs.ts` into a configuration constant; make model configurable via env var.
- **Remove test endpoint from production**: Delete or gate `app/api/test/agents/route.ts`.

## Capabilities

### New Capabilities
- `service-layer`: Business logic service classes (`TaskService`, `ProjectService`, `ConversationService`, `PlanningService`, `TokenUsageService`) that sit between API routes and the DB layer.
- `route-error-handling`: Standardized error handler wrapper for all API routes with consistent error response shape, Zod error formatting, and HTTP status mapping.
- `schema-consolidation`: Single-source-of-truth Zod schema imports across all routes, eliminating inline duplications.

### Modified Capabilities
_(none — no existing spec-level behavior changes; this is a pure structural refactor)_

## Impact

- **API routes** (19 files): All route files will be modified to use the service layer and error handler; most will shrink significantly.
- **Database layer** (`lib/db/`): Minor additions for queries currently inlined in routes (token aggregation, mutation persistence); type improvements.
- **Agent system** (`lib/agents/`): `configs.ts` updated for centralized model config; `tools/index.ts` type assertions replaced.
- **Validation layer** (`lib/validations/schemas.ts`): Minor additions for schemas not yet centralized.
- **No breaking API changes**: All endpoints retain the same request/response contracts.
- **No new dependencies**: Uses existing Zod, Prisma, Next.js patterns.

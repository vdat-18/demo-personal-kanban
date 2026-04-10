## ADDED Requirements

### Requirement: Service layer exists between routes and DB
All business logic SHALL be implemented in service modules under `lib/services/`. API route handlers SHALL NOT contain business logic beyond request parsing, service delegation, and response formatting.

#### Scenario: Task status transition via service
- **WHEN** a route handler receives a task status update request
- **THEN** it SHALL delegate to `TaskService.updateStatus()` which performs transition validation and DB update
- **AND** the route handler SHALL NOT call `validateTransition()` or `updateTask()` directly

#### Scenario: Token usage aggregation via service
- **WHEN** either `/api/conversations/token-usage` or `/api/analytics/token-usage` is called
- **THEN** both SHALL delegate to `ConversationService.aggregateTokenUsage()` eliminating duplicate aggregation logic

#### Scenario: Planning auto-title via service
- **WHEN** a new planning message is created
- **THEN** the auto-titling logic SHALL live in `PlanningService.sendMessage()`, not in the route handler

### Requirement: Five service modules with explicit interfaces
The following service modules SHALL exist, each exporting typed functions:
- `lib/services/task.service.ts`
- `lib/services/project.service.ts`
- `lib/services/conversation.service.ts`
- `lib/services/planning.service.ts`
- `lib/services/agent.service.ts`

#### Scenario: Service function signatures are typed
- **WHEN** a developer inspects any service function
- **THEN** all parameters and return types SHALL be explicitly typed (no `any`)
- **AND** input types SHALL use Zod inference (`z.infer<typeof schema>`) where applicable

### Requirement: No direct Prisma access in routes
No API route file SHALL import from `@prisma/client` or `lib/db/client`. All database access SHALL go through either `lib/db/*` functions or `lib/services/*` functions.

#### Scenario: Token usage route uses DB abstraction
- **WHEN** a developer inspects `app/api/conversations/token-usage/route.ts`
- **THEN** there SHALL be no import of `prisma` or direct `prisma.*` calls

#### Scenario: Mutation persistence route uses DB abstraction
- **WHEN** a developer inspects `app/api/planning-threads/[id]/messages/[messageId]/mutations/route.ts`
- **THEN** there SHALL be no import of `prisma` or direct `prisma.*` calls

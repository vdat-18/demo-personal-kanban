## 1. Foundation — Error Handler & Type Definitions

- [x] 1.1 Create `lib/api/errors.ts` with `NotFoundError` class (extends `Error`, includes `entity` and `id` fields, produces message `"<Entity> not found: <id>"`)
- [x] 1.2 Create `lib/api/error-handler.ts` with `withErrorHandler()` wrapper that catches `ZodError` (400), `NotFoundError` (404), `InvalidTransitionError` (422), and unknown errors (500); all responses use `{ error: string, details?: object }` shape
- [x] 1.3 Create `lib/types/json-fields.ts` with typed interfaces for Prisma JSON columns: `TokenUsage` (`{ input: number; output: number }`), `ConversationMessage` (`{ role: string; content: string; toolCalls?: ToolCall[] }`), `MutationAction` (`{ mutationIndex: number; action: string }`)
- [x] 1.4 Add `AGENT_MODEL` to `envSchema` in `lib/validations/schemas.ts` with default `'gpt-4o-mini'`; export a `getAgentModel()` helper that reads `process.env.AGENT_MODEL`

## 2. Schema Consolidation — Eliminate Inline Schemas

- [x] 2.1 Add any missing schemas to `lib/validations/schemas.ts`: `chatStreamSchema` (from `agents/stream/route.ts`), `mutationActionSchema` (from mutations route), any other inline schemas not yet centralized
- [x] 2.2 Refactor `app/api/tasks/route.ts`: delete inline `taskStatusEnum`, `taskPriorityEnum`, `createTaskSchema`; import from `lib/validations/schemas`
- [x] 2.3 Refactor `app/api/tasks/[id]/route.ts`: delete inline schemas; import `updateTaskSchema` from `lib/validations/schemas`
- [x] 2.4 Refactor `app/api/projects/[id]/route.ts`: delete inline `updateProjectSchema`; import from `lib/validations/schemas`
- [x] 2.5 Refactor `app/api/conversations/route.ts`: delete inline `messageSchema`, `createConversationSchema`; import from `lib/validations/schemas`
- [x] 2.6 Refactor `app/api/agents/stream/route.ts`: delete inline `messageSchema`, `chatStreamSchema`; import from `lib/validations/schemas`
- [x] 2.7 Refactor `app/api/agents/plan/route.ts`: delete inline `planSchema`; import from `lib/validations/schemas`
- [x] 2.8 Refactor `app/api/agents/tasks/route.ts`: delete inline `agentRoleEnum`; import from `lib/validations/schemas`
- [x] 2.9 Refactor `app/api/agents/team/route.ts`: delete inline `runTeamSchema`; import from `lib/validations/schemas`
- [x] 2.10 Refactor `app/api/planning-threads/[id]/messages/[messageId]/mutations/route.ts`: delete inline `mutationActionSchema`; import from `lib/validations/schemas`

## 3. DB Layer Type Fixes

- [x] 3.1 Replace all `as any` casts in `lib/db/conversations.ts` with typed interfaces from `lib/types/json-fields.ts`; type `messages` field as `ConversationMessage[]`, `tokenUsage` as `TokenUsage | null`
- [x] 3.2 Replace `as any` cast in `lib/db/planning-messages.ts` for `tokenUsage`; use `TokenUsage` interface
- [x] 3.3 Replace `as any` cast in `lib/db/client.ts`; use `typeof globalThis & { prisma?: PrismaClient }` for the global singleton pattern
- [x] 3.4 Add `getTokenUsageByTask()` and `getTokenUsageByProject()` functions to `lib/db/conversations.ts` — move aggregation logic from `conversations/token-usage/route.ts` and `analytics/token-usage/route.ts`
- [x] 3.5 Add `persistMutationAction()` function to `lib/db/planning-messages.ts` — move the direct Prisma update from `mutations/route.ts`

## 4. Service Layer — Task & Project Services

- [x] 4.1 Create `lib/services/task.service.ts` with: `list(query)`, `get(id)`, `create(data)`, `updateStatus(id, status)` (includes transition validation), `update(id, data)`, `delete(id)`, `createBatch(tasks)`
- [x] 4.2 Create `lib/services/project.service.ts` with: `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`
- [x] 4.3 Refactor `app/api/tasks/route.ts` GET and POST to delegate to `TaskService`; wrap with `withErrorHandler`
- [x] 4.4 Refactor `app/api/tasks/[id]/route.ts` GET, PUT, DELETE to delegate to `TaskService`; remove double-fetch pattern; wrap with `withErrorHandler`
- [x] 4.5 Refactor `app/api/projects/route.ts` to delegate to `ProjectService`; wrap with `withErrorHandler`
- [x] 4.6 Refactor `app/api/projects/[id]/route.ts` to delegate to `ProjectService`; wrap with `withErrorHandler`

## 5. Service Layer — Conversation & Planning Services

- [x] 5.1 Create `lib/services/conversation.service.ts` with: `list(query)`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `aggregateTokenUsage(filters)` (consolidates the duplicate aggregation logic)
- [x] 5.2 Create `lib/services/planning.service.ts` with: `listThreads(projectId)`, `getThread(id)`, `createThread(data)`, `deleteThread(id)`, `listMessages(threadId)`, `sendMessage(threadId, content)` (includes auto-titling and agent orchestration), `persistMutationAction(threadId, messageId, mutationIndex, action)`
- [x] 5.3 Refactor `app/api/conversations/route.ts` to delegate to `ConversationService`; wrap with `withErrorHandler`
- [x] 5.4 Refactor `app/api/conversations/[id]/route.ts` to delegate to `ConversationService`; wrap with `withErrorHandler`
- [x] 5.5 Refactor `app/api/conversations/token-usage/route.ts` to call `ConversationService.aggregateTokenUsage()`; remove direct Prisma access; wrap with `withErrorHandler`
- [x] 5.6 Refactor `app/api/analytics/token-usage/route.ts` to call `ConversationService.aggregateTokenUsage()`; remove direct Prisma access; wrap with `withErrorHandler`
- [x] 5.7 Refactor `app/api/planning-threads/route.ts` to delegate to `PlanningService`; wrap with `withErrorHandler`
- [x] 5.8 Refactor `app/api/planning-threads/[id]/route.ts` to delegate to `PlanningService`; wrap with `withErrorHandler`
- [x] 5.9 Refactor `app/api/planning-threads/[id]/messages/route.ts` to delegate to `PlanningService.sendMessage()`; remove inline auto-titling; wrap with `withErrorHandler`
- [x] 5.10 Refactor `app/api/planning-threads/[id]/messages/[messageId]/mutations/route.ts` to delegate to `PlanningService.persistMutationAction()`; remove direct Prisma; wrap with `withErrorHandler`

## 6. Agent System Cleanup

- [x] 6.1 Create `lib/services/agent.service.ts` with: `runStream(role, message, taskId, history)`, `runPlan(role, message)`, `runForTask(role, message, taskId)`, `generateTasks(projectId, messages)` (includes JSON extraction logic)
- [x] 6.2 Replace hardcoded `'gpt-4o-mini'` in `lib/agents/configs.ts` (3 occurrences) with `getAgentModel()` from the env helper
- [x] 6.3 Replace `as any` and unsafe type assertions in `lib/agents/tools/index.ts` with proper Zod-inferred types
- [x] 6.4 Refactor `app/api/agents/stream/route.ts` to delegate to `AgentService.runStream()`; wrap with `withErrorHandler`
- [x] 6.5 Refactor `app/api/agents/run/route.ts` to wrap with `withErrorHandler`
- [x] 6.6 Refactor `app/api/agents/plan/route.ts` to delegate to `AgentService.runPlan()`; remove inline schema; wrap with `withErrorHandler`
- [x] 6.7 Refactor `app/api/agents/tasks/route.ts` to delegate to `AgentService.runForTask()`; remove inline enum; wrap with `withErrorHandler`
- [x] 6.8 Refactor `app/api/agents/team/route.ts` to wrap with `withErrorHandler`; remove inline schema
- [x] 6.9 Refactor `app/api/agents/generate-tasks/route.ts` to delegate to `AgentService.generateTasks()`; wrap with `withErrorHandler`
- [x] 6.10 Delete or gate `app/api/test/agents/route.ts` behind `NODE_ENV !== 'production'`

## 7. Verification

- [ ] 7.1 Run `next build` and confirm zero TypeScript errors
- [ ] 7.2 Run `eslint` on all modified files and confirm no new errors
- [ ] 7.3 Grep all files under `app/api/` for `z.object(` and `z.enum(` — confirm zero matches (all schemas imported)
- [ ] 7.4 Grep all files under `lib/db/` for `as any` — confirm zero matches
- [ ] 7.5 Grep all files under `app/api/` for `import.*prisma` or `from.*client` — confirm zero matches (no direct Prisma access in routes)
- [ ] 7.6 Grep `lib/agents/configs.ts` for `gpt-` — confirm zero matches (model configurable via env)
- [ ] 7.7 Verify every route handler is wrapped with `withErrorHandler` by grepping for `export.*function` vs `withErrorHandler` in all route files

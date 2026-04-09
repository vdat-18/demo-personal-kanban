## Why

The FE components (`TaskChatClient`, `PlanningClient`) are constructing agent prompts inline — embedding task context, role framing, and status into strings before calling the API. This couples presentation logic to business logic, leaks prompt strategy to the client, and makes it impossible to iterate on prompting without touching UI code.

## What Changes

- Remove prompt-assembly logic from `TaskChatClient` and `PlanningClient`; FE sends only raw user input + minimal context identifiers (task ID, agent role, user message)
- Add a new `POST /api/agents/chat` endpoint that accepts `{ taskId, role, userMessage }`, fetches task context from the DB, assembles the full prompt server-side, and streams the SSE response
- Add a new `POST /api/agents/plan` endpoint that accepts `{ projectId, userMessage }`, fetches project + task context from the DB, assembles the planning prompt, and returns the JSON result
- Move the `fullPrompt` construction (role framing, task title/status/description interpolation) into dedicated BE prompt-builder utilities in `lib/agents/prompts.ts`
- `useAgentStream` hook signature stays the same but callers now pass `{ taskId, role, userMessage }` instead of a pre-assembled `prompt` string; the hook targets the new `/api/agents/chat` endpoint
- The `PlanningClient` `sendMessage` call switches to the new `/api/agents/plan` endpoint

## Capabilities

### New Capabilities

- `agent-chat-endpoint`: Server-side chat endpoint that owns task-context fetching and full prompt assembly for the interactive task-chat flow
- `agent-plan-endpoint`: Server-side planning endpoint that owns project-context fetching and planning prompt assembly for the planning flow
- `prompt-builder`: Shared BE utility that constructs agent prompts from structured context objects (task data, project data, conversation history)

### Modified Capabilities

<!-- No existing capability specs exist yet — no delta specs required -->

## Impact

- **Modified files**: `components/task-chat/TaskChatClient.tsx`, `components/planning/PlanningClient.tsx`, `lib/hooks/useAgentStream.ts`, `lib/validations/schemas.ts`
- **New files**: `app/api/agents/chat/route.ts`, `app/api/agents/plan/route.ts`, `lib/agents/prompts.ts`
- **No DB schema changes** — task and project data already available via Prisma
- **No breaking changes to existing `/api/agents/stream` or `/api/agents/run`** endpoints — they remain for direct/programmatic use; only the FE-facing flow migrates

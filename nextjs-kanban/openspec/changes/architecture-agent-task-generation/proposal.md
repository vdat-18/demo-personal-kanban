## Why

The Architecture (Planner) Agent in the Planning UI can hold a conversation with users about project goals, but it cannot yet turn that conversation into concrete Kanban tasks. The task-generation path is broken because two pieces are missing: a backend API route that accepts the full conversation history and a `buildGenerateTasksPrompt` function that assembles an architect-specific prompt instructing the AI to return structured task data. As a result, users must manually add tasks even after a productive planning session.

## What Changes

- **New**: `buildGenerateTasksPrompt(messages, projectId)` in `lib/agents/prompts.ts` — assembles a prompt that includes the full conversation history and instructs the architect agent to extract actionable tasks as structured JSON.
- **New**: `POST /api/agents/generate-tasks` route — accepts `projectId` + `messages[]`, calls the architect agent with the assembled prompt, parses the JSON task list from the response, and bulk-creates the tasks in the database via existing `createTask` DB helpers.
- **Update**: `PlanningClient.tsx` — adds a "Generate Tasks" button that sends the current `messages` state and `projectId` to the new route, then refreshes the task list on the right panel with the returned tasks.
- **Update**: `lib/validations/schemas.ts` — adds `generateTasksSchema` (Zod) for the new route's input validation.

## Capabilities

### New Capabilities

- `architect-task-generation`: The architect agent analyses a planning conversation and produces a structured list of tasks (title + description) that are automatically saved to the project.

### Modified Capabilities

- `planning-agent-conversation`: The existing planning chat interaction gains a "Generate Tasks" action; the `PlanningClient` now sends conversation history to the backend rather than only the latest message, and the right panel can be populated from AI output automatically.

## Impact

- **Files changed**: `lib/agents/prompts.ts`, `lib/validations/schemas.ts`, `components/planning/PlanningClient.tsx`
- **Files added**: `app/api/agents/generate-tasks/route.ts`
- **Dependencies**: no new packages — relies on existing `runAgent('architect', ...)`, `createTask` DB helper, and Zod
- **API surface**: one new POST endpoint `/api/agents/generate-tasks`

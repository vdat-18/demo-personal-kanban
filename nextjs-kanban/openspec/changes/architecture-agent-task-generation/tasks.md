## 1. Backend — Prompt & DB helpers

- [x] 1.1 Add `buildGenerateTasksPrompt(messages, projectId)` to `lib/agents/prompts.ts` — fetches project context, embeds full conversation history, instructs architect to return a JSON code-fenced array of `{ title, description }` objects
- [x] 1.2 Add `createTasksBatch(tasks, projectId)` to `lib/db/tasks.ts` — uses `prisma.$transaction` to bulk-create tasks with default status `TODO` and priority `MEDIUM`; returns the created records

## 2. Backend — Validation schema

- [x] 2.1 Add `generateTasksSchema` to `lib/validations/schemas.ts` — validates `{ projectId: uuid, messages: [{ role: 'user'|'assistant', content: string }] }`

## 3. Backend — API route

- [x] 3.1 Create `app/api/agents/generate-tasks/route.ts` with `POST` handler — validate body with `generateTasksSchema`, call `buildGenerateTasksPrompt`, run architect agent via `runAgent('architect', prompt)`, extract JSON from response (code-fence regex), call `createTasksBatch`, return created tasks
- [x] 3.2 Add JSON extraction helper (regex for ```json ... ``` blocks) with try/catch — return 422 on parse failure, 404 on missing project

## 4. Frontend — PlanningClient update

- [x] 4.1 Add `isGenerating` state and `generateTasks` callback to `PlanningClient.tsx` — sends `{ projectId, messages }` to `POST /api/agents/generate-tasks`
- [x] 4.2 Add "Generate Tasks" button (with Sparkles icon) next to existing "Add Task" button — disabled when `isGenerating` is true or no user messages exist; shows loading spinner during request
- [x] 4.3 On successful response, merge returned tasks into `project.tasks` state so right panel updates immediately
- [x] 4.4 On error response, display an inline error message (toast or text below button)

## 5. Verification

- [ ] 5.1 Manual test: start a planning conversation, click "Generate Tasks", verify tasks appear in right panel and persist in the database
- [ ] 5.2 Manual test: verify button is disabled during generation and when no user messages exist
- [ ] 5.3 Manual test: verify error handling when AI returns unparseable output (can test by temporarily breaking the prompt)

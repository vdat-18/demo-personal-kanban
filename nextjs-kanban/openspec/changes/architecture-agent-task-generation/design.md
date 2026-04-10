## Context

The Kanban app has a Planning UI (`PlanningClient.tsx`) where users chat with an Architect agent about project goals. The agent returns markdown-formatted advice, and a simple regex (`/\d+\.\s+\*\*([^*]+)\*\*/g`) detects numbered bold items to set a `report` state — but nothing actually creates tasks from the conversation. Users must click "Add Task" and type each task title manually.

The backend already has:
- `runAgent('architect', prompt)` in `lib/agents/orchestrator.ts` — runs the architect agent and returns its text output.
- `buildPlanPrompt(userMessage, projectId)` in `lib/agents/prompts.ts` — assembles context for a single user message (not the full conversation).
- `createTask({ title, description, projectId })` in `lib/db/tasks.ts` — creates a task via Prisma.
- `/api/agents/plan` route — sends a single message to the architect and returns the response.

What's missing: a prompt that feeds the **full conversation history** to the architect with instructions to output structured JSON tasks, a backend route to receive that request, parse the JSON, and persist the tasks.

## Goals / Non-Goals

**Goals:**
- Enable the architect agent to generate a structured task list (JSON) from the full planning conversation.
- Persist generated tasks to the database in a single backend call.
- Provide a one-click "Generate Tasks" UX in the Planning panel.
- Return created tasks to the frontend so the right panel updates immediately (no page reload).

**Non-Goals:**
- Streaming the task-generation response (non-streaming `runAgent` is sufficient; the response is small).
- Editing/approving individual tasks before creation — the user can edit tasks on the Kanban board later.
- Multi-turn refinement of the task list (e.g., "make task 3 more specific") — out of scope for this change.
- Changing the existing chat flow or `buildPlanPrompt` function.

## Decisions

### 1. Full conversation history in prompt vs. summary

**Decision**: Send the full `messages[]` array to the backend and embed them verbatim in the prompt.

**Rationale**: The conversations are short (planning sessions rarely exceed 20 turns). A summary step would add latency and lose nuance. The architect model (`gpt-4o-mini`) handles the context size comfortably.

**Alternative considered**: Summarise the conversation first with a separate LLM call, then generate tasks from the summary. Rejected — unnecessary complexity and latency for the expected conversation length.

### 2. Structured output format: JSON with prompt-level enforcement

**Decision**: The `buildGenerateTasksPrompt` instructs the architect to respond with a JSON array of `{ title, description }` objects, wrapped in a markdown code fence. The backend parses the JSON from the response.

**Rationale**: The `@jackchen_me/open-multi-agent` SDK's `Agent.run()` returns raw text. Prompt-level JSON enforcement with a regex code-fence extractor is the simplest approach that works reliably with `gpt-4o-mini`.

**Alternative considered**: Use OpenAI's `response_format: { type: "json_object" }`. Rejected — the orchestrator SDK doesn't expose this parameter without forking the library.

### 3. Single new route vs. extending `/api/agents/plan`

**Decision**: Create a new `POST /api/agents/generate-tasks` route.

**Rationale**: The planning route handles conversational back-and-forth (single message in, text out). Task generation is a distinct action (full conversation in, structured tasks out + DB writes). Mixing them would complicate the existing route and violate single-responsibility. A separate route also allows independent rate-limiting or auth in the future.

### 4. Bulk task creation

**Decision**: Use `prisma.task.createMany()` wrapped in a transaction to insert all tasks at once.

**Rationale**: Atomic insert — either all tasks are created or none are. Avoids partial-creation states if one task fails validation. The `createTask` helper from `lib/db/tasks.ts` creates one at a time; a new `createTasksBatch` helper is cleaner than looping.

## Risks / Trade-offs

- **AI output parsing** — The model may occasionally produce malformed JSON.  
  → Mitigation: Wrap the JSON extraction in a try/catch with a fallback regex. If parsing fails, return a 422 with a user-friendly error so the frontend can display "Could not parse tasks, try again."

- **Duplicate task creation** — User might click "Generate Tasks" multiple times.  
  → Mitigation: Disable the button while the request is in-flight (`isGenerating` state). The backend is idempotent in the sense that it always creates new tasks, so duplicates are the user's responsibility. A warning dialog on re-click could be a future enhancement.

- **Token cost** — Sending the full conversation on every generation call.  
  → Acceptable trade-off for planning sessions (short conversations, infrequent calls). Monitor usage.

- **No approval step** — Tasks are created immediately without user review.  
  → Acceptable for v1: the user explicitly clicks "Generate Tasks" and can delete/edit tasks on the board. An intermediate preview step adds UX complexity with little benefit for a personal Kanban app.

## Context

The kanban app currently has two chat modes:
1. **Planning mode** (`/planning/[projectId]`) — chat with an AI architect to brainstorm and generate tasks for a project. Messages live only in React state (ephemeral).
2. **Task chat** (`/chat/[taskId]`) — chat with agents about a specific task. Messages are persisted via the `Conversation` model, tied to a task.

Planning mode has no persistence. Every page refresh or navigation loses the conversation. There's no concept of separate discussion threads, and the AI receives only the current user message — it has no awareness of what tasks already exist beyond a summary injected into the prompt.

**Stack context**: Next.js 16 (App Router), PostgreSQL + Prisma 7, React 19, Zustand, Tailwind CSS 4, `@jackchen_me/open-multi-agent` for AI agent orchestration. The existing `Conversation` model stores messages as a JSON blob tied to a `Task`.

## Goals / Non-Goals

**Goals:**
- Persist all planning chat messages to the database so they survive refreshes and sessions
- Support multiple chat threads per project so users can start fresh discussions without losing history
- Keep the task list panel always visible on the right-hand side of all planning threads
- Provide the AI with the full current task list so it can reason about what to add, update, or remove
- Enable AI-proposed task mutations (add/update/delete) that users can approve inline

**Non-Goals:**
- Real-time collaboration / multiplayer chat — this is a personal kanban tool
- Migrating existing `Conversation` model — task-level conversations stay as-is
- Full streaming rewrite for planning — the existing non-streaming `/api/agents/plan` pattern is acceptable; streaming can be added later
- AI autonomously executing task mutations without user approval
- Chat search / full-text search across threads

## Decisions

### 1. Separate `PlanningThread` + `PlanningMessage` models (not reusing `Conversation`)

**Decision**: Create new Prisma models rather than extending the existing `Conversation` model.

**Rationale**: The existing `Conversation` model stores all messages as a single JSON blob, is scoped to a `Task`, and is designed for single-session exchanges. Planning threads need: (a) project-level scoping, (b) individual message records for append-only persistence, (c) thread grouping. Reusing `Conversation` would require breaking changes to an already-working model.

**Alternative considered**: Adding a `projectId` nullable FK to `Conversation` and a `type` discriminator. Rejected because the JSON-blob message storage pattern doesn't support incremental message appending efficiently, and the semantic overlap is confusing.

### 2. Messages stored as individual rows (not JSON blob)

**Decision**: Each chat message is a `PlanningMessage` row with `role`, `content`, `threadId`, and timestamps.

**Rationale**: Individual rows allow incremental writes (append a message without re-writing the whole conversation), efficient pagination, and future features like search/filtering. The existing `Conversation` model's JSON approach was fine for short agent exchanges but doesn't scale for long multi-turn planning sessions.

### 3. Thread-list sidebar within the planning page

**Decision**: Add a narrow thread-list sidebar on the far left (or as a collapsible panel) within `PlanningClient`, showing all threads for the current project. The layout becomes: `[Thread List] | [Chat] | [Tasks]`.

**Rationale**: Users need to see and switch between threads without leaving the page. A sidebar pattern is familiar from chat apps (Slack, ChatGPT). The thread list is scoped to the current project via the URL `[id]` param.

### 4. Task context injected into every planning AI prompt

**Decision**: Modify `buildPlanPrompt` to always include the current project tasks (title, status, priority, description) in the system context, and add an instruction telling the AI it can suggest task mutations.

**Rationale**: Without task context, the AI cannot know if a task already exists. Including the full list enables it to say "Task X is already done, you might want to add Y" or "Consider updating task Z's priority."

### 5. Structured task-mutation proposals in AI responses

**Decision**: The AI returns task mutation suggestions as a structured JSON block (fenced code block with a `task-mutations` tag) embedded within its natural-language response. The frontend parses these blocks and renders approval buttons.

**Rationale**: This avoids adding tool-calling complexity to the non-streaming plan endpoint. The AI already returns markdown; embedding a structured block is simple to parse and render. The user sees both the reasoning and the proposed actions, and can approve/reject each individually.

**Format example**:
```task-mutations
[
  { "action": "add", "title": "Set up CI pipeline", "description": "..." },
  { "action": "update", "id": "<task-uuid>", "fields": { "status": "DONE" } },
  { "action": "delete", "id": "<task-uuid>", "reason": "Superseded by ..." }
]
```

### 6. API route structure

**Decision**: New routes under `/api/planning-threads/`:
- `GET /api/planning-threads?projectId=X` — list threads for a project
- `POST /api/planning-threads` — create a new thread
- `GET /api/planning-threads/[id]/messages` — get messages for a thread
- `POST /api/planning-threads/[id]/messages` — send a message (triggers AI response)
- `DELETE /api/planning-threads/[id]` — delete a thread

**Rationale**: RESTful, follows the existing API patterns (`/api/tasks/`, `/api/projects/`, `/api/conversations/`). Separating thread creation from messaging keeps concerns clean.

## Risks / Trade-offs

- **[Growing prompt size]** → Including all tasks in the AI prompt will grow with the project. **Mitigation**: Limit to the 50 most recent tasks and summarize completed ones. Add a token budget check.
- **[JSON-in-markdown parsing fragility]** → Parsing `task-mutations` blocks from AI output may fail if the LLM doesn't follow the format precisely. **Mitigation**: Wrap parsing in try/catch; if parsing fails, render the raw markdown without action buttons. Include few-shot examples in the prompt.
- **[Migration required]** → Adding new models requires a Prisma migration. **Mitigation**: The new models are additive (no existing table changes), so migration is safe with zero downtime. Rollback = drop the new tables.
- **[Thread sprawl]** → Users may create many threads. **Mitigation**: Show most-recent threads first, with a "Load more" pattern. Consider a max-threads-per-project soft limit in v2.

## Why

Planning mode chat messages are currently stored only in React state — they disappear on page reload or when starting a new conversation. Users lose all planning context and cannot review prior discussions. Additionally, the AI planning agent has no awareness of the existing task list, so it cannot intelligently suggest adding, updating, or deleting tasks based on what already exists.

## What Changes

- **Persist all planning chat messages to the database** — every message exchanged in the planning view is saved to a `PlanningThread` with linked `PlanningMessage` records, surviving page refreshes and session restarts.
- **Multi-thread support** — users can create new chat threads for fresh discussions while retaining full history of previous threads. A thread list sidebar allows switching between past conversations.
- **Always-visible task panel** — the right-hand task list panel remains visible across all chat threads, always reflecting the current project tasks.
- **Task-aware AI prompts** — the planning agent receives the full current task list in its prompt context, enabling it to reason about what exists and recommend adding new tasks, updating existing ones, or deleting obsolete ones.
- **AI-driven task mutations** — the AI can propose specific task changes (add/update/delete) that the user can approve with one click, directly from the chat.

## Capabilities

### New Capabilities
- `planning-chat-persistence`: Database-backed storage for planning chat threads and messages, with API routes for CRUD operations.
- `planning-thread-management`: Multi-thread UI allowing users to start new threads, switch between threads, and view thread history.
- `task-aware-planning`: Enhanced AI prompt construction that includes the current task list, enabling the agent to propose task mutations (add, update, delete) with user confirmation.

### Modified Capabilities
<!-- No existing specs to modify — this is the first spec-driven change. -->

## Impact

- **Database**: New `PlanningThread` and `PlanningMessage` Prisma models; requires a migration.
- **API routes**: New routes under `/api/planning-threads/` for thread CRUD and message persistence.
- **Frontend**: `PlanningClient.tsx` rewritten to support multi-thread chat with DB persistence; new thread-list sidebar component.
- **Agent prompts**: `lib/agents/prompts.ts` updated — `buildPlanPrompt` now includes the full task list and supports structured task-mutation suggestions.
- **Existing conversation model**: The existing `Conversation` model (tied to tasks) is **not** modified. Planning threads are a separate concept from task-level conversations.

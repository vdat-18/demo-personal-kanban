# Design: Live Agent Cards

## Context

Task cards on the Mission Control kanban board (`/mission-control/[id]`) are static. They display title, description snippet, priority badge, and agent hint badge — but nothing about actual agent activity. Users must click into `/chat/[id]` to see any conversation progress, streaming status, or token usage. With 10+ tasks per project spread across 5 columns, this requires constant back-and-forth navigation just to monitor agent work.

## Goals

- Show the last conversation snippet directly on task cards
- Show a token usage badge summarizing input + output tokens
- Show a streaming indicator when an agent is actively working on a task
- Extract `TaskCard` into a reusable component (currently rendered inline in `MissionControlClient.tsx`)

## Non-Goals

- Full chat history on cards — cards show only the last message snippet
- Real-time WebSocket push — use polling + React Query refetch instead
- Expandable card detail panels — deferred to v2
- Audio/visual notifications for agent completion

## Decisions

### Decision 1: Data Fetching

**Extend the tasks API to include last conversation data.**

Add an `include` option to `getTasks()` in `lib/db/tasks.ts` that fetches the most recent Conversation per task using Prisma's `orderBy` + `take: 1` on the conversations relation. This keeps it to a single query (Prisma handles the join) and avoids N+1 patterns.

Only the last conversation's last message content and token usage summary are needed — not the full message history. This keeps the payload small even for projects with many tasks.

### Decision 2: Card Component Extraction

**Extract the inline card JSX from `MissionControlClient` into a standalone `TaskCard` component.**

Location: `components/mission-control/TaskCard.tsx`

Props interface:
- `task` — task data (with project relation)
- `lastConversation` — most recent conversation (nullable), containing last message and token usage
- `isStreaming` — whether an agent is currently streaming for this task

This makes the card testable in isolation and reusable if cards appear in other views later.

### Decision 3: Streaming Indicator

**Use Zustand store to track active streaming task IDs.**

Add `activeStreamingTaskIds: Set<string>` to the existing UI store at `lib/stores/uiStore.ts`, with `addStreamingTask(id)` and `removeStreamingTask(id)` actions.

When `useAgentStream` starts streaming for a task, it adds the task ID to the set. On completion or error, it removes the ID. `TaskCard` reads from the store to determine whether to show the pulsing indicator.

This is reactive (Zustand subscriptions trigger re-renders) and decoupled from the streaming hook's lifecycle.

### Decision 4: Snippet Truncation

**Show last assistant message, truncated to 80 characters with ellipsis.**

Rules:
- If the last message is from the assistant: show content truncated to 80 chars + "…"
- If the last message is from the user: show "You: {content}" truncated to 80 chars + "…"
- If there are no conversations for the task: show nothing (no snippet area)

The `messages` field on the Conversation model is a JSON array. Parse it, take the last element, and apply truncation.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Including conversations in task list query slows response for large projects | Medium | Medium | Only fetch the latest conversation's last message, not full history. Prisma `select` to limit fields. |
| Streaming indicator state becomes stale if hook errors silently | Low | Low | `removeStreamingTask` in both success and error/finally paths of `useAgentStream`. |
| Token usage sum is expensive for tasks with many conversations | Low | Low | Token usage is a simple sum of two integers per conversation — negligible computation. Could aggregate in DB query if needed later. |

# Tasks: Checkpoint Diffing

**Status**: Proposed
**Created**: 2026-04-10
**Spec**: [specs/checkpoint-diffing/spec.md](specs/checkpoint-diffing/spec.md)

---

## Task List

### Task 1: Add TaskCheckpoint model to Prisma schema + create migration
**Spec**: REQ-1
**Files**: `prisma/schema.prisma`

- Add `CheckpointTrigger` enum with values: `STATUS_CHANGE`, `CONVERSATION_COMPLETE`, `AGENT_MODIFICATION`, `MANUAL`
- Add `TaskCheckpoint` model with fields: `id` (UUID, default cuid/uuid), `taskId` (relation to Task, onDelete: Cascade), `title` (String), `description` (String?), `status` (String), `priority` (String), `trigger` (CheckpointTrigger), `conversationId` (optional relation to Conversation), `createdAt` (DateTime, default now)
- Add reverse relation on Task model: `checkpoints TaskCheckpoint[]`
- Add optional reverse relation on Conversation model: `checkpoints TaskCheckpoint[]`
- Add index on `taskId` + `createdAt` for efficient timeline queries
- Run `npx prisma migrate dev` to create and apply migration

---

### Task 2: Create lib/db/checkpoints.ts with CRUD functions
**Spec**: REQ-1, REQ-5, REQ-6
**Files**: `lib/db/checkpoints.ts`

- `createCheckpoint(data)` — Create a new TaskCheckpoint record. Accept: taskId, title, description, status, priority, trigger, conversationId (optional). Return the created checkpoint.
- `getCheckpointsByTaskId(taskId, options?)` — Fetch checkpoints for a task, ordered by `createdAt` ascending. Support pagination: `take` (default 20), `cursor` for cursor-based pagination. Return checkpoints array and pagination metadata.
- `getCheckpointById(id)` — Fetch a single checkpoint by ID.
- `getCheckpointPair(idA, idB)` — Fetch two checkpoints by ID for diff comparison. Validate both exist and belong to the same task. Return both checkpoint objects.
- `getRecentCheckpoints(taskId, limit?)` — Fetch the N most recent checkpoints for a task (default 10). Used by Reviewer agent prompt builder.

---

### Task 3: Add auto-checkpoint trigger in updateTask() for status changes
**Spec**: REQ-2
**Files**: `lib/db/tasks.ts`

- In `updateTask()`, before applying the update, check if the `status` field is changing.
- If status is changing, read the current task state from the database.
- Fire-and-forget a `createCheckpoint()` call with trigger `STATUS_CHANGE`, capturing the BEFORE state.
- Wrap checkpoint creation in try/catch — failures must not block the task update.
- The checkpoint creation should be non-blocking (don't await it on the critical path).

---

### Task 4: Add auto-checkpoint trigger in createConversation() for conversation completion
**Spec**: REQ-3
**Files**: `lib/db/tasks.ts` (or wherever `createConversation` lives)

- In `createConversation()`, after the conversation is created, check if it has a `taskId`.
- If linked to a task, fetch the task's current state.
- Fire-and-forget a `createCheckpoint()` call with trigger `CONVERSATION_COMPLETE`, capturing the current task state and linking the new conversation's ID.
- Wrap checkpoint creation in try/catch — failures must not block conversation creation.

---

### Task 5: Add auto-checkpoint trigger in task_update agent tool for description/title changes
**Spec**: REQ-4
**Files**: Agent tool definition file (wherever `task_update` tool is implemented)

- Before applying the agent's modification, check if `title` or `description` is being changed.
- If either is changing, read the current task state.
- Fire-and-forget a `createCheckpoint()` call with trigger `AGENT_MODIFICATION`, capturing the BEFORE state and linking the current conversation ID if available.
- Wrap checkpoint creation in try/catch — failures must not block the agent tool execution.

---

### Task 6: Create GET /api/tasks/[id]/checkpoints API route (paginated)
**Spec**: REQ-1, REQ-5
**Files**: `app/api/tasks/[id]/checkpoints/route.ts`

- GET handler that accepts `taskId` from URL params.
- Query params: `cursor` (optional, for pagination), `take` (optional, default 20).
- Call `getCheckpointsByTaskId()` from `lib/db/checkpoints.ts`.
- Return JSON: `{ checkpoints: [...], nextCursor: string | null }`.
- Validate that the task exists; return 404 if not found.

---

### Task 7: Create GET /api/tasks/[id]/checkpoints/diff API route (compare two checkpoints)
**Spec**: REQ-6
**Files**: `app/api/tasks/[id]/checkpoints/diff/route.ts`

- GET handler that accepts `taskId` from URL params.
- Query params: `a` (checkpoint ID), `b` (checkpoint ID) — both required.
- Call `getCheckpointPair(a, b)` from `lib/db/checkpoints.ts`.
- Validate both checkpoints exist and belong to the specified task; return 400/404 as appropriate.
- Return JSON: `{ checkpointA: {...}, checkpointB: {...} }`.
- Client performs the actual diffing — the API just returns raw checkpoint data.

---

### Task 8: Add checkpoint timeline component to TaskChatClient sidebar
**Spec**: REQ-5
**Files**: `components/tasks/CheckpointTimeline.tsx`, modifications to TaskChatClient

- Create `CheckpointTimeline` component that fetches and displays checkpoints for a task.
- Each timeline entry shows: relative timestamp, trigger type icon (emoji or icon), status badge, truncated description change indicator.
- Pagination: "Load more" button when more than 20 checkpoints exist.
- Empty state: "No checkpoints yet" message.
- Integrate into TaskChatClient sidebar below the existing task info section.
- Support selecting two checkpoints for diff comparison (checkbox or click-to-select UX).

---

### Task 9: Add checkpoint diff modal using DiffViewer
**Spec**: REQ-6
**Files**: `components/tasks/CheckpointDiffModal.tsx`

- Create `CheckpointDiffModal` component that displays field-by-field diff between two checkpoints.
- Title diff: Use word-level diff rendering (can reuse DiffViewer or inline diff logic).
- Description diff: Render via existing `DiffViewer` component from `components/shared/DiffViewer.tsx`.
- Status diff: Side-by-side status badges with arrow indicator (before → after).
- Priority diff: Side-by-side priority badges with arrow indicator (before → after).
- Unchanged fields: Show "No changes" or visually mute the section.
- Modal opens when two checkpoints are selected from the timeline and user clicks "Compare".

---

### Task 10: Update Reviewer agent prompt with checkpoint history context
**Spec**: REQ-7
**Files**: `lib/agents/prompts.ts`

- In the Reviewer agent prompt builder, fetch recent checkpoints for the task being reviewed using `getRecentCheckpoints(taskId, 10)`.
- Add a "Task Evolution" section to the prompt containing:
  - Chronological list of checkpoints
  - For each: timestamp, trigger type, status, summary of changes from previous checkpoint
- If no checkpoints exist, omit the section or note "No evolution history available".
- If more than 10 checkpoints exist, include a note: "Showing 10 most recent of N total checkpoints".
- Keep the section concise to manage prompt token usage.

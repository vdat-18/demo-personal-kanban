# Design: Checkpoint Diffing

**Status**: Proposed
**Created**: 2026-04-10

---

## Context

Task state changes over time through agent interactions. Users can see raw conversation history but can't see HOW the task evolved — what changed in the description, when status changed, etc. The DiffViewer exists but only compares two strings, not structured task snapshots.

The current system stores conversations with their results, but there is no mechanism to capture the task's state at specific meaningful moments. This makes it impossible to answer questions like "what did this task look like before the agent rewrote the description?" or "how many status transitions did this task go through?"

## Goals

- **Snapshot task state at meaningful moments** — Capture immutable snapshots of task fields (title, description, status, priority) when significant changes occur.
- **Timeline view of checkpoints** — Provide a chronological view of how a task evolved, integrated into the existing TaskChatClient sidebar.
- **Diff between any two checkpoints** — Allow users to select any two checkpoints and see a field-by-field comparison of what changed.
- **Enrich Reviewer agent context with evolution history** — Give the Reviewer agent visibility into how a task evolved, not just its current state.

## Non-Goals

- **File-level diffs** — This isn't a code review tool. We're diffing task metadata, not source files.
- **Real-time collaborative editing** — Checkpoints are created after the fact, not during live editing sessions.
- **Undo/rollback to previous checkpoints** — Checkpoints are read-only historical records. Restoring a previous state is out of scope.
- **Checkpointing for projects** — Only tasks are checkpointed. Project-level snapshots are not part of this change.

---

## Decisions

### Decision 1: Data Model

New `TaskCheckpoint` model:

| Field            | Type           | Notes                                                                 |
|------------------|----------------|-----------------------------------------------------------------------|
| id               | UUID           | Primary key, auto-generated                                           |
| taskId           | FK → Task      | Cascade delete when task is deleted                                   |
| title            | String         | Snapshot of task title at checkpoint time                             |
| description      | String?        | Snapshot of task description at checkpoint time                       |
| status           | String         | Snapshot of task status at checkpoint time                            |
| priority         | String         | Snapshot of task priority at checkpoint time                          |
| trigger          | Enum           | STATUS_CHANGE, CONVERSATION_COMPLETE, AGENT_MODIFICATION, MANUAL      |
| conversationId   | FK → Conversation? | Optional link to the conversation that caused this checkpoint    |
| createdAt        | DateTime       | Immutable timestamp                                                   |

Checkpoints are **immutable once created**. There are no update operations on checkpoints — they are append-only historical records.

### Decision 2: Auto-Checkpoint Triggers

Create a checkpoint automatically on:

**(a) Status change** — In `updateTask()`, when the `status` field changes, create a checkpoint capturing the task's state BEFORE the change. This captures the pre-transition state so diffs show what the task looked like before and after.

**(b) Conversation completion** — In `createConversation()`, when the conversation is linked to a task, create a checkpoint capturing the task's current state. This marks "the task looked like this when this conversation happened."

**(c) Agent modification** — When an agent modifies a task's title or description via the `task_update` tool, create a checkpoint capturing the task's state BEFORE the modification.

**NOT triggered on:**
- Priority-only changes (unless status also changes)
- Every minor metadata update
- Read operations or queries

### Decision 3: Diff Comparison

The API returns two full checkpoint objects. The client diffs each field independently:

- **title** — String diff (word-level)
- **description** — String diff via existing `DiffViewer` component (already handles word-level diffs)
- **status** — Before → after badge display
- **priority** — Before → after badge display

No need to enhance the existing `DiffViewer` — it already handles word-level string diffs. The diff modal composes `DiffViewer` for text fields and simple badge comparisons for enum fields.

### Decision 4: Timeline Placement

Add checkpoint timeline to the TaskChatClient sidebar, below the existing task info section.

Each checkpoint in the timeline shows:
- **Timestamp** — Relative time (e.g., "2 hours ago")
- **Trigger type icon** — Visual indicator of what caused the checkpoint
- **Status badge** — The task's status at that point in time
- **Description change indicator** — Truncated preview if description changed from previous checkpoint

Clicking two checkpoints opens a diff modal showing the field-by-field comparison.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Checkpoint volume grows large for active tasks | Storage bloat, slow timeline queries | Paginate timeline (show last 20). Plan archival strategy for old checkpoints (compress or offload). |
| Performance impact on hot paths (`updateTask`, `createConversation`) | Increased latency on task operations | Make checkpoint creation async — fire-and-forget Prisma create, non-blocking. The checkpoint write should not delay the response to the user. |
| Stale checkpoint data if task fields change schema | Checkpoints reference old field shapes | Store raw field values as they exist at checkpoint time. Since checkpoints are immutable snapshots, schema changes only affect new checkpoints. |

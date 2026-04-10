# Spec: Checkpoint Diffing

**Status**: Proposed
**Created**: 2026-04-10
**Design**: [../design.md](../../design.md)

---

## Requirements

### REQ-1: Checkpoint Data Model

System SHALL store immutable task state snapshots in a `TaskCheckpoint` model with fields: `id` (UUID), `taskId` (FK → Task), `title`, `description`, `status`, `priority`, `trigger` (enum: STATUS_CHANGE, CONVERSATION_COMPLETE, AGENT_MODIFICATION, MANUAL), `conversationId` (optional FK → Conversation), `createdAt`.

Checkpoints SHALL cascade-delete when their parent task is deleted.

**WHEN** a task is deleted
**THEN** all checkpoints associated with that task SHALL be deleted automatically.

**WHEN** a checkpoint is created
**THEN** it SHALL be immutable — no update operations are permitted on checkpoint records.

**WHEN** querying checkpoints for a task
**THEN** results SHALL be ordered by `createdAt` ascending (chronological).

---

### REQ-2: Auto-Checkpoint on Status Change

When a task's status changes, system SHALL automatically create a checkpoint capturing the task's state BEFORE the change.

**WHEN** `updateTask()` is called with a new `status` value that differs from the current status
**THEN** system SHALL create a `TaskCheckpoint` with:
  - `trigger` = `STATUS_CHANGE`
  - `title`, `description`, `status`, `priority` = the task's field values BEFORE the update is applied
  - `taskId` = the task being updated
  - `conversationId` = null (unless triggered within a conversation context)

**WHEN** `updateTask()` is called but the `status` field has not changed
**THEN** system SHALL NOT create a checkpoint for this trigger type.

**WHEN** checkpoint creation fails
**THEN** the task update SHALL still proceed — checkpoint creation is non-blocking.

---

### REQ-3: Auto-Checkpoint on Conversation Complete

When a conversation linked to a task is created/completed, system SHALL create a checkpoint capturing the task's current state.

**WHEN** `createConversation()` is called with a `taskId` linking it to a task
**THEN** system SHALL create a `TaskCheckpoint` with:
  - `trigger` = `CONVERSATION_COMPLETE`
  - `title`, `description`, `status`, `priority` = the task's current field values
  - `taskId` = the linked task
  - `conversationId` = the newly created conversation's id

**WHEN** `createConversation()` is called without a `taskId`
**THEN** system SHALL NOT create a checkpoint.

**WHEN** checkpoint creation fails
**THEN** the conversation creation SHALL still proceed — checkpoint creation is non-blocking.

---

### REQ-4: Auto-Checkpoint on Agent Modification

When an agent modifies a task's title or description via the `task_update` tool, system SHALL create a checkpoint capturing the task's state BEFORE the modification.

**WHEN** the `task_update` agent tool is invoked and it modifies the task's `title` or `description`
**THEN** system SHALL create a `TaskCheckpoint` with:
  - `trigger` = `AGENT_MODIFICATION`
  - `title`, `description`, `status`, `priority` = the task's field values BEFORE the agent's modification is applied
  - `taskId` = the task being modified
  - `conversationId` = the current conversation's id (if available)

**WHEN** the `task_update` tool only modifies `priority` (without changing `title`, `description`, or `status`)
**THEN** system SHALL NOT create a checkpoint for this trigger type.

**WHEN** checkpoint creation fails
**THEN** the agent modification SHALL still proceed — checkpoint creation is non-blocking.

---

### REQ-5: Checkpoint Timeline View

TaskChatClient sidebar SHALL display a chronological timeline of checkpoints for the current task, showing timestamp, trigger type, and status badge for each.

**WHEN** a user views a task in TaskChatClient
**THEN** the sidebar SHALL display a "Checkpoints" section below the existing task info section containing:
  - A chronological list of checkpoints (most recent first in the UI)
  - Each entry showing: relative timestamp, trigger type icon, status badge
  - A truncated description change indicator (if description differs from previous checkpoint)

**WHEN** the task has more than 20 checkpoints
**THEN** the timeline SHALL paginate, showing the 20 most recent checkpoints first with a "Load more" control.

**WHEN** the task has zero checkpoints
**THEN** the timeline section SHALL display an empty state message (e.g., "No checkpoints yet").

**WHEN** a new checkpoint is created while the user is viewing the task
**THEN** the timeline SHOULD update to include the new checkpoint (on next data fetch or page refresh).

---

### REQ-6: Checkpoint Diff Comparison

User SHALL be able to select any two checkpoints and view a field-by-field diff: title (word diff), description (word diff via DiffViewer), status (before → after), priority (before → after).

**WHEN** a user selects two checkpoints from the timeline
**THEN** the system SHALL open a diff modal showing:
  - **Title**: Word-level diff between the two checkpoints' titles
  - **Description**: Word-level diff rendered via the existing `DiffViewer` component
  - **Status**: Side-by-side badge display showing before → after status
  - **Priority**: Side-by-side badge display showing before → after priority

**WHEN** a field has not changed between the two selected checkpoints
**THEN** that field's diff section SHALL display "No changes" or be visually muted.

**WHEN** the user selects only one checkpoint
**THEN** the diff modal SHALL NOT open — two checkpoints are required for comparison.

**WHEN** the two selected checkpoints are the same checkpoint
**THEN** the system SHALL prevent the comparison (disable the compare action or show a message).

---

### REQ-7: Reviewer Agent Checkpoint Context

The Reviewer agent's prompt SHALL include the checkpoint history for the task being reviewed, showing how the task evolved over time.

**WHEN** the Reviewer agent is invoked for a task that has checkpoints
**THEN** the agent's prompt SHALL include a "Task Evolution" section containing:
  - The list of checkpoints in chronological order
  - For each checkpoint: timestamp, trigger type, status, and a summary of what changed from the previous checkpoint
  - Limited to the most recent 10 checkpoints (to manage prompt size)

**WHEN** the Reviewer agent is invoked for a task with zero checkpoints
**THEN** the prompt SHALL omit the "Task Evolution" section or note that no evolution history is available.

**WHEN** the task has more than 10 checkpoints
**THEN** only the 10 most recent checkpoints SHALL be included in the prompt, with a note indicating how many earlier checkpoints were omitted.

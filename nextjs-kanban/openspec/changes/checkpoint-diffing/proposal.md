## Why

The app stores full conversation history per task, and has a `DiffViewer` component for word-level diffs, but there's no way to see how a task evolved over time. When a Developer agent iterates on a task description through multiple conversations, or when the Architect refines requirements, the intermediate states are lost — only the current state and raw chat history remain. A checkpoint system would snapshot task state at key moments (status changes, conversation completions), enabling users and the Reviewer agent to understand the full evolution of a task, not just its final form.

## What Changes

- Create a `TaskCheckpoint` model that snapshots task state (title, description, status, priority) at meaningful moments
- Auto-create checkpoints when: task status changes, a conversation completes, task description is modified by an agent
- Add a checkpoint timeline view to the task chat sidebar showing the evolution of the task
- Enable diff comparison between any two checkpoints using the existing `DiffViewer` component
- Add checkpoint context to the Reviewer agent's prompt so it can see how work evolved
- Checkpoints are immutable once created (append-only log)

## Capabilities

### New Capabilities

- `checkpoint-diffing`: Automatic task state snapshots at key moments (status changes, conversation completions, agent modifications), with a timeline view and diff comparison between any two checkpoints

### Modified Capabilities

## Impact

- **`prisma/schema.prisma`** — new `TaskCheckpoint` model with task relation
- **New migration** — creates `task_checkpoints` table
- **`lib/db/checkpoints.ts`** (new) — checkpoint CRUD and query functions
- **`lib/db/tasks.ts`** — trigger checkpoint creation on status change and description update
- **`app/api/tasks/[id]/checkpoints/route.ts`** (new) — list checkpoints, compare two
- **`components/task-chat/TaskChatClient.tsx`** — checkpoint timeline in sidebar
- **`components/shared/DiffViewer.tsx`** — may need enhancement for structured field diffs
- **`lib/agents/prompts.ts`** — include checkpoint history in Reviewer agent prompt

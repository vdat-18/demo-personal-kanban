## Why

Today, every task on the mission-control board requires explicit user interaction — users must click into each task's chat page, choose an agent, type a prompt, and manually advance statuses. For projects with many tasks this becomes a bottleneck; agents sit idle waiting for humans to initiate each step. An **auto mode** per column would let agents autonomously pick up, execute, and advance tasks through the pipeline — turning the kanban board from a manual workflow into an agent-driven assembly line.

## What Changes

- Add a per-column **Auto Mode toggle** in the mission-control board header area for each column (except DONE and BLOCKED).
- When auto mode is enabled on a column, the system automatically picks up tasks in that column and dispatches them to the appropriate agent (architect for TODO, developer for IN_PROGRESS, reviewer for IN_REVIEW).
- Agents process tasks autonomously: send a contextual prompt, stream the response, persist the conversation, and advance the task to the next status upon successful completion.
- A visible **auto-mode indicator** on each column shows the active state and current processing status (idle, running, task name).
- Users can disable auto mode at any time to pause autonomous processing on a column.
- Tasks being auto-processed show a visual indicator on their card so users know an agent is working on them.
- An auto-processing queue ensures tasks are handled one at a time per column to avoid race conditions.

## Capabilities

### New Capabilities
- `column-auto-mode`: Per-column toggle that enables autonomous agent execution of tasks — includes the UI toggle, auto-dispatch logic, agent-column mapping, sequential task processing queue, and real-time status indicators.

### Modified Capabilities

## Impact

- **Components**: `MissionControlClient.tsx` — column headers gain auto-mode toggle + status indicator; task cards gain "auto-processing" visual state.
- **New hook/logic**: Auto-mode orchestration logic that polls or reacts to column state, dispatches agent streams, and transitions task statuses.
- **API**: Reuses existing `/api/agents/stream` and `/api/tasks/[id]` endpoints — no new API routes required.
- **State**: New client-side state for auto-mode enabled/disabled per column, processing queue, and active task tracking.
- **Existing agent system**: `useAgentStream` hook, `agentConfigs`, and `buildChatPrompt` are reused as-is.
- **Status lifecycle**: Respects existing `TRANSITION_MAP` rules — auto mode only advances tasks along valid transitions.

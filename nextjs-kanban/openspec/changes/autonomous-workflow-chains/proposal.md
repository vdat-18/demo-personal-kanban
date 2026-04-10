## Why

The app has three specialized agents (Architect, Developer, Reviewer) and backend endpoints for multi-agent team execution (`/api/agents/team`) and DAG pipelines (`/api/agents/tasks`), but there's no UI to trigger autonomous multi-step workflows. Users must manually chat with each agent, manually advance task status, and manually trigger the next agent. An "autonomous mode" would let users kick off a task and watch the agents chain through plan → execute → review automatically, with the board updating in real-time.

## What Changes

- Add an "Autonomous Run" button on task cards and task chat that triggers a full agent chain for a single task
- Define the autonomous pipeline: Architect plans (TODO) → Developer implements (IN_PROGRESS) → Reviewer checks (IN_REVIEW) → auto-close (DONE) or return with feedback
- Create a new `POST /api/agents/autonomous` endpoint that orchestrates the full chain, streaming progress via SSE
- Add real-time board updates via polling or SSE so Mission Control reflects status changes as agents work
- Add an intervention mechanism: user can pause/abort an autonomous run at any step
- Store each agent's conversation in the existing Conversation model, linked to the task
- Add a project-level "Run All" that processes tasks in dependency order (requires task-dependencies)

## Capabilities

### New Capabilities

- `autonomous-workflow`: Orchestrates a multi-agent chain (Architect → Developer → Reviewer) for a task, auto-transitioning status at each step, with SSE progress streaming and user intervention controls

### Modified Capabilities

## Impact

- **`app/api/agents/autonomous/route.ts`** (new) — orchestration endpoint with SSE streaming
- **`lib/agents/orchestrator.ts`** — new `runAutonomous()` function chaining agents with status transitions
- **`components/mission-control/MissionControlClient.tsx`** — "Autonomous Run" button, real-time status updates
- **`components/task-chat/TaskChatClient.tsx`** — "Run Autonomously" action
- **`lib/hooks/useAutonomousRun.ts`** (new) — SSE hook for autonomous progress
- **`lib/db/tasks.ts`** — status update with conversation creation in single transaction
- **Depends on**: `status-lifecycle` (for validated transitions), optionally `task-dependencies` (for project-level ordering)

## Why

Tasks currently have a `status` field (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED) but there are no rules governing transitions. Any status can be set to any other via drag-and-drop or API call. A task can jump from TODO straight to DONE, skip review, or move backwards arbitrarily. This lack of guardrails undermines workflow integrity and blocks future automation features (auto-cascade, autonomous agent chains) that depend on predictable status progression.

## What Changes

- Define a formal status state machine with allowed transitions (TODO → IN_PROGRESS → IN_REVIEW → DONE, any → BLOCKED, BLOCKED → TODO)
- Add server-side validation in API routes that rejects invalid status transitions with 422 responses
- Add a shared transition map (`lib/status-lifecycle.ts`) consumed by both server and client
- Update Mission Control drag-and-drop to only allow valid drop targets (grey out invalid columns)
- Update status advancement buttons to only show valid next statuses
- Update agent tools (`task_update`) to validate transitions before persisting
- Newly created tasks always start as TODO (formalize existing behavior)

## Capabilities

### New Capabilities

- `status-lifecycle`: Defines the allowed status transitions (state machine), validation logic, and the shared transition map used by both server and client

### Modified Capabilities

## Impact

- **`lib/status-lifecycle.ts`** (new) — shared transition map and validation function
- **`app/api/tasks/[id]/route.ts`** — PUT handler validates transitions, returns 422 on invalid
- **`components/mission-control/MissionControlClient.tsx`** — drag-and-drop respects allowed transitions, disables invalid targets
- **`lib/agents/tools/index.ts`** — `task_update` tool validates transitions
- **`types/domain.ts`** — may need alignment with lifecycle constants
- **No database schema changes** — status enum remains the same

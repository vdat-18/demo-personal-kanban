## Why

Tasks currently have a `status` field (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED) but there are no rules governing how tasks transition between statuses. Any status can be set to any other status via drag-and-drop or API call with no validation. This means a task can jump from TODO straight to DONE, skip review, or move backwards arbitrarily. A well-defined status lifecycle with transition rules is needed to enforce workflow integrity, enable automation (e.g., agent hints tied to status), and give users clear guardrails on how work progresses.

## What Changes

- Define a formal status state machine with allowed transitions (e.g., TODO -> IN_PROGRESS -> IN_REVIEW -> DONE)
- Add server-side validation that rejects invalid status transitions via the API
- Add client-side transition awareness so the UI only offers valid next statuses
- Support special transitions: any status -> BLOCKED, BLOCKED -> TODO (restore)
- Surface transition rules in Mission Control (disable invalid drag targets, show only valid "move forward" options)
- Planning page: newly created tasks always start as TODO (already the case, but formalize it)

## Capabilities

### New Capabilities
- `status-lifecycle`: Defines the allowed status transitions (state machine), validation logic, and the shared transition map used by both server and client.

### Modified Capabilities

## Impact

- `lib/db/tasks.ts` — `updateTask` needs transition validation before persisting
- `app/api/tasks/[id]/route.ts` — API layer must validate transitions, return 422 on invalid moves
- `components/mission-control/MissionControlClient.tsx` — drag-and-drop and arrow buttons must respect allowed transitions
- `lib/agents/tools/index.ts` — `task_update` tool must also validate transitions
- `types/domain.ts` and `constants/agents.ts` — may need alignment with lifecycle constants
- `lib/validations/schemas.ts` — task update schema may need transition context

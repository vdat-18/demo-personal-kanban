## 1. Shared Lifecycle Module

- [x] 1.1 Create `lib/status-lifecycle.ts` with `TRANSITION_MAP` (`Record<TaskStatus, TaskStatus[]>`) defining all valid edges: TODO→[IN_PROGRESS, BLOCKED], IN_PROGRESS→[IN_REVIEW, TODO, BLOCKED], IN_REVIEW→[DONE, IN_PROGRESS, BLOCKED], DONE→[], BLOCKED→[TODO]
- [x] 1.2 Export `validateTransition(from, to)` returning `{ valid, allowed, message? }` from the same module
- [x] 1.3 Export `getAllowedTransitions(from)` returning `TaskStatus[]` from the same module
- [x] 1.4 Export a custom `InvalidTransitionError` class that includes `from`, `to`, and `allowed` fields

## 2. Server-Side Enforcement (API Route)

- [x] 2.1 Update `lib/db/tasks.ts` `updateTask` to accept optional `currentStatus` param; when both `currentStatus` and `data.status` are provided, call `validateTransition` and throw `InvalidTransitionError` if invalid
- [x] 2.2 Update `app/api/tasks/[id]/route.ts` PUT handler: when `status` is in the request body, fetch the task's current status first, pass it to `updateTask`, and catch `InvalidTransitionError` to return HTTP 422 with `{ error, allowed }`
- [x] 2.3 Ensure non-status updates (title, description, priority) bypass transition validation entirely

## 3. Agent Tool Enforcement

- [x] 3.1 Update `lib/agents/tools/index.ts` `taskUpdateTool`: before the Prisma call, if `status` is provided, fetch the task's current status and call `validateTransition`; return `isError: true` with descriptive message and allowed statuses if invalid

## 4. Client-Side UI Constraints (Mission Control)

- [x] 4.1 Import `getAllowedTransitions` in `MissionControlClient.tsx`
- [x] 4.2 Update drag-and-drop: during `onDragOver`, check if the target column is a valid transition for the dragged task's status; only allow drop on valid columns
- [x] 4.3 Add visual feedback: show disabled/greyed-out styling on invalid drop target columns during drag, and a "not-allowed" cursor
- [x] 4.4 Update the forward-arrow button to use `getAllowedTransitions` — pick the first non-BLOCKED allowed status as the next step (skip BLOCKED since that has its own cancel button)
- [x] 4.5 Hide the forward-arrow button when the task has no valid non-BLOCKED transitions (i.e., DONE and BLOCKED statuses)

## 5. Testing & Verification

- [x] 5.1 Verify all 8 valid transitions are accepted by the API (manual or automated test)
- [x] 5.2 Verify invalid transitions (e.g., TODO→DONE, TODO→IN_REVIEW, DONE→anything, BLOCKED→IN_PROGRESS) return 422
- [x] 5.3 Verify drag-and-drop only allows valid columns and shows visual feedback
- [x] 5.4 Verify the agent `task_update` tool rejects invalid transitions with a helpful error message

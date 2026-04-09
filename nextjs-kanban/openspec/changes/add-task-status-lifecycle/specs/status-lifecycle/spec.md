## ADDED Requirements

### Requirement: Transition map defines all valid status moves
The system SHALL maintain a single-source-of-truth transition map that defines every valid (from, to) status pair. The map SHALL be a `Record<TaskStatus, TaskStatus[]>` with the following edges:

| From | Allowed To |
|---|---|
| TODO | IN_PROGRESS, BLOCKED |
| IN_PROGRESS | IN_REVIEW, TODO, BLOCKED |
| IN_REVIEW | DONE, IN_PROGRESS, BLOCKED |
| DONE | (none — terminal) |
| BLOCKED | TODO |

Any (from, to) pair not listed in the map is invalid.

#### Scenario: Valid forward transition
- **WHEN** a task has status `TODO` and a transition to `IN_PROGRESS` is requested
- **THEN** the transition SHALL be accepted

#### Scenario: Valid backward transition
- **WHEN** a task has status `IN_PROGRESS` and a transition to `TODO` is requested
- **THEN** the transition SHALL be accepted

#### Scenario: Invalid skip transition
- **WHEN** a task has status `TODO` and a transition to `DONE` is requested
- **THEN** the transition SHALL be rejected

#### Scenario: Terminal status has no outgoing transitions
- **WHEN** a task has status `DONE` and any transition is requested
- **THEN** the transition SHALL be rejected

#### Scenario: Blocked can only restore to TODO
- **WHEN** a task has status `BLOCKED` and a transition to `IN_PROGRESS` is requested
- **THEN** the transition SHALL be rejected

#### Scenario: Any active status can be blocked
- **WHEN** a task has status `IN_REVIEW` and a transition to `BLOCKED` is requested
- **THEN** the transition SHALL be accepted

### Requirement: Server validates transitions on task update API
The `PUT /api/tasks/:id` endpoint SHALL validate status transitions before persisting. When the request body includes a `status` field, the server SHALL fetch the task's current status and check the transition against the transition map.

#### Scenario: API accepts valid transition
- **WHEN** a PUT request sets status from `TODO` to `IN_PROGRESS`
- **THEN** the server SHALL return 200 with the updated task

#### Scenario: API rejects invalid transition with 422
- **WHEN** a PUT request sets status from `TODO` to `DONE`
- **THEN** the server SHALL return HTTP 422 with a JSON body containing `error` describing the invalid transition and `allowed` listing valid target statuses

#### Scenario: API allows non-status updates without transition check
- **WHEN** a PUT request updates only `title` (no `status` field)
- **THEN** the server SHALL NOT perform transition validation and SHALL return 200

### Requirement: Agent tools validate transitions
The `task_update` agent tool SHALL validate status transitions using the same transition map before executing the database update.

#### Scenario: Agent tool rejects invalid transition
- **WHEN** the `task_update` tool receives a status change from `TODO` to `DONE`
- **THEN** the tool SHALL return an error result with `isError: true` and a message describing the invalid transition and listing allowed statuses

#### Scenario: Agent tool accepts valid transition
- **WHEN** the `task_update` tool receives a status change from `TODO` to `IN_PROGRESS`
- **THEN** the tool SHALL perform the update and return a success result

### Requirement: Client uses transition map to constrain UI interactions
The Mission Control kanban board SHALL import the transition map and use it to constrain drag-and-drop and button interactions.

#### Scenario: Drag-and-drop highlights only valid columns
- **WHEN** a user begins dragging a task card with status `TODO`
- **THEN** only the `IN_PROGRESS` and `BLOCKED` columns SHALL be shown as valid drop targets; all other columns SHALL appear visually disabled

#### Scenario: Forward button shows correct next status
- **WHEN** a task has status `IN_PROGRESS`
- **THEN** the forward-arrow button SHALL advance it to `IN_REVIEW` (the first non-BLOCKED allowed transition)

#### Scenario: No forward button on terminal status
- **WHEN** a task has status `DONE`
- **THEN** no forward-arrow button SHALL be displayed

#### Scenario: Drop on invalid column is rejected
- **WHEN** a user drops a task card onto a column that is not a valid target
- **THEN** the task SHALL remain in its current column and the drop SHALL be ignored

### Requirement: Shared validation module
The transition map and validation function SHALL be defined in a single shared module (`lib/status-lifecycle.ts`) importable by both server (API routes, agent tools, DB layer) and client (React components) code.

#### Scenario: Module exports transition map
- **WHEN** `lib/status-lifecycle.ts` is imported
- **THEN** it SHALL export `TRANSITION_MAP` as `Record<TaskStatus, TaskStatus[]>`

#### Scenario: Module exports validation function
- **WHEN** `lib/status-lifecycle.ts` is imported
- **THEN** it SHALL export `validateTransition(from: TaskStatus, to: TaskStatus)` returning `{ valid: boolean; allowed: TaskStatus[]; message?: string }`

#### Scenario: Module exports helper to get allowed transitions
- **WHEN** `lib/status-lifecycle.ts` is imported
- **THEN** it SHALL export `getAllowedTransitions(from: TaskStatus): TaskStatus[]` returning the array of valid target statuses

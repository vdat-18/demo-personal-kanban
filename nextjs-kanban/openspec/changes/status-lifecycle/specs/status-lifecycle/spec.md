## ADDED Requirements

### Requirement: API validates status transitions
The `PUT /api/tasks/[id]` route SHALL validate status transitions using the existing `validateTransition()` function from `lib/status-lifecycle.ts`. When a request includes a `status` field change, the API MUST fetch the current task status and validate the transition before persisting.

#### Scenario: Valid transition accepted
- **WHEN** a PUT request changes status from TODO to IN_PROGRESS
- **THEN** the API returns 200 with the updated task

#### Scenario: Invalid transition rejected
- **WHEN** a PUT request changes status from TODO to DONE (skipping IN_PROGRESS and IN_REVIEW)
- **THEN** the API returns 422 with body `{ error: string, from: string, to: string, allowed: string[] }`

#### Scenario: No status change in request
- **WHEN** a PUT request updates only the title (no status field)
- **THEN** the API processes normally without transition validation

#### Scenario: Same status submitted
- **WHEN** a PUT request sets status to the same current value
- **THEN** the API returns 200 (no-op transitions are always valid)

### Requirement: Mission Control enforces valid drag targets
The Mission Control kanban board SHALL visually indicate and enforce valid drag-and-drop targets based on the current task's status.

#### Scenario: Dragging a TODO task
- **WHEN** user starts dragging a task with status TODO
- **THEN** only the DOING and CANCELLED columns are valid drop targets; REVIEW and DONE columns are visually dimmed with reduced opacity

#### Scenario: Dropping on invalid column
- **WHEN** user drops a task on a dimmed (invalid) column
- **THEN** the drop is rejected and the task returns to its original column

#### Scenario: Dragging a DONE task
- **WHEN** user starts dragging a task with status DONE
- **THEN** all columns are dimmed (no valid transitions from terminal state) and the drag is effectively disabled

### Requirement: Status buttons show only valid transitions
Status advancement buttons on task cards and in task chat SHALL only display valid next statuses.

#### Scenario: TODO task shows valid buttons
- **WHEN** viewing a task card with status TODO
- **THEN** only "Start" (→ IN_PROGRESS) and "Block" (→ BLOCKED) action buttons are shown

#### Scenario: BLOCKED task shows restore button
- **WHEN** viewing a task card with status BLOCKED
- **THEN** only a "Restore" (→ TODO) button is shown

#### Scenario: DONE task shows no buttons
- **WHEN** viewing a task card with status DONE
- **THEN** no status transition buttons are displayed (terminal state)

### Requirement: Frontend status mapping utility
A shared utility module SHALL provide bidirectional mapping between frontend statuses (todo, doing, review, done, cancelled) and database statuses (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED), plus transition-aware queries.

#### Scenario: Frontend to DB mapping
- **WHEN** `toDbStatus('doing')` is called
- **THEN** it returns `'IN_PROGRESS'`

#### Scenario: Allowed transitions in frontend terms
- **WHEN** `getAllowedFrontendTransitions('todo')` is called
- **THEN** it returns `['doing', 'cancelled']` (mapped from IN_PROGRESS, BLOCKED)

#### Scenario: Unknown status handling
- **WHEN** `toDbStatus('unknown')` is called with an invalid status
- **THEN** it throws a TypeError

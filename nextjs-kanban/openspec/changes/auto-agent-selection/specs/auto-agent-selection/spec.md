# Spec: Auto Agent Selection

## REQ-1: Auto-select agent on mount

The system SHALL auto-select the agent mapped to the current task status when the task chat opens.

### Scenario 1.1: Chat opens for a TODO task

- **WHEN** the user opens TaskChatClient for a task with status `todo`
- **THEN** the agent dropdown SHALL be pre-selected to "Planner Agent" (role: `architect`)
- **AND** the chat session SHALL use the architect agent configuration

### Scenario 1.2: Chat opens for a DOING task

- **WHEN** the user opens TaskChatClient for a task with status `doing`
- **THEN** the agent dropdown SHALL be pre-selected to "Doer Agent" (role: `developer`)

### Scenario 1.3: Chat opens for a REVIEW task

- **WHEN** the user opens TaskChatClient for a task with status `review`
- **THEN** the agent dropdown SHALL be pre-selected to "Reviewer Agent" (role: `reviewer`)

### Scenario 1.4: Chat opens for a DONE task

- **WHEN** the user opens TaskChatClient for a task with status `done`
- **THEN** the agent dropdown SHALL be pre-selected to "Reporter Agent" (role: `reporter`)

---

## REQ-2: Auto-switch agent on status change

The system SHALL auto-switch the selected agent when the user changes the task status within the chat interface.

### Scenario 2.1: Status changes from TODO to DOING

- **WHEN** the user changes the task status from `todo` to `doing` via the status buttons in chat
- **THEN** the agent dropdown SHALL automatically switch to "Doer Agent" (role: `developer`)
- **AND** subsequent messages SHALL be handled by the developer agent

### Scenario 2.2: Status changes from DOING to REVIEW

- **WHEN** the user changes the task status from `doing` to `review`
- **THEN** the agent dropdown SHALL automatically switch to "Reviewer Agent" (role: `reviewer`)

### Scenario 2.3: Status changes from REVIEW to DONE

- **WHEN** the user changes the task status from `review` to `done`
- **THEN** the agent dropdown SHALL automatically switch to "Reporter Agent" (role: `reporter`)

---

## REQ-3: Manual override

The user SHALL be able to override the auto-selected agent via the existing dropdown. The override persists until the task status changes or the page is reloaded.

### Scenario 3.1: User overrides auto-selected agent

- **WHEN** the system auto-selects "Planner Agent" for a `todo` task
- **AND** the user manually selects "Doer Agent" from the dropdown
- **THEN** the chat session SHALL use the developer agent configuration
- **AND** the dropdown SHALL remain on "Doer Agent"

### Scenario 3.2: Override resets on status change

- **WHEN** the user has manually overridden the agent selection
- **AND** the user changes the task status
- **THEN** the agent SHALL auto-switch to match the new status, clearing the override

### Scenario 3.3: Override resets on page reload

- **WHEN** the user has manually overridden the agent selection
- **AND** the user reloads the page
- **THEN** the agent SHALL be auto-selected based on the current task status

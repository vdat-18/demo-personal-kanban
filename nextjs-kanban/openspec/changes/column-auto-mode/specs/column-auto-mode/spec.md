## ADDED Requirements

### Requirement: Per-column auto-mode toggle
The system SHALL provide an auto-mode toggle button in the column header of each actionable column (TODO, IN_PROGRESS, IN_REVIEW). DONE and BLOCKED columns SHALL NOT have an auto-mode toggle.

#### Scenario: Toggle auto mode on
- **WHEN** user clicks the auto-mode toggle on a column that is currently disabled
- **THEN** the toggle switches to the enabled state, the column header shows an active auto-mode indicator, and the system begins processing tasks in that column

#### Scenario: Toggle auto mode off
- **WHEN** user clicks the auto-mode toggle on a column that is currently enabled
- **THEN** the toggle switches to the disabled state, the system finishes processing the current task (if any) and stops picking up new tasks in that column

#### Scenario: DONE and BLOCKED columns have no toggle
- **WHEN** the mission-control board renders
- **THEN** the DONE and BLOCKED columns SHALL NOT display an auto-mode toggle

### Requirement: Agent-column mapping
The system SHALL map each actionable column to a specific agent role: TODO maps to architect (Planner Agent), IN_PROGRESS maps to developer (Doer Agent), IN_REVIEW maps to reviewer (Reviewer Agent).

#### Scenario: TODO column dispatches architect agent
- **WHEN** auto mode processes a task in the TODO column
- **THEN** the system dispatches the architect agent with a planning-focused default prompt

#### Scenario: IN_PROGRESS column dispatches developer agent
- **WHEN** auto mode processes a task in the IN_PROGRESS column
- **THEN** the system dispatches the developer agent with an implementation-focused default prompt

#### Scenario: IN_REVIEW column dispatches reviewer agent
- **WHEN** auto mode processes a task in the IN_REVIEW column
- **THEN** the system dispatches the reviewer agent with a review-focused default prompt

### Requirement: Sequential task processing
The system SHALL process tasks one at a time per column. The system SHALL pick up the oldest task (by creation date) in the column first.

#### Scenario: Multiple tasks in auto-enabled column
- **WHEN** auto mode is enabled on a column containing 3 tasks
- **THEN** the system processes the oldest task first, waits for completion, then processes the next oldest, and so on

#### Scenario: No tasks in auto-enabled column
- **WHEN** auto mode is enabled on a column with no tasks
- **THEN** the system remains in an idle state, displaying "Auto: Idle" until a task appears in the column

### Requirement: Automatic status advancement
Upon successful agent completion, the system SHALL automatically advance the task to the next valid status as defined by the status lifecycle TRANSITION_MAP.

#### Scenario: Task advances after successful agent run
- **WHEN** an agent completes processing a TODO task successfully
- **THEN** the task status is automatically updated to IN_PROGRESS

#### Scenario: IN_REVIEW task advances to DONE
- **WHEN** an agent completes processing an IN_REVIEW task successfully
- **THEN** the task status is automatically updated to DONE

### Requirement: Auto-processing visual indicator on task cards
Tasks currently being processed by auto mode SHALL display a visual indicator on their card in the mission-control board.

#### Scenario: Task card shows processing state
- **WHEN** auto mode is actively running an agent on a task
- **THEN** the task card displays a pulsing indicator and the card's drag behavior is disabled

#### Scenario: Task card returns to normal after processing
- **WHEN** auto mode finishes processing a task (success or failure)
- **THEN** the task card removes the processing indicator and re-enables normal interactions

### Requirement: Column auto-mode status indicator
Each auto-enabled column SHALL display a status indicator showing the current processing state.

#### Scenario: Column shows idle state
- **WHEN** auto mode is enabled but no task is currently being processed
- **THEN** the column header displays an "Auto: Idle" indicator

#### Scenario: Column shows processing state
- **WHEN** auto mode is actively processing a task
- **THEN** the column header displays "Auto: Running" with the name of the active task

#### Scenario: Column shows disabled state
- **WHEN** auto mode is disabled on a column
- **THEN** no auto-mode status indicator is displayed (only the toggle button)

### Requirement: Error handling stops auto mode
The system SHALL stop auto-mode processing on a column when an agent run encounters an error. The failed task SHALL remain in its current column and status.

#### Scenario: Agent stream error stops auto mode
- **WHEN** an agent run fails with a stream error during auto-mode processing
- **THEN** auto mode is disabled on that column, the task remains in its current status, and an error indicator is shown on the column

#### Scenario: Failed task retains status
- **WHEN** auto mode encounters an error processing a task
- **THEN** the task stays in its current column with its current status unchanged

### Requirement: Conversation persistence for auto-mode runs
Auto-mode agent runs SHALL persist conversations to the database identically to manual chat interactions, using the existing `/api/agents/stream` endpoint.

#### Scenario: Auto-mode conversation is saved
- **WHEN** an auto-mode agent run completes successfully
- **THEN** the conversation (messages, result, token usage) is persisted to the database and associated with the task

### Requirement: Drag protection during auto-processing
Tasks currently being auto-processed SHALL NOT be draggable to prevent conflicts between manual and automatic status changes.

#### Scenario: User attempts to drag auto-processing task
- **WHEN** a user tries to drag a task card that is currently being processed by auto mode
- **THEN** the drag operation is prevented and the card remains in place

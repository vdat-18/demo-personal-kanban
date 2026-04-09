## ADDED Requirements

### Requirement: AI receives full task list in planning prompts
The system SHALL include the current project's task list in every planning AI prompt. The task context MUST include each task's title, status, priority, and description (truncated if necessary).

#### Scenario: AI prompt includes existing tasks
- **WHEN** a user sends a message in the planning chat
- **THEN** the AI prompt sent to the backend includes a section listing all current project tasks with their title, status, and priority

#### Scenario: AI is aware of task count and statuses
- **WHEN** the project has tasks in various statuses (TODO, IN_PROGRESS, DONE)
- **THEN** the AI prompt groups or labels tasks by status so the AI can reason about project progress

### Requirement: AI prompt includes task-mutation instructions
The system SHALL instruct the AI that it can propose task mutations (add, update, delete) by embedding a `task-mutations` fenced code block in its response.

#### Scenario: AI proposes adding a new task
- **WHEN** the user discusses a new feature and the AI determines a task should be created
- **THEN** the AI response includes a `task-mutations` block with an `add` action containing the proposed title and description

#### Scenario: AI proposes updating an existing task
- **WHEN** the user discusses changing a task's status or priority
- **THEN** the AI response includes a `task-mutations` block with an `update` action referencing the task ID and the fields to change

#### Scenario: AI proposes deleting a task
- **WHEN** the user indicates a task is no longer needed
- **THEN** the AI response includes a `task-mutations` block with a `delete` action referencing the task ID and a reason

### Requirement: Frontend parses task-mutation blocks
The system SHALL parse `task-mutations` fenced code blocks from AI responses and render them as interactive action cards within the chat message.

#### Scenario: Mutation block renders as action cards
- **WHEN** the AI response contains a valid `task-mutations` code block
- **THEN** the frontend extracts the JSON, hides the raw code block, and renders each proposed mutation as a card with an "Approve" button and details

#### Scenario: Invalid mutation block falls back gracefully
- **WHEN** the AI response contains a `task-mutations` block that fails JSON parsing
- **THEN** the frontend renders the AI response as regular markdown without action cards, and no error is shown to the user

### Requirement: User can approve or dismiss task mutations
The system SHALL provide approve/dismiss controls for each AI-proposed task mutation. Approving a mutation executes the corresponding API call (create, update, or delete task).

#### Scenario: Approving an add mutation creates the task
- **WHEN** the user clicks "Approve" on an add-task mutation card
- **THEN** the system calls `POST /api/tasks` with the proposed title, description, and projectId, and the new task appears in the right-hand task panel

#### Scenario: Approving an update mutation updates the task
- **WHEN** the user clicks "Approve" on an update-task mutation card
- **THEN** the system calls `PUT /api/tasks/[id]` with the proposed field changes, and the task panel reflects the update

#### Scenario: Approving a delete mutation removes the task
- **WHEN** the user clicks "Approve" on a delete-task mutation card
- **THEN** the system calls `DELETE /api/tasks/[id]`, and the task disappears from the task panel

#### Scenario: Dismissing a mutation does nothing
- **WHEN** the user clicks "Dismiss" on a mutation card
- **THEN** the card is visually marked as dismissed and no API call is made

### Requirement: Task prompt context respects size limits
The system SHALL limit the task context injected into AI prompts to a maximum of 50 tasks. If the project has more than 50 tasks, the system SHALL include the 50 most recently updated tasks and add a summary note about omitted tasks.

#### Scenario: Large project truncates task context
- **WHEN** a project has 80 tasks
- **THEN** the AI prompt includes the 50 most recently updated tasks and a note: "Showing 50 of 80 tasks (most recently updated)"

### Requirement: Chat history included in AI prompt
The system SHALL include recent messages from the current thread in the AI prompt for conversational continuity. The system MUST include at least the last 20 messages (or all messages if fewer than 20 exist).

#### Scenario: AI has conversation context
- **WHEN** a user sends the 5th message in a thread
- **THEN** the AI prompt includes all 4 previous messages (both user and assistant) for context

#### Scenario: Long threads are truncated
- **WHEN** a thread has 50 messages and the user sends a new one
- **THEN** the AI prompt includes the most recent 20 messages to stay within token limits

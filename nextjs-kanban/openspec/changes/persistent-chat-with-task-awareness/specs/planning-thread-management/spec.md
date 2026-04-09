## ADDED Requirements

### Requirement: Thread list sidebar in planning view
The system SHALL display a thread-list sidebar on the left side of the planning view, showing all threads for the current project. The layout MUST be: `[Thread List] | [Chat] | [Tasks]`.

#### Scenario: Sidebar shows all threads
- **WHEN** the user navigates to the planning page for a project
- **THEN** the sidebar displays all threads for that project, ordered by most recently updated first, with each entry showing the thread title and a timestamp

#### Scenario: Active thread is highlighted
- **WHEN** a thread is currently selected
- **THEN** it MUST be visually distinguished from other threads in the sidebar

### Requirement: User can start a new chat thread
The system SHALL provide a "New Thread" button in the thread sidebar. Creating a new thread starts a fresh conversation with no prior messages, while all existing threads remain accessible.

#### Scenario: New thread button creates empty thread
- **WHEN** the user clicks "New Thread"
- **THEN** the system creates a new `PlanningThread` in the database, switches the chat panel to the new empty thread, and the AI sends an initial welcome message

#### Scenario: Previous threads remain accessible
- **WHEN** the user creates a new thread
- **THEN** all previous threads remain listed in the sidebar and can be selected to view their messages

### Requirement: User can switch between threads
The system SHALL allow users to click on any thread in the sidebar to switch the chat panel to that thread's messages.

#### Scenario: Switching loads persisted messages
- **WHEN** the user clicks on a different thread in the sidebar
- **THEN** the chat panel loads and displays all messages from that thread from the database

#### Scenario: Current input is not lost on switch
- **WHEN** the user has typed (but not sent) a message and switches threads
- **THEN** the unsent input is discarded (no draft persistence required in v1)

### Requirement: Task panel always visible
The task panel on the right side of the planning view SHALL always display the current project's tasks regardless of which thread is active. The task list MUST reflect real-time changes (tasks added, updated, or deleted during the session).

#### Scenario: Tasks visible across all threads
- **WHEN** the user switches between different planning threads
- **THEN** the right-hand task panel continues showing the same project tasks

#### Scenario: Tasks update in real-time after mutation
- **WHEN** the user approves an AI-suggested task addition from the chat
- **THEN** the task panel immediately shows the new task without requiring a page refresh

### Requirement: Thread can be deleted
The system SHALL allow users to delete a thread from the sidebar. Deletion MUST cascade to all messages in that thread.

#### Scenario: Delete thread with confirmation
- **WHEN** the user clicks the delete action on a thread
- **THEN** the system shows a confirmation prompt; if confirmed, the thread and all its messages are deleted, and the user is switched to the most recent remaining thread (or a new empty thread if none remain)

### Requirement: Auto-create first thread on planning page load
The system SHALL automatically create a thread if the user navigates to a project's planning page and no threads exist yet.

#### Scenario: First visit auto-creates thread
- **WHEN** the user navigates to `/planning/[projectId]` and the project has no planning threads
- **THEN** the system automatically creates a new thread and displays it with the AI welcome message

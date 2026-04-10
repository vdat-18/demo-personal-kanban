# Spec: Reporter Agent

## REQ-1: Reporter agent role

The system SHALL support a `reporter` agent role that summarizes completed task work.

### Scenario 1.1: Reporter role is recognized by the backend

- **WHEN** a chat request is sent with role `reporter`
- **THEN** the system SHALL route the request to the Reporter agent configuration
- **AND** the Reporter agent SHALL use the `gpt-4o-mini` model
- **AND** the Reporter agent SHALL have read-only access via the `db_query` tool

### Scenario 1.2: Reporter agent produces structured summaries

- **WHEN** the Reporter agent processes a task
- **THEN** it SHALL produce a structured markdown summary
- **AND** the summary SHALL include sections for: work completed, key decisions, and task lifecycle insights

---

## REQ-2: Auto-summary on completion

When a task transitions to DONE, the system SHALL asynchronously trigger a Reporter agent run to generate a summary.

### Scenario 2.1: Task transitions to DONE

- **WHEN** a task status is updated to `done` via `PUT /api/tasks/[id]`
- **THEN** the system SHALL trigger a Reporter agent run asynchronously (fire-and-forget)
- **AND** the API response SHALL return immediately without waiting for the summary to complete

### Scenario 2.2: Reporter agent run saves a conversation

- **WHEN** the Reporter agent completes its summary generation
- **THEN** the result SHALL be saved as a Conversation record
- **AND** the conversation SHALL be tagged with a special marker to distinguish it from regular chat conversations

### Scenario 2.3: Task transitions to non-DONE status

- **WHEN** a task status is updated to any status other than `done`
- **THEN** the system SHALL NOT trigger a Reporter agent run

---

## REQ-3: Summary display

The Summary page SHALL display the Reporter agent's output instead of placeholder content.

### Scenario 3.1: Summary page for a DONE task with a reporter conversation

- **WHEN** the user navigates to `/summary/[id]` for a task that has a reporter-generated conversation
- **THEN** the page SHALL display the structured markdown summary from the Reporter agent
- **AND** the placeholder "AI Insights" content SHALL be replaced

### Scenario 3.2: Summary page for a task without a reporter conversation

- **WHEN** the user navigates to `/summary/[id]` for a task that has no reporter-generated conversation
- **THEN** the page SHALL display a message indicating that no summary is available yet

### Scenario 3.3: Summary page while reporter is still generating

- **WHEN** the user navigates to `/summary/[id]` while the Reporter agent is still generating
- **THEN** the page SHALL display the placeholder or a loading indicator
- **AND** the page SHALL show the summary once it becomes available (on refresh or via polling)

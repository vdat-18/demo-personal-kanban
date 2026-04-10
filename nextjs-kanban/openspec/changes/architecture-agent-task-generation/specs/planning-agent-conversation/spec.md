## ADDED Requirements

### Requirement: Planning UI exposes Generate Tasks action
The `PlanningClient` component SHALL include a clearly visible "Generate Tasks" button in the task panel header area that triggers the architect-task-generation flow using the accumulated conversation state.

#### Scenario: Button placement and visibility
- **WHEN** the Planning UI is rendered
- **THEN** a "Generate Tasks" button SHALL appear alongside the existing "Add Task" button in the right panel header

#### Scenario: Button enabled after user interaction
- **WHEN** the user has sent at least one message in the planning conversation
- **THEN** the "Generate Tasks" button SHALL become enabled and clickable

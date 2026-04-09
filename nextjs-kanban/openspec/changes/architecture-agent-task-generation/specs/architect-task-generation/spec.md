## ADDED Requirements

### Requirement: Generate tasks prompt builder
The system SHALL provide a `buildGenerateTasksPrompt(messages, projectId)` function in `lib/agents/prompts.ts` that assembles a prompt containing the full conversation history and project context, instructing the architect agent to return a JSON array of task objects with `title` (string, required) and `description` (string, optional).

#### Scenario: Prompt includes full conversation
- **WHEN** `buildGenerateTasksPrompt` is called with an array of chat messages and a valid projectId
- **THEN** the returned prompt string SHALL contain every message from the array (role + content), the project name, existing tasks, and explicit instructions to respond with a JSON code-fenced array of `{ title, description }` objects

#### Scenario: Project not found
- **WHEN** `buildGenerateTasksPrompt` is called with a projectId that does not exist in the database
- **THEN** the function SHALL throw an Error with the message `Project <id> not found`

### Requirement: Generate tasks API route
The system SHALL expose a `POST /api/agents/generate-tasks` endpoint that accepts `{ projectId: string, messages: Array<{ role: string, content: string }> }`, runs the architect agent, parses the structured task list from the response, and bulk-creates the tasks in the database linked to the given project.

#### Scenario: Successful task generation
- **WHEN** a valid POST request is sent with a projectId and at least one message
- **THEN** the endpoint SHALL return HTTP 200 with `{ tasks: Array<{ id, title, description, status, priority, projectId }> }` containing all newly created tasks

#### Scenario: Invalid request body
- **WHEN** the request body fails Zod validation (missing projectId, empty messages array, etc.)
- **THEN** the endpoint SHALL return HTTP 400 with `{ error: "Validation failed", details: [...] }`

#### Scenario: AI response cannot be parsed as JSON
- **WHEN** the architect agent returns a response that does not contain a valid JSON array of tasks
- **THEN** the endpoint SHALL return HTTP 422 with `{ error: "Failed to parse tasks from AI response" }`

#### Scenario: Project does not exist
- **WHEN** the projectId does not correspond to an existing project
- **THEN** the endpoint SHALL return HTTP 404 with `{ error: "Project not found" }`

### Requirement: Batch task creation helper
The system SHALL provide a `createTasksBatch(tasks, projectId)` function in `lib/db/tasks.ts` that creates multiple tasks in a single Prisma transaction, each linked to the given project with default status `TODO` and priority `MEDIUM`.

#### Scenario: All tasks created atomically
- **WHEN** `createTasksBatch` is called with an array of `{ title, description }` objects and a valid projectId
- **THEN** all tasks SHALL be created in the database within a single transaction and the function SHALL return the array of created task records

#### Scenario: Empty array
- **WHEN** `createTasksBatch` is called with an empty array
- **THEN** the function SHALL return an empty array without executing a database transaction

### Requirement: Generate Tasks button in Planning UI
The `PlanningClient` component SHALL display a "Generate Tasks" action button that sends the current conversation history to `POST /api/agents/generate-tasks` and populates the right-side task panel with the returned tasks.

#### Scenario: User clicks Generate Tasks after conversation
- **WHEN** the user has exchanged at least one message with the planning agent and clicks "Generate Tasks"
- **THEN** the frontend SHALL send the full `messages` array and `projectId` to `/api/agents/generate-tasks`, disable the button during the request, and append the returned tasks to the task panel

#### Scenario: Button disabled during generation
- **WHEN** a generate-tasks request is in flight
- **THEN** the "Generate Tasks" button SHALL be disabled and display a loading indicator

#### Scenario: Generation fails
- **WHEN** the API returns an error response
- **THEN** the frontend SHALL display an error message to the user and re-enable the button

#### Scenario: No conversation yet
- **WHEN** the messages array contains only the initial assistant welcome message
- **THEN** the "Generate Tasks" button SHALL be disabled (no user messages to generate from)

### Requirement: Zod validation schema for generate-tasks
The system SHALL provide a `generateTasksSchema` in `lib/validations/schemas.ts` that validates the request body with `projectId` as a UUID string and `messages` as a non-empty array of objects each containing `role` (enum: user | assistant) and `content` (non-empty string, max 50000 chars).

#### Scenario: Valid input passes
- **WHEN** a request body with a valid UUID projectId and a non-empty messages array is validated
- **THEN** the schema SHALL return the parsed data without errors

#### Scenario: Missing projectId rejected
- **WHEN** a request body without projectId is validated
- **THEN** the schema SHALL return a validation error indicating projectId is required

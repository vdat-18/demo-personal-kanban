## ADDED Requirements

### Requirement: Planning messages persist to database
The system SHALL store every planning chat message as an individual `PlanningMessage` record in the database, linked to a `PlanningThread`. Messages MUST survive page refreshes, browser restarts, and session changes.

#### Scenario: Message survives page refresh
- **WHEN** a user sends a message in the planning chat and then refreshes the page
- **THEN** all previously sent and received messages are loaded from the database and displayed in the chat

#### Scenario: New message is appended incrementally
- **WHEN** a user sends a message in an existing thread
- **THEN** the system creates a new `PlanningMessage` row with the user's content and role `user`, and a second row with the AI response and role `assistant`, without rewriting existing messages

### Requirement: PlanningThread model exists
The system SHALL provide a `PlanningThread` Prisma model with fields: `id` (UUID, primary key), `projectId` (FK to Project), `title` (string, auto-generated or user-provided), `createdAt`, and `updatedAt`.

#### Scenario: Thread is linked to a project
- **WHEN** a planning thread is created
- **THEN** it MUST have a valid `projectId` referencing an existing Project

#### Scenario: Thread has a default title
- **WHEN** a thread is created without an explicit title
- **THEN** the system SHALL generate a default title based on the first user message (truncated to 80 characters)

### Requirement: PlanningMessage model exists
The system SHALL provide a `PlanningMessage` Prisma model with fields: `id` (UUID, primary key), `threadId` (FK to PlanningThread), `role` (enum: `user`, `assistant`, `system`), `content` (text), `tokenUsage` (JSON, nullable), and `createdAt`.

#### Scenario: Messages are ordered chronologically
- **WHEN** messages are loaded for a thread
- **THEN** they MUST be returned ordered by `createdAt` ascending

### Requirement: API routes for planning thread CRUD
The system SHALL expose RESTful API routes for managing planning threads and messages.

#### Scenario: List threads for a project
- **WHEN** a GET request is made to `/api/planning-threads?projectId=<id>`
- **THEN** the system returns all threads for that project, ordered by `updatedAt` descending, with the last message preview included

#### Scenario: Create a new thread
- **WHEN** a POST request is made to `/api/planning-threads` with `{ projectId }`
- **THEN** the system creates a new `PlanningThread` and returns it with status 201

#### Scenario: Get messages for a thread
- **WHEN** a GET request is made to `/api/planning-threads/[id]/messages`
- **THEN** the system returns all `PlanningMessage` records for that thread, ordered by `createdAt` ascending

#### Scenario: Send a message and get AI response
- **WHEN** a POST request is made to `/api/planning-threads/[id]/messages` with `{ content }`
- **THEN** the system creates a user message row, calls the AI planning agent, creates an assistant message row with the response, and returns both messages

#### Scenario: Delete a thread
- **WHEN** a DELETE request is made to `/api/planning-threads/[id]`
- **THEN** the system deletes the thread and all its messages (cascade) and returns status 204

### Requirement: Input validation on all API routes
The system SHALL validate all inputs using Zod schemas. Invalid requests MUST return a 400 status with validation error details.

#### Scenario: Missing projectId on thread creation
- **WHEN** a POST to `/api/planning-threads` omits `projectId`
- **THEN** the system returns 400 with a Zod validation error

#### Scenario: Invalid UUID format
- **WHEN** any route receives a malformed UUID parameter
- **THEN** the system returns 400 with a validation error

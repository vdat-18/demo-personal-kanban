## ADDED Requirements

### Requirement: KanbanTools provides task CRUD operations as Agno tools
A custom Agno `Toolkit` class `KanbanTools` SHALL expose task operations (list, create, update, delete) as tools that Agno agents can invoke. Each tool MUST call the Next.js API via HTTP to perform the operation.

#### Scenario: List tasks
- **WHEN** an Agno agent calls `get_tasks(project_id="uuid", status="TODO")`
- **THEN** the tool sends `GET /api/tasks?projectId=uuid&status=TODO` to the Next.js API and returns the task list as a formatted string

#### Scenario: Create task
- **WHEN** an Agno agent calls `create_task(title="Review PDF report", description="...", project_id="uuid", priority="HIGH")`
- **THEN** the tool sends `POST /api/tasks` to the Next.js API with the task data and returns the created task details

#### Scenario: Update task status
- **WHEN** an Agno agent calls `update_task(task_id="uuid", status="DOING")`
- **THEN** the tool sends `PATCH /api/tasks/uuid` to the Next.js API and returns the updated task

#### Scenario: Delete task
- **WHEN** an Agno agent calls `delete_task(task_id="uuid")`
- **THEN** the tool sends `DELETE /api/tasks/uuid` to the Next.js API and returns confirmation

### Requirement: KanbanTools provides project operations
The `KanbanTools` class SHALL also expose project operations (list, create) as tools.

#### Scenario: List projects
- **WHEN** an Agno agent calls `get_projects()`
- **THEN** the tool sends `GET /api/projects` to the Next.js API and returns the project list

#### Scenario: Create project
- **WHEN** an Agno agent calls `create_project(name="Q3 Marketing Campaign", description="...")`
- **THEN** the tool sends `POST /api/projects` to the Next.js API and returns the created project details

### Requirement: KanbanTools handles API errors gracefully
The `KanbanTools` MUST handle HTTP errors from the Next.js API without crashing the agent. Errors SHALL be returned as descriptive strings that the agent can reason about.

#### Scenario: Next.js API returns 404
- **WHEN** `update_task(task_id="nonexistent")` is called and the API returns 404
- **THEN** the tool returns `"Error: Task 'nonexistent' not found"` as a string (no exception thrown)

#### Scenario: Next.js API is unreachable
- **WHEN** any kanban tool is called and the Next.js API connection times out
- **THEN** the tool returns `"Error: Could not connect to kanban service. The task management system is temporarily unavailable."` as a string

### Requirement: KanbanTools configures API base URL from environment
The `KanbanTools` class MUST accept the Next.js API base URL via constructor parameter or environment variable `NEXTJS_API_URL`.

#### Scenario: URL from environment
- **WHEN** `NEXTJS_API_URL=http://nextjs:3000/api` is set
- **THEN** all KanbanTools HTTP calls use `http://nextjs:3000/api` as the base URL

#### Scenario: URL from constructor
- **WHEN** `KanbanTools(api_base="http://localhost:3000/api")` is instantiated
- **THEN** the constructor parameter takes precedence over the environment variable

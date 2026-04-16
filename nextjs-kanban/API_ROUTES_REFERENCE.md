# Next.js Kanban API Routes - Complete Reference

Generated: 2026-04-15
Purpose: KanbanTools implementation guide - exact HTTP methods, URL patterns, request/response shapes, and validation rules.

---

## TABLE OF CONTENTS

1. [Tasks API](#tasks-api)
2. [Projects API](#projects-api)
3. [Validation Schemas](#validation-schemas)
4. [Status Lifecycle & Transitions](#status-lifecycle--transitions)
5. [Error Handling](#error-handling)
6. [Environment Configuration](#environment-configuration)

---

## TASKS API

### Base URL: `/api/tasks`

#### 1. LIST TASKS
**File:** `app/api/tasks/route.ts`

```
GET /api/tasks
```

**Query Parameters:**
```typescript
{
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'  // optional
  projectId?: UUID  // optional
}
```

**Response (200 OK):**
```typescript
Task[]  // Array of Task objects, ordered by createdAt DESC

interface Task {
  id: string (UUID)
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  projectId: string (UUID) | null
  createdAt: DateTime
  updatedAt: DateTime
  project: Project | null
  conversations: Conversation[]
  subtasks: Subtask[]
}
```

**Error Responses:**
- 400: Validation error (invalid status)
- 500: Internal server error

---

#### 2. CREATE TASK
**File:** `app/api/tasks/route.ts`

```
POST /api/tasks
```

**Request Body:**
```typescript
{
  title: string                    // required, 1-500 chars
  description?: string             // optional, max 5000 chars
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'  // optional, defaults to 'TODO'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'  // optional, defaults to 'MEDIUM'
  projectId?: UUID                 // optional
}
```

**Response (201 Created):**
```typescript
Task  // Same as above
```

**Error Responses:**
- 400: Validation error (missing/invalid fields)
- 500: Database error

---

#### 3. GET TASK BY ID
**File:** `app/api/tasks/[id]/route.ts`

```
GET /api/tasks/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Response (200 OK):**
```typescript
Task  // Includes: project, conversations, subtasks
```

**Error Responses:**
- 404: Task not found
- 500: Internal server error

---

#### 4. UPDATE TASK
**File:** `app/api/tasks/[id]/route.ts`

```
PUT /api/tasks/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Request Body:**
```typescript
{
  title?: string                   // optional, 1-500 chars
  description?: string | null      // optional, max 5000 chars, null to clear
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'  // optional
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'  // optional
  projectId?: UUID | null          // optional, null to unlink
}
```

**Important:** Status transitions are validated. Invalid transitions return 422 error.

**Response (200 OK):**
```typescript
Task
```

**Error Responses:**
- 400: Validation error
- 404: Task not found
- 422: Invalid status transition (includes allowed transitions)
  ```json
  {
    "error": "Invalid transition: TODO → DONE. Allowed transitions from TODO: IN_PROGRESS, BLOCKED.",
    "from": "TODO",
    "to": "DONE",
    "allowed": ["IN_PROGRESS", "BLOCKED"]
  }
  ```
- 500: Internal server error

---

#### 5. DELETE TASK
**File:** `app/api/tasks/[id]/route.ts`

```
DELETE /api/tasks/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Response (200 OK):**
```json
{ "success": true }
```

**Error Responses:**
- 404: Task not found
- 500: Internal server error

---

#### 6. UPDATE SUBTASK
**File:** `app/api/tasks/[id]/subtasks/[subtaskId]/route.ts`

```
PUT /api/tasks/:id/subtasks/:subtaskId
```

**URL Parameters:**
```typescript
{
  id: UUID           // parent task ID (required)
  subtaskId: UUID    // subtask ID (required)
}
```

**Request Body:**
```typescript
{
  title?: string     // optional, update subtask title
  completed?: boolean // optional, mark as complete/incomplete
}
```

**Response (200 OK):**
```typescript
{
  id: UUID
  title: string
  description: string | null
  completed: boolean
  output: string | null
  taskId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Error Responses:**
- 404: Subtask not found or belongs to another task
- 500: Internal server error

---

#### 7. AUTO-BREAKDOWN TASKS
**File:** `app/api/tasks/auto-breakdown/route.ts`

```
POST /api/tasks/auto-breakdown
```

**Request Body:**
```typescript
{
  projectId: UUID  // required
}
```

**Process:**
1. Fetches all TODO tasks in project with no existing subtasks
2. Retrieves project's vision document from latest planning thread
3. Uses AI Architect agent to generate 3-5 subtasks per task
4. Creates subtasks in database via transaction

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3  // number of tasks broken down
}
```

**Error Responses:**
- 400: Missing projectId
- 404: Project not found
- 500: AI generation error or database error

---

## PROJECTS API

### Base URL: `/api/projects`

#### 1. LIST PROJECTS
**File:** `app/api/projects/route.ts`

```
GET /api/projects
```

**Query Parameters:** None

**Response (200 OK):**
```typescript
Project[]  // Array of Project objects, ordered by createdAt DESC

interface Project {
  id: string (UUID)
  name: string
  description: string | null
  domain: 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'
  createdAt: DateTime
  updatedAt: DateTime
  tasks: Task[]
  planningThreads: PlanningThread[]
}
```

**Error Responses:**
- 500: Internal server error

---

#### 2. CREATE PROJECT
**File:** `app/api/projects/route.ts`

```
POST /api/projects
```

**Request Body:**
```typescript
{
  name: string                                              // required, 1-200 chars
  description?: string                                      // optional, max 2000 chars
  domain?: 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'  // optional, defaults to 'SOFTWARE_ENGINEERING'
}
```

**Response (201 Created):**
```typescript
Project  // As defined above
```

**Error Responses:**
- 400: Validation error (missing/invalid fields)
- 500: Database error

---

#### 3. GET PROJECT BY ID
**File:** `app/api/projects/[id]/route.ts`

```
GET /api/projects/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Response (200 OK):**
```typescript
Project  // Includes: tasks
```

**Error Responses:**
- 404: Project not found
- 500: Internal server error

---

#### 4. UPDATE PROJECT
**File:** `app/api/projects/[id]/route.ts`

```
PUT /api/projects/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Request Body:**
```typescript
{
  name?: string              // optional, 1-200 chars
  description?: string | null // optional, max 2000 chars, null to clear
  status?: string            // optional, max 50 chars
}
```

**Response (200 OK):**
```typescript
Project
```

**Error Responses:**
- 400: Validation error
- 404: Project not found
- 500: Internal server error

---

#### 5. DELETE PROJECT
**File:** `app/api/projects/[id]/route.ts`

```
DELETE /api/projects/:id
```

**URL Parameters:**
```typescript
{
  id: UUID  // required
}
```

**Response (200 OK):**
```json
{ "success": true }
```

**Note:** Cascading delete - all related tasks, subtasks, conversations, and planning threads are also deleted.

**Error Responses:**
- 404: Project not found
- 500: Internal server error

---

## VALIDATION SCHEMAS

All validation uses Zod schemas defined in `lib/validations/schemas.ts`

### Task Schemas

#### taskStatusSchema
```typescript
z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'])
```

#### taskPrioritySchema
```typescript
z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
```

#### createTaskSchema
```typescript
{
  title: string                    // min 1, max 500
  description?: string             // max 5000
  status?: enum               // default 'TODO'
  priority?: enum             // default 'MEDIUM'
  projectId?: UUID            // optional
}
```

#### updateTaskSchema
```typescript
{
  title?: string              // min 1, max 500
  description?: string | null // max 5000
  status?: enum               // optional
  priority?: enum             // optional
  projectId?: UUID | null     // optional
}
```

### Project Schemas

#### projectDomainSchema
```typescript
z.enum([
  'SOFTWARE_ENGINEERING',
  'MARKETING',
  'SALES',
  'LOGISTICS',
])
```

#### createProjectSchema
```typescript
{
  name: string              // min 1, max 200
  description?: string      // max 2000
  domain?: enum             // default 'SOFTWARE_ENGINEERING'
}
```

#### updateProjectSchema
```typescript
{
  name?: string             // min 1, max 200
  description?: string | null // max 2000
  status?: string           // max 50
}
```

---

## STATUS LIFECYCLE & TRANSITIONS

**File:** `lib/status-lifecycle.ts`

### Valid Status Transitions

```
TODO        → IN_PROGRESS, BLOCKED
IN_PROGRESS → IN_REVIEW, TODO, BLOCKED
IN_REVIEW   → DONE, IN_PROGRESS, BLOCKED
DONE        → (no transitions - terminal)
BLOCKED     → TODO (restore only)
```

### Transition Validation

When updating a task's status, the API validates the transition:

**Valid Transition (200 OK):**
```json
PUT /api/tasks/123
{ "status": "IN_PROGRESS" }
```

**Invalid Transition (422 Unprocessable Entity):**
```json
PUT /api/tasks/123
{ "status": "DONE" }

Response:
{
  "error": "Invalid transition: TODO → DONE. Allowed transitions from TODO: IN_PROGRESS, BLOCKED.",
  "from": "TODO",
  "to": "DONE",
  "allowed": ["IN_PROGRESS", "BLOCKED"]
}
```

---

## ERROR HANDLING

**File:** `lib/api/error-handler.ts`

All API routes use `withErrorHandler` middleware for consistent error responses.

### Error Types & Status Codes

| Error Type | Status | Response |
|-----------|--------|----------|
| ZodError (Validation) | 400 | `{ "error": "Validation error", "details": {...} }` |
| NotFoundError | 404 | `{ "error": "Task/Project not found: {id}" }` |
| InvalidTransitionError | 422 | `{ "error": "...", "from": "...", "to": "...", "allowed": [...] }` |
| Unhandled Error | 500 | `{ "error": "Internal server error" }` |

### Validation Error Format

```json
{
  "error": "Validation error",
  "details": {
    "fieldErrors": {
      "title": ["Title is required"],
      "description": ["Description too long"]
    },
    "formErrors": []
  }
}
```

---

## DATABASE LAYER

**Files:**
- `lib/db/tasks.ts` - Task operations
- `lib/db/projects.ts` - Project operations
- `lib/db/client.ts` - Prisma client

### Task Operations

```typescript
// List tasks (optional filters)
getTasks(status?: TaskStatus, projectId?: string): Promise<Task[]>

// Get single task
getTask(id: string): Promise<Task | null>

// Create task
createTask(data: {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  projectId?: string
}): Promise<Task>

// Update task (with status transition validation)
updateTask(
  id: string,
  data: Partial<{...}>,
  currentStatus?: TaskStatus
): Promise<Task>

// Delete task
deleteTask(id: string): Promise<Task>

// Batch create tasks
createTasksBatch(
  tasks: Array<{ title: string; description?: string; subtasks?: string[] }>,
  projectId: string
): Promise<Task[]>
```

### Project Operations

```typescript
// List all projects
getProjects(): Promise<Project[]>

// Get single project
getProject(id: string): Promise<Project | null>

// Create project
createProject(data: {
  name: string
  description?: string
  domain?: ProjectDomain
}): Promise<Project>

// Update project
updateProject(
  id: string,
  data: Partial<{ name?: string; description?: string }>
): Promise<Project>

// Delete project (cascading)
deleteProject(id: string): Promise<Project>

// Get project with task count
getProjectWithTaskCount(id: string): Promise<Project>
```

---

## ENVIRONMENT CONFIGURATION

**File:** `.env.example`

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://kanban:kanban@db:5432/kanban?schema=public"

# LLM API Keys (at least one required for agent operations)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Local model support
OLLAMA_BASE_URL=http://localhost:11434/v1

# Next.js
NODE_ENV=production
```

### Environment Validation

**File:** `lib/validations/schemas.ts`

```typescript
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'Invalid Anthropic API key').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AGENT_MODEL: z.string().min(1).default('gpt-4o-mini'),
})
```

---

## DATA MODELS

### Task Model (Prisma)

```prisma
model Task {
  id            String         @id @default(uuid())
  title         String
  description   String?
  status        TaskStatus     @default(TODO)
  priority      TaskPriority   @default(MEDIUM)
  projectId     String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  project       Project?       @relation(fields: [projectId], references: [id])
  conversations Conversation[]
  subtasks      Subtask[]

  @@index([status()])
  @@index([priority()])
  @@index([createdAt()])
  @@index([projectId()])
}
```

### Project Model (Prisma)

```prisma
model Project {
  id              String           @id @default(uuid())
  name            String
  description     String?
  domain          ProjectDomain    @default(SOFTWARE_ENGINEERING)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  tasks           Task[]
  planningThreads PlanningThread[]

  @@index([createdAt()])
}
```

### Subtask Model (Prisma)

```prisma
model Subtask {
  id          String   @id @default(uuid())
  title       String
  description String?  @db.Text
  completed   Boolean  @default(false)
  output      String?  @db.Text
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([taskId])
}
```

---

## COMMON PATTERNS FOR KANBAN TOOLS

### Example: Creating a Task in a Project

```typescript
// POST /api/tasks
{
  "title": "Implement authentication",
  "description": "Add JWT-based authentication to API",
  "priority": "HIGH",
  "status": "TODO",
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Example: Transitioning a Task

```typescript
// PUT /api/tasks/123
{
  "status": "IN_PROGRESS"
}
```

### Example: Creating a Project and Tasks

```typescript
// 1. POST /api/projects
{
  "name": "Mobile App Redesign",
  "description": "Complete redesign of the mobile application UI",
  "domain": "SOFTWARE_ENGINEERING"
}

// Response: { "id": "550e8400-..." }

// 2. POST /api/tasks (with projectId)
{
  "title": "Design mockups",
  "projectId": "550e8400-..."
}
```

### Example: Auto-breakdown Project Tasks

```typescript
// POST /api/tasks/auto-breakdown
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}

// Response: { "success": true, "count": 3 }
```

---

## RESPONSE HEADERS

All responses include:
- `Content-Type: application/json`
- Standard HTTP status codes (200, 201, 400, 404, 422, 500)

---

## RATE LIMITING

Currently no rate limiting implemented. Can be added via middleware.

---

## AUTHENTICATION

Currently no authentication implemented. APIs are open.

Consider adding:
- NextAuth.js for session management
- JWT tokens for API calls
- Role-based access control (RBAC)

---

## PAGINATION

Currently not implemented on list endpoints. Can be added:

```typescript
// Query: /api/tasks?limit=20&offset=0
```

Schemas already defined:
- `paginationSchema` in `lib/validations/schemas.ts`
- `taskQuerySchema` (includes pagination)

---

## CACHING

Currently no caching strategy implemented. Consider:
- Cache-Control headers on GET endpoints
- Redis for frequently accessed data
- SWR/React Query on client side

---

## NOTES FOR KANBAN TOOLS IMPLEMENTATION

1. **Always validate transactions:** Status transitions are strictly validated (422 errors)
2. **Use correct HTTP methods:** GET (read), POST (create), PUT (update), DELETE (remove)
3. **Handle 404s gracefully:** NotFoundError returns 404 with message
4. **Cascade on delete:** Deleting a project deletes all related tasks/subtasks/threads
5. **Null vs undefined:** Use `null` to explicitly clear fields (e.g., description, projectId)
6. **UUID format:** All IDs are UUIDs - validate format in requests
7. **Timestamps:** createdAt and updatedAt are managed by database, don't include in requests
8. **Subtasks:** Can only be updated via dedicated endpoint, not through task updates


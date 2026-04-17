# KanbanTools Implementation Guide - Quick Reference

**Purpose:** Complete API reference for building KanbanTools that call Next.js Kanban backend
**Generated:** 2026-04-15
**Project:** nextjs-kanban

---

## QUICK API REFERENCE TABLE

### TASKS API ENDPOINTS

| Method | URL | Purpose | Query/Params | Request Body | Response |
|--------|-----|---------|--------------|--------------|----------|
| GET | `/api/tasks` | List tasks | `?status=TODO&projectId=UUID` | None | `Task[]` |
| POST | `/api/tasks` | Create task | None | `{title, description?, status?, priority?, projectId?}` | `Task` (201) |
| GET | `/api/tasks/:id` | Get task | `:id` (UUID) | None | `Task` |
| PUT | `/api/tasks/:id` | Update task | `:id` (UUID) | `{title?, description?, status?, priority?, projectId?}` | `Task` |
| DELETE | `/api/tasks/:id` | Delete task | `:id` (UUID) | None | `{success: true}` |
| PUT | `/api/tasks/:id/subtasks/:subtaskId` | Update subtask | `:id`, `:subtaskId` (UUID) | `{title?, completed?}` | `Subtask` |
| POST | `/api/tasks/auto-breakdown` | Auto-generate subtasks | None | `{projectId}` | `{success: true, count}` |

### PROJECTS API ENDPOINTS

| Method | URL | Purpose | Query/Params | Request Body | Response |
|--------|-----|---------|--------------|--------------|----------|
| GET | `/api/projects` | List projects | None | None | `Project[]` |
| POST | `/api/projects` | Create project | None | `{name, description?, domain?}` | `Project` (201) |
| GET | `/api/projects/:id` | Get project | `:id` (UUID) | None | `Project` |
| PUT | `/api/projects/:id` | Update project | `:id` (UUID) | `{name?, description?, status?}` | `Project` |
| DELETE | `/api/projects/:id` | Delete project | `:id` (UUID) | None | `{success: true}` |

---

## VALIDATION RULES

### Task Fields

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `title` | string | YES (POST) | 1-500 chars | - |
| `description` | string | NO | Max 5000 chars | null |
| `status` | enum | NO | TODO\|IN_PROGRESS\|IN_REVIEW\|DONE\|BLOCKED | TODO |
| `priority` | enum | NO | LOW\|MEDIUM\|HIGH\|URGENT | MEDIUM |
| `projectId` | UUID | NO | Valid UUID format | null |

### Project Fields

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `name` | string | YES (POST) | 1-200 chars | - |
| `description` | string | NO | Max 2000 chars | null |
| `domain` | enum | NO | SOFTWARE_ENGINEERING\|MARKETING\|SALES\|LOGISTICS | SOFTWARE_ENGINEERING |
| `status` | string | NO (UPDATE ONLY) | Max 50 chars | - |

### Subtask Fields

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| `title` | string | YES (CREATE) | Any length | - |
| `completed` | boolean | NO (UPDATE) | true\|false | false |

---

## STATUS TRANSITION MAP

### Valid Status Transitions

```
TODO        ──→ IN_PROGRESS ✓
         ╰──→ BLOCKED ✓

IN_PROGRESS ──→ IN_REVIEW ✓
         ├──→ TODO ✓
         ╰──→ BLOCKED ✓

IN_REVIEW   ──→ DONE ✓
         ├──→ IN_PROGRESS ✓
         ╰──→ BLOCKED ✓

DONE        (terminal - no transitions)

BLOCKED     ──→ TODO ✓
```

### Invalid Transitions

```
TODO → DONE                    ✗ (422 error)
DONE → anything                ✗ (422 error)
IN_REVIEW → IN_PROGRESS        ✗ (422 error, but can go back via TODO first)
```

---

## ERROR RESPONSES

### Error Status Codes

| Code | Type | Cause | Response Format |
|------|------|-------|-----------------|
| 400 | Validation Error | Missing/invalid fields | `{error: "Validation error", details: {...}}` |
| 404 | Not Found | Resource doesn't exist | `{error: "Task/Project not found: {id}"}` |
| 422 | Invalid Transition | Bad status transition | `{error: "...", from: "...", to: "...", allowed: [...]}` |
| 500 | Internal Error | Server/DB error | `{error: "Internal server error"}` |

### Example 422 Response (Invalid Transition)

```json
{
  "error": "Invalid transition: TODO → DONE. Allowed transitions from TODO: IN_PROGRESS, BLOCKED.",
  "from": "TODO",
  "to": "DONE",
  "allowed": ["IN_PROGRESS", "BLOCKED"]
}
```

---

## REQUEST/RESPONSE EXAMPLES

### 1. Create a Task

**Request:**
```
POST /api/tasks
Content-Type: application/json

{
  "title": "Implement authentication",
  "description": "Add JWT-based auth to API",
  "priority": "HIGH",
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Implement authentication",
  "description": "Add JWT-based auth to API",
  "status": "TODO",
  "priority": "HIGH",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-15T10:30:00Z",
  "updatedAt": "2026-04-15T10:30:00Z",
  "project": {...},
  "subtasks": [],
  "conversations": []
}
```

### 2. List Tasks with Filter

**Request:**
```
GET /api/tasks?status=IN_PROGRESS&projectId=550e8400-e29b-41d4-a716-446655440000
```

**Response (200):**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Design database schema",
    "description": "PostgreSQL schema for tasks and projects",
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2026-04-15T09:00:00Z",
    "updatedAt": "2026-04-15T10:15:00Z",
    "project": {...},
    "subtasks": [...],
    "conversations": []
  }
]
```

### 3. Update Task Status (Valid Transition)

**Request:**
```
PUT /api/tasks/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

**Response (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Implement authentication",
  "description": "Add JWT-based auth to API",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-04-15T10:30:00Z",
  "updatedAt": "2026-04-15T10:45:00Z",
  "project": {...},
  "subtasks": [],
  "conversations": []
}
```

### 4. Update Task Status (Invalid Transition)

**Request:**
```
PUT /api/tasks/123e4567-e89b-12d3-a456-426614174000
Content-Type: application/json

{
  "status": "DONE"
}
```

**Response (422):**
```json
{
  "error": "Invalid transition: TODO → DONE. Allowed transitions from TODO: IN_PROGRESS, BLOCKED.",
  "from": "TODO",
  "to": "DONE",
  "allowed": ["IN_PROGRESS", "BLOCKED"]
}
```

### 5. Create Project

**Request:**
```
POST /api/projects
Content-Type: application/json

{
  "name": "Mobile App Redesign",
  "description": "Complete redesign of mobile UI",
  "domain": "SOFTWARE_ENGINEERING"
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Mobile App Redesign",
  "description": "Complete redesign of mobile UI",
  "domain": "SOFTWARE_ENGINEERING",
  "createdAt": "2026-04-15T10:30:00Z",
  "updatedAt": "2026-04-15T10:30:00Z",
  "tasks": [],
  "planningThreads": []
}
```

### 6. Auto-breakdown Tasks

**Request:**
```
POST /api/tasks/auto-breakdown
Content-Type: application/json

{
  "projectId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200):**
```json
{
  "success": true,
  "count": 3
}
```

### 7. Update Subtask

**Request:**
```
PUT /api/tasks/123e4567-e89b-12d3-a456-426614174000/subtasks/987f6543-e89b-12d3-a456-426614174999
Content-Type: application/json

{
  "completed": true,
  "title": "Setup database"
}
```

**Response (200):**
```json
{
  "id": "987f6543-e89b-12d3-a456-426614174999",
  "title": "Setup database",
  "description": null,
  "completed": true,
  "output": null,
  "taskId": "123e4567-e89b-12d3-a456-426614174000",
  "createdAt": "2026-04-15T10:31:00Z",
  "updatedAt": "2026-04-15T10:45:00Z"
}
```

### 8. Delete Task

**Request:**
```
DELETE /api/tasks/123e4567-e89b-12d3-a456-426614174000
```

**Response (200):**
```json
{
  "success": true
}
```

### 9. Validation Error

**Request:**
```
POST /api/tasks
Content-Type: application/json

{
  "title": ""  // Invalid: empty string
}
```

**Response (400):**
```json
{
  "error": "Validation error",
  "details": {
    "fieldErrors": {
      "title": ["Title is required"]
    },
    "formErrors": []
  }
}
```

---

## ENVIRONMENT VARIABLES

### Required Variables

```bash
DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"
```

### Optional Variables (at least one LLM API key)

```bash
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."
OLLAMA_BASE_URL="http://localhost:11434/v1"
NODE_ENV="production"
AGENT_MODEL="gpt-4o-mini"
```

---

## DATA TYPES & SCHEMAS

### Task Type

```typescript
interface Task {
  id: UUID                                              // UUID v4
  title: string                                         // 1-500 chars
  description: string | null                           // Max 5000 chars
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  projectId: UUID | null
  createdAt: DateTime                                   // ISO 8601
  updatedAt: DateTime                                   // ISO 8601
  project: Project | null
  subtasks: Subtask[]
  conversations: Conversation[]
}
```

### Project Type

```typescript
interface Project {
  id: UUID
  name: string                                          // 1-200 chars
  description: string | null                           // Max 2000 chars
  domain: 'SOFTWARE_ENGINEERING' | 'MARKETING' | 'SALES' | 'LOGISTICS'
  createdAt: DateTime
  updatedAt: DateTime
  tasks: Task[]
  planningThreads: PlanningThread[]
}
```

### Subtask Type

```typescript
interface Subtask {
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

---

## IMPLEMENTATION TIPS FOR KANBAN TOOLS

### 1. Status Transition Rules
- Always validate transitions before updating - API will reject with 422
- Terminal status is DONE - no transitions out
- Can restore from BLOCKED → TODO
- Cannot skip steps (e.g., TODO → DONE directly)

### 2. Error Handling
- Check status code first (400, 404, 422, 500)
- For 422 errors, use `allowed` field to show valid options
- For validation (400) errors, show field-specific messages from `details`

### 3. Null vs Undefined
- Use `null` in request body to CLEAR fields (description, projectId)
- Omit fields entirely to SKIP them
- Don't include `createdAt`, `updatedAt`, `id` in requests

### 4. Cascading Deletes
- Deleting a Project deletes all Tasks, Subtasks, Conversations
- Deleting a Task cascades to Subtasks and Conversations
- Plan for cleanup if needed

### 5. Auto-breakdown
- Only breaks down TODO tasks with NO existing subtasks
- Uses AI Architect agent
- Requires project vision document (from planning thread) or project description
- Updates up to 3-5 subtasks per task

### 6. API Response Structure
- All responses are JSON
- Timestamps are ISO 8601 format
- IDs are UUID v4 format
- Null vs empty array - check each resource

### 7. Request Body Rules
- All string fields must be trimmed (no leading/trailing whitespace required by API, but recommended)
- Priority and Status are case-sensitive (uppercase)
- Domain is case-sensitive
- UUIDs are case-insensitive in DB but validate format

### 8. Query Parameters
- Limited to: `status`, `projectId` for task list
- Both optional
- Multiple query params use `&` separator

---

## CURL EXAMPLES FOR TESTING

### List Tasks
```bash
curl -X GET "http://localhost:3000/api/tasks?status=TODO"
```

### Create Task
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "priority": "HIGH"
  }'
```

### Update Task Status
```bash
curl -X PUT "http://localhost:3000/api/tasks/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "IN_PROGRESS"
  }'
```

### Delete Task
```bash
curl -X DELETE "http://localhost:3000/api/tasks/123e4567-e89b-12d3-a456-426614174000"
```

### List Projects
```bash
curl -X GET "http://localhost:3000/api/projects"
```

### Create Project
```bash
curl -X POST "http://localhost:3000/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Project",
    "domain": "SOFTWARE_ENGINEERING"
  }'
```

---

## AUTHENTICATION & SECURITY

### Current State
- ✗ No authentication implemented
- ✗ No rate limiting
- ✗ No CORS restrictions

### Future Considerations
- Add NextAuth.js for session management
- Implement JWT tokens
- Add role-based access control (RBAC)
- Enable rate limiting
- Add CORS policies

---

## PAGINATION (Future)

Schemas already prepared but not yet implemented on endpoints:

```typescript
// Query: /api/tasks?limit=20&offset=0
{
  "limit": number,   // 1-100, default 20
  "offset": number   // default 0
}
```

---

## FILES TO REFERENCE IN CODEBASE

```
app/api/tasks/route.ts                        # List & Create
app/api/tasks/[id]/route.ts                   # Get, Update, Delete
app/api/tasks/[id]/subtasks/[subtaskId]/route.ts  # Update Subtask
app/api/tasks/auto-breakdown/route.ts         # Auto-breakdown
app/api/projects/route.ts                     # List & Create
app/api/projects/[id]/route.ts                # Get, Update, Delete
lib/services/task.service.ts                  # Task business logic
lib/services/project.service.ts               # Project business logic
lib/validations/schemas.ts                    # Zod schemas
lib/status-lifecycle.ts                       # Status transitions
lib/api/error-handler.ts                      # Error handling
lib/db/tasks.ts                               # Task DB operations
lib/db/projects.ts                            # Project DB operations
prisma/schema.prisma                          # Data models
```


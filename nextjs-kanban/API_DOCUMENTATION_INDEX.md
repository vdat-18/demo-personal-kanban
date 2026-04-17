# Next.js Kanban API Documentation Index

**Generated:** 2026-04-15  
**Project:** nextjs-kanban  
**Purpose:** Complete API reference for KanbanTools implementation

---

## 📚 DOCUMENTATION FILES

### 1. **API_ROUTES_REFERENCE.md** (Main Documentation - 17KB)
Comprehensive guide with full details on all endpoints, validation rules, error handling, and data models.

**Contents:**
- Complete Tasks API documentation (LIST, CREATE, GET, UPDATE, DELETE)
- Complete Projects API documentation (LIST, CREATE, GET, UPDATE, DELETE)
- Auto-breakdown endpoint details
- Subtask update endpoint
- Validation schemas with exact rules
- Status lifecycle and transitions
- Error handling with examples
- Database layer operations
- Environment configuration
- Data models (Prisma schema)
- Common patterns and examples

**Use this when:** You need detailed information about any API endpoint, error responses, or validation rules.

---

### 2. **KANBAN_TOOLS_QUICK_REFERENCE.md** (Quick Lookup - 14KB)
Fast lookup reference with tables, examples, and implementation tips.

**Contents:**
- Quick API reference tables (all endpoints at a glance)
- Validation rules matrix
- Status transition map (visual)
- Error responses table
- 9 complete request/response examples
- Environment variables
- TypeScript data type definitions
- Implementation tips for tool developers
- CURL examples for testing
- File references

**Use this when:** You need a quick lookup of endpoint details or want to copy-paste examples.

---

## 🎯 QUICK START

### For New KanbanTools Implementation
1. Start with **KANBAN_TOOLS_QUICK_REFERENCE.md** - get the overview
2. Reference the endpoint tables for exact URLs and methods
3. Copy examples and adapt them for your use case
4. Use **API_ROUTES_REFERENCE.md** for detailed validation rules and error handling

### For Status Transition Logic
1. See "Status Transition Map" in **KANBAN_TOOLS_QUICK_REFERENCE.md**
2. See "Status Lifecycle & Transitions" in **API_ROUTES_REFERENCE.md**
3. Reference `lib/status-lifecycle.ts` in codebase for the source of truth

### For Error Handling
1. See "Error Responses" in **KANBAN_TOOLS_QUICK_REFERENCE.md**
2. See "Error Handling" section in **API_ROUTES_REFERENCE.md**
3. Check example 422 response for invalid transitions

---

## 🔗 ACTUAL SOURCE FILES IN PROJECT

All API implementations are in the nextjs-kanban directory:

```
API Routes:
  app/api/tasks/route.ts                          # GET /api/tasks, POST /api/tasks
  app/api/tasks/[id]/route.ts                     # GET, PUT, DELETE for single task
  app/api/tasks/[id]/subtasks/[subtaskId]/route.ts # PUT subtask
  app/api/tasks/auto-breakdown/route.ts           # POST auto-breakdown
  app/api/projects/route.ts                       # GET /api/projects, POST /api/projects
  app/api/projects/[id]/route.ts                  # GET, PUT, DELETE for single project

Service Layer:
  lib/services/task.service.ts                    # Task business logic
  lib/services/project.service.ts                 # Project business logic

Database Layer:
  lib/db/tasks.ts                                 # Task DB operations
  lib/db/projects.ts                              # Project DB operations
  lib/db/client.ts                                # Prisma client

Validation & Status:
  lib/validations/schemas.ts                      # All Zod schemas
  lib/status-lifecycle.ts                         # Status transitions

Error Handling:
  lib/api/error-handler.ts                        # Error middleware
  lib/api/errors.ts                               # Error classes

Data Models:
  prisma/schema.prisma                            # Complete schema
```

---

## 📋 API ENDPOINT SUMMARY

### Tasks (7 endpoints)
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PUT | `/api/tasks/:id/subtasks/:subtaskId` | Update subtask |
| POST | `/api/tasks/auto-breakdown` | Auto-generate subtasks |

### Projects (5 endpoints)
| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |

---

## 🎯 VALIDATION AT A GLANCE

### Task Status Values
```
TODO → IN_PROGRESS, BLOCKED
IN_PROGRESS → IN_REVIEW, TODO, BLOCKED
IN_REVIEW → DONE, IN_PROGRESS, BLOCKED
DONE → (terminal)
BLOCKED → TODO
```

### Task Priority Values
```
LOW, MEDIUM (default), HIGH, URGENT
```

### Project Domain Values
```
SOFTWARE_ENGINEERING (default), MARKETING, SALES, LOGISTICS
```

### Field Constraints
- Task title: 1-500 chars (required on POST)
- Task description: max 5000 chars (optional)
- Project name: 1-200 chars (required on POST)
- Project description: max 2000 chars (optional)

---

## 🔐 Authentication & Security

**Current Status:**
- ✗ No authentication
- ✗ No rate limiting
- ✗ No authorization

All endpoints are currently open and accessible.

---

## 🚀 Getting Started Examples

### Create a Project
```bash
curl -X POST "http://localhost:3000/api/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "description": "Project description",
    "domain": "SOFTWARE_ENGINEERING"
  }'
```

### Create a Task in Project
```bash
curl -X POST "http://localhost:3000/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Task",
    "description": "Task description",
    "priority": "HIGH",
    "projectId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Update Task Status (Valid Transition)
```bash
curl -X PUT "http://localhost:3000/api/tasks/123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS"}'
```

### List Tasks in Project
```bash
curl -X GET "http://localhost:3000/api/tasks?projectId=550e8400-e29b-41d4-a716-446655440000"
```

---

## 📊 Data Model Overview

### Task
- `id` (UUID) - unique identifier
- `title` (string) - task name
- `description` (string | null) - detailed description
- `status` (enum) - TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED
- `priority` (enum) - LOW | MEDIUM | HIGH | URGENT
- `projectId` (UUID | null) - parent project
- `createdAt` (DateTime) - creation timestamp
- `updatedAt` (DateTime) - last modification timestamp
- `project` (Project | null) - related project object
- `subtasks` (Subtask[]) - array of subtasks
- `conversations` (Conversation[]) - array of conversations

### Project
- `id` (UUID) - unique identifier
- `name` (string) - project name
- `description` (string | null) - project description
- `domain` (enum) - SOFTWARE_ENGINEERING | MARKETING | SALES | LOGISTICS
- `createdAt` (DateTime) - creation timestamp
- `updatedAt` (DateTime) - last modification timestamp
- `tasks` (Task[]) - array of tasks
- `planningThreads` (PlanningThread[]) - array of planning threads

### Subtask
- `id` (UUID) - unique identifier
- `title` (string) - subtask name
- `description` (string | null) - description
- `completed` (boolean) - completion status
- `output` (string | null) - subtask output/result
- `taskId` (UUID) - parent task ID
- `createdAt` (DateTime) - creation timestamp
- `updatedAt` (DateTime) - last modification timestamp

---

## 🔄 Status Transition Examples

### Valid: TODO → IN_PROGRESS
```json
PUT /api/tasks/:id
{"status": "IN_PROGRESS"}
// Response: 200 OK, updated task
```

### Invalid: TODO → DONE
```json
PUT /api/tasks/:id
{"status": "DONE"}
// Response: 422 Unprocessable Entity
// {
//   "error": "Invalid transition: TODO → DONE. Allowed transitions from TODO: IN_PROGRESS, BLOCKED.",
//   "from": "TODO",
//   "to": "DONE",
//   "allowed": ["IN_PROGRESS", "BLOCKED"]
// }
```

---

## ❌ Common Errors

### 400 - Validation Error
- Missing required field (e.g., title on POST)
- Invalid format (e.g., empty string for title)
- Field too long (e.g., description > 5000 chars)
- Invalid enum value (e.g., status = "INVALID")

### 404 - Not Found
- Task/Project doesn't exist
- Subtask belongs to different task

### 422 - Invalid Status Transition
- Attempting invalid status change (see transition map)
- Use the `allowed` field in response to show valid options

### 500 - Internal Server Error
- Database error
- AI generation error (for auto-breakdown)
- Unexpected server error

---

## 🛠️ Implementation Checklist for KanbanTools

- [ ] Understand status transitions (cannot skip steps)
- [ ] Handle 422 errors with transition validation
- [ ] Use null to clear fields, not undefined
- [ ] Validate UUIDs on client before sending
- [ ] Handle cascading deletes (project → tasks → subtasks)
- [ ] Implement proper error messages for each status code
- [ ] Use timestamps in ISO 8601 format
- [ ] Don't include id/createdAt/updatedAt in requests
- [ ] Case-sensitive: status, priority, domain are uppercase
- [ ] Test with provided CURL examples

---

## 📖 Reading Order

1. **First time?** Start with this file (you're reading it)
2. **Quick lookup?** Go to KANBAN_TOOLS_QUICK_REFERENCE.md
3. **Need details?** Go to API_ROUTES_REFERENCE.md
4. **Implementing?** Reference actual source files in app/api/

---

## 🔗 Related Documentation

Within the project, also see:
- `README.md` - Project overview
- `AGENTS.md` - AI agent configuration
- `prisma/schema.prisma` - Data model source of truth
- `.env.example` - Environment variable setup

---

## 📝 Notes for KanbanTools Developers

### Key Principles
1. **Status transitions are strictly validated** - API rejects invalid transitions with 422
2. **All IDs are UUIDs** - validate format before sending
3. **Cascading deletes work** - delete project deletes all related data
4. **Auto-breakdown uses AI** - requires LLM API keys configured
5. **Null clears fields** - send `null` to remove description or projectId
6. **Error details matter** - use 422 response's `allowed` field for UI

### Important Files to Know
- `lib/status-lifecycle.ts` - Source of truth for transitions
- `lib/validations/schemas.ts` - Validation rules
- `prisma/schema.prisma` - Data model definition
- `lib/api/error-handler.ts` - Error handling patterns

### Testing Strategy
1. Use CURL examples to test endpoints
2. Verify status transitions work correctly
3. Test error cases (validation, not found, invalid transition)
4. Test cascading deletes
5. Verify pagination (when implemented)

---

## ⚙️ Environment Setup

Required:
```bash
DATABASE_URL="postgresql://..."
```

Optional (at least one LLM for agents):
```bash
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."
NODE_ENV="production"
AGENT_MODEL="gpt-4o-mini"
```

---

## 📞 Support

For specific API details, consult:
1. **KANBAN_TOOLS_QUICK_REFERENCE.md** - Tables and quick lookups
2. **API_ROUTES_REFERENCE.md** - Full documentation
3. Source files in `app/api/` and `lib/`
4. `lib/validations/schemas.ts` for validation rules
5. `lib/status-lifecycle.ts` for transition rules

---

**Last Updated:** 2026-04-15  
**Version:** 1.0  
**Status:** Complete ✓

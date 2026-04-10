# Quick Reference Guide - Next.js Kanban App

## Essential File Locations

### 🎯 Mission Control (Kanban Board)
```
app/(routes)/mission-control/[id]/page.tsx          ← Server-side page
components/mission-control/MissionControlClient.tsx ← Interactive board UI
lib/status-lifecycle.ts                             ← Transition rules (critical!)
```

### 💬 Task Chat (Agent Interaction)
```
app/(routes)/chat/[id]/page.tsx                     ← Server-side page
components/task-chat/TaskChatClient.tsx             ← Chat interface
app/api/agents/stream/route.ts                      ← Streaming endpoint
lib/agents/orchestrator.ts                          ← Agent coordination
lib/agents/configs.ts                               ← Agent role definitions
lib/agents/tools/index.ts                           ← Agent capabilities
```

### 🗄️ Database & API
```
prisma/schema.prisma                                ← Database schema
lib/db/tasks.ts                                     ← Task CRUD
lib/db/projects.ts                                  ← Project CRUD
lib/db/conversations.ts                             ← Conversation storage
app/api/tasks/route.ts                              ← Task endpoints
app/api/tasks/[id]/route.ts                         ← Individual task endpoint
```

---

## The 5 Task Statuses

| Status | Transitions To | UI Color | Purpose |
|--------|---|---|---|
| `TODO` | IN_PROGRESS, BLOCKED | Slate | New/unstarted tasks |
| `IN_PROGRESS` | IN_REVIEW, TODO, BLOCKED | Blue | Active work |
| `IN_REVIEW` | DONE, IN_PROGRESS, BLOCKED | Yellow | Awaiting approval |
| `DONE` | (none) | Green | ✅ Complete (terminal) |
| `BLOCKED` | TODO | Red | 🚫 Stuck/Cancelled (terminal) |

**Single Source of Truth**: `lib/status-lifecycle.ts` → `TRANSITION_MAP`

---

## The 3 AI Agents

| Role | System Prompt | Can Create Tasks? | Can Update Tasks? | Tools |
|------|---|---|---|---|
| **Architect** (Planner) | System design, planning, breakdown | ✅ | ❌ | db_query, project_create |
| **Developer** (Doer) | Implementation, coding, solving | ✅ | ✅ | db_query, task_create, task_update, task_delete, project_create |
| **Reviewer** (Reviewer) | Code review, quality check | ❌ | ❌ | db_query (read-only) |

**Configuration**: `lib/agents/configs.ts`  
**Tools**: `lib/agents/tools/index.ts`

---

## Key Interactions

### User Flow: Mission Control → Chat → Update
```
1. View kanban at /mission-control/[projectId]
2. Click task card → Navigate to /chat/[taskId]
3. Select agent (Planner/Doer/Reviewer)
4. Type message → Send
5. Agent streams response + may call tools
6. Conversation saved to DB
7. User can update task status from chat interface
8. Return to board (back button) to see updated status
```

### Task Status Update Paths
```
Path 1: Drag & Drop in Mission Control
  - User drags card to new column
  - isValidDropTarget() checks lifecycle rules
  - PUT /api/tasks/[id] with new status
  - updateTaskStatus() saves to DB & updates UI

Path 2: Quick Actions (hover buttons)
  - Forward button: calls getNextStatus() → updateTaskStatus()
  - Cancel button: opens dialog → updateTaskStatus(BLOCKED)
  - Restore button: updateTaskStatus(TODO)

Path 3: Task Chat Interface
  - Status buttons in right sidebar
  - Direct updateTaskStatus() calls
  - Or agent uses task_update tool
```

---

## API Endpoints at a Glance

### Tasks
```
GET    /api/tasks?status=TODO&projectId=xxx
POST   /api/tasks                        {title, description, projectId}
GET    /api/tasks/[id]
PUT    /api/tasks/[id]                   {status, title, ...}  ← Validates transitions!
DELETE /api/tasks/[id]
```

### Agents
```
POST   /api/agents/stream                {role, userMessage, taskId, messages}
POST   /api/agents/plan                  {projectId, userMessage}
POST   /api/agents/generate-tasks        {projectId, messages}
POST   /api/agents/tasks                 {tasks: [...]}
POST   /api/agents/team                  {goal, agents}
POST   /api/agents/run                   {role, prompt}
```

---

## Data Models

### Task
```typescript
{
  id: string (UUID)
  title: string
  description: string | null
  status: TaskStatus (TODO | IN_PROGRESS | IN_REVIEW | DONE | BLOCKED)
  priority: TaskPriority (LOW | MEDIUM | HIGH | URGENT)
  projectId: string | null
  createdAt: DateTime
  updatedAt: DateTime
  conversations: Conversation[]
}
```

### Conversation
```typescript
{
  id: string (UUID)
  taskId: string | null
  messages: Json (array of {role, content, timestamp})
  result: Json (string or null)
  tokenUsage: Json ({input: number, output: number})
  createdAt: DateTime
}
```

### Project
```typescript
{
  id: string (UUID)
  name: string
  description: string | null
  createdAt: DateTime
  updatedAt: DateTime
  tasks: Task[]
}
```

---

## Validation & Error Handling

### Status Transitions
```typescript
// Always validate before updating
const result = validateTransition('TODO', 'DONE')
// result = { valid: false, allowed: ['IN_PROGRESS', 'BLOCKED'], message: '...' }

// API returns 422 Unprocessable Entity for invalid transitions
// Response includes: { error, allowed }
```

### Input Validation
- All endpoints use **Zod schemas** for validation
- Returns 400 Bad Request if validation fails
- Check schema details in route files

---

## State Management

### Client-Side (React)
- `MissionControlClient.tsx`: useState for project, tasks, drag state
- `TaskChatClient.tsx`: useState for messages, streaming, agent selection
- `useAgentStream` hook: Manages streaming connection, progress events

### Server-Side
- Prisma ORM handles all database operations
- Status lifecycle validation in `lib/status-lifecycle.ts`
- API routes handle request validation + DB transactions

---

## Common Tasks

### Add a New Task Status
1. Edit `prisma/schema.prisma` → Update `enum TaskStatus`
2. Edit `lib/status-lifecycle.ts` → Add to `TRANSITION_MAP`
3. Update column definitions in `MissionControlClient.tsx`
4. Run `npx prisma migrate dev`

### Add an Agent Tool
1. Define tool in `lib/agents/tools/index.ts`
2. Add to `allTools` array
3. Update agent `tools` array in `lib/agents/configs.ts`
4. Tool automatically available in agent prompts

### Create a New Page with Agents
1. Create page in `app/(routes)/[name]/[id]/page.tsx`
2. Build prompt with `lib/agents/prompts.ts` helpers
3. Call `/api/agents/stream` with role, userMessage, taskId
4. Render streaming response similar to `TaskChatClient.tsx`

---

## Debugging Tips

### Check Status Transitions
```bash
grep -r "TRANSITION_MAP" lib/
# All transitions defined in lib/status-lifecycle.ts
```

### Trace Agent Calls
```bash
# Stream events show in TaskChatClient.tsx via progressEvents
# Check /api/agents/stream for event emission
# Look for: started, token, progress, tool_use, complete, error
```

### View Database
```bash
npx prisma studio
# Opens admin UI for browsing data
```

### Test an API
```bash
curl -X PUT http://localhost:3000/api/tasks/[id] \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'
```

---

## Important Constants & Locations

| Item | Location |
|------|----------|
| Status lifecycle rules | `lib/status-lifecycle.ts` |
| Agent configs | `lib/agents/configs.ts` |
| Agent tools | `lib/agents/tools/index.ts` |
| Database schema | `prisma/schema.prisma` |
| Column definitions | `components/mission-control/MissionControlClient.tsx` (KANBAN_COLUMNS) |
| Status colors | `MissionControlClient.tsx` (STATUS_COLORS) |
| Agent options | `components/task-chat/TaskChatClient.tsx` (AGENT_OPTIONS) |

---

## Next Steps to Understand

1. **Deep dive**: Read `lib/status-lifecycle.ts` - it's the core validation logic
2. **Interactive flow**: Trace a user action from click → API → DB → UI update
3. **Streaming**: Understand how SSE works in `/api/agents/stream/route.ts`
4. **Database**: Check `prisma/schema.prisma` for relationships
5. **Components**: See how `useCallback` and `useState` manage state in main components

---

## Need to Know: Critical Dependencies

- **@jackchen_me/open-multi-agent**: Multi-agent framework for agent coordination
- **prisma**: ORM for database operations
- **zod**: Input validation schemas
- **next**: Framework (App Router, API routes, server/client components)
- **react-markdown**: Render markdown from agent responses
- **lucide-react**: Icons throughout UI


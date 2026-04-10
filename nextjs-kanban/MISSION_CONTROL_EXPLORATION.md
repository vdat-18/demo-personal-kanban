# Mission Control Page - Complete Exploration Report

## Executive Summary

The **Mission Control** page is a sophisticated, AI-enhanced kanban board built with Next.js. It provides a 5-column drag-and-drop task management interface that enforces strict status transition rules while integrating with a multi-agent AI system for task assistance and automation.

---

## 1. MISSION CONTROL PAGE STRUCTURE & ARCHITECTURE

### File Locations
```
Server Component:  app/(routes)/mission-control/[id]/page.tsx
Client Component:  components/mission-control/MissionControlClient.tsx
Routing:          /mission-control/[projectId]
```

### Server-Side Page (`page.tsx`)
- **Purpose**: Server component that fetches project and tasks data
- **Key Functions**:
  - `getProject(id)` - Fetches project with all related tasks
  - `generateMetadata()` - Sets dynamic page title
  - Data serialization for client consumption
- **Data Passed to Client**: 
  ```typescript
  {
    id: string
    name: string
    description: string | null
    tasks: Task[]  // Array with id, title, description, status, priority, createdAt, updatedAt
  }
  ```

### Client-Side Component (`MissionControlClient.tsx`)
- **Type**: 'use client' React component
- **Responsibilities**:
  - Render interactive kanban board
  - Handle drag-and-drop interactions
  - Manage task status transitions
  - Display task cards with actions
  - Persist changes via API calls
  
### UI Layout
```
┌─ Header (h-20) ────────────────────────────────────────────────────┐
│ Back Button | Project Name + Description | Add Task Button       │
├─ Main Kanban Board (flex-1) ──────────────────────────────────────┤
│ [TODO Column] [IN_PROGRESS Column] [IN_REVIEW Column] [DONE Column] │
│                                                      [BLOCKED Column] │
│ + Each task card is draggable                                      │
│ + Hover actions appear on cards                                    │
│ + Column headers show task counts                                  │
├─ Footer (h-20) ───────────────────────────────────────────────────┤
│ Total | In Progress | Done | Cancelled | [Close Project] Button   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. KANBAN COLUMNS - HOW THEY WORK

### The 5 Columns (Statuses)

| Column Name | Status Value | UI Color | Flow Purpose | Terminal? |
|------------|--------------|----------|--------------|-----------|
| **To Do** | `TODO` | `slate-50` | Initial state for new tasks | No |
| **In Progress** | `IN_PROGRESS` | `blue-50` | Active work | No |
| **In Review** | `IN_REVIEW` | `yellow-50` | Awaiting approval/review | No |
| **Done** | `DONE` | `green-50` | ✅ Task complete | **Yes** |
| **Blocked** | `BLOCKED` | `red-50` | 🚫 Stuck/Cancelled | **Yes** |

### State Transition Rules (Lifecycle)

Defined in `lib/status-lifecycle.ts` - **Single Source of Truth**:

```typescript
export const TRANSITION_MAP: Record<TaskStatusValue, TaskStatusValue[]> = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],           // Can move forward or cancel
  IN_PROGRESS: ['IN_REVIEW', 'TODO', 'BLOCKED'],     // Can review, go back, or cancel
  IN_REVIEW:   ['DONE', 'IN_PROGRESS', 'BLOCKED'],   // Can complete, revert, or cancel
  DONE:        [],                                    // Terminal - frozen
  BLOCKED:     ['TODO'],                              // Only restore to TODO
}
```

### Task Flow Examples

**Happy Path**:
```
TODO → IN_PROGRESS → IN_REVIEW → DONE ✅
```

**Revision Flow**:
```
TODO → IN_PROGRESS → IN_REVIEW → IN_PROGRESS (back for changes) → IN_REVIEW → DONE ✅
```

**Cancelled Flow**:
```
TODO → BLOCKED 🚫  (user clicks "Cancel Task" button)
BLOCKED → TODO (user clicks "Restore Task" to bring it back)
```

### Validation Rules

1. **Drag-and-Drop Validation**
   - Only valid transitions per TRANSITION_MAP are allowed
   - Invalid targets show grayed-out UI (opacity-50)
   - Valid targets highlight on hover (border-blue-300)

2. **Function**: `isValidDropTarget(fromStatus, toStatus)`
   - Checks if `toStatus` is in allowed transitions for `fromStatus`
   - Same-column drops always allowed (no-op)

3. **API Validation** (`lib/db/tasks.ts`)
   - `validateTransition(from, to)` returns `{valid, allowed, message}`
   - If invalid, throws `InvalidTransitionError`
   - API returns 422 Unprocessable Entity with allowed transitions

### Task Movement Mechanisms

**Mechanism 1: Drag & Drop**
```typescript
handleDragStart(e, taskId, taskStatus) → Stores taskId + fromStatus
handleDrop(e, toColumn) → Validates via isValidDropTarget() → Calls updateTaskStatus()
```

**Mechanism 2: Quick Action Buttons** (appear on hover)
```
[↻ Restore] (if BLOCKED & can go to TODO)
[✗ Cancel]  (if transition to BLOCKED is allowed)
[→ Forward] (if getNextStatus() returns a valid status)
```

**Mechanism 3: Dialog Cancel**
```
User clicks "Cancel Task" button → Opens modal with reason textarea
User confirms → updateTaskStatus(taskId, 'BLOCKED')
```

### Key Functions for Column Operations

```typescript
// Get tasks for a specific column
getTasksByStatus(status: TaskStatus): Task[] 
  → tasks.filter((t) => t.status === status)

// Determine next automatic status
getNextStatus(current: TaskStatus): TaskStatus | null
  → Gets allowed transitions, filters out BLOCKED, returns first

// Validate drop target
isValidDropTarget(fromStatus, toStatus): boolean
  → Uses status-lifecycle.ts validation

// Update task status
updateTaskStatus(taskId, status): Promise
  → PUT /api/tasks/[taskId] with {status}
  → Updates local state via setProject()
```

---

## 3. AGENTS/TASKS INTERACTION - AI SYSTEM

### Architecture Overview

The kanban board integrates with a **multi-agent AI system** that can assist with task planning, implementation, and review.

### The 3 AI Agent Roles

Defined in `lib/agents/configs.ts`:

| Role | Model | System Prompt Focus | Capabilities | Tools | Use Case |
|------|-------|------------------|---|---|---|
| **architect** | gpt-4o-mini | System design, planning, breaking down complex tasks | Creates/queries tasks | `db_query`, `project_create` | Planning projects, designing architecture, breaking down features |
| **developer** | gpt-4o-mini | Implementation, coding, solving technical problems | Creates/updates/deletes tasks | `db_query`, `task_create`, `task_update`, `task_delete`, `project_create` | Implementing features, fixing bugs, writing code |
| **reviewer** | gpt-4o-mini | Code review, quality check, best practices, security | Read-only access | `db_query` | Code review, feedback, quality assessment |

### Agent Tools (Database Operations)

Defined in `lib/agents/tools/index.ts`:

| Tool | Description | Input Schema | Accessible By |
|------|-------------|---|---|
| **db_query** | Query tasks, projects, conversations | `{table, filter?, limit?}` | All agents |
| **task_create** | Create new task with title, description, status, priority | `{title, description?, status?, priority?, projectId?}` | Architect, Developer |
| **task_update** | Update task properties + validate status transitions | `{id, title?, description?, status?, priority?, projectId?}` | Developer |
| **task_delete** | Delete task from database | `{id}` | Developer |
| **project_create** | Create new project | `{name, description?}` | Architect, Developer |

### How Users Interact with Agents

#### Interaction Point 1: Task Chat Page (`/chat/[taskId]`)

**Flow**:
```
User clicks task in Mission Control
    ↓
Opens /chat/[taskId] 
    ↓
Selects agent role (Planner/Doer/Reviewer)
    ↓
Types message about task
    ↓
Frontend POSTs to /api/agents/stream
    ↓
Backend streams response in real-time (SSE)
    ↓
Agent may call tools (e.g., create_task, task_update)
    ↓
Conversation saved to database
    ↓
User can see conversation history with pagination
```

**Key File**: `components/task-chat/TaskChatClient.tsx`
- Agent selection dropdown
- Live streaming chat interface
- Conversation history with 3-item pagination
- Task status quick-update buttons (right sidebar)
- Token usage tracking

#### Interaction Point 2: Agent Stream Endpoint (`/api/agents/stream`)

**Request**:
```typescript
POST /api/agents/stream
{
  role: 'architect' | 'developer' | 'reviewer',
  userMessage: string,
  taskId: string (UUID),
  messages?: Array<{role: 'user'|'assistant', content: string}>  // Optional history
}
```

**Response**: Server-Sent Events (SSE) stream
```
data: {"type":"started","role":"developer"}
data: {"type":"token","delta":"The"}
data: {"type":"token","delta":" task"}
...
data: {"type":"progress","message":"Using tool: task_create"}
data: {"type":"complete","tokenUsage":{"input":150,"output":50}}
```

**Implementation**:
- Creates Agent with shared tool registry
- Streams events from agent.stream()
- Accumulates full response text
- On completion, persists conversation to database
- Returns conversation with token usage

#### Interaction Point 3: Planning/Project-Level Agents

**Endpoint**: `/api/agents/plan`
```typescript
POST /api/agents/plan
{
  projectId: string (UUID),
  userMessage: string
}
```
- Architect agent helps plan entire project
- Receives project context with existing tasks
- Returns structured planning response

**Endpoint**: `/api/agents/generate-tasks`
```typescript
POST /api/agents/generate-tasks
{
  projectId: string (UUID),
  messages: Array<{role, content}>  // Conversation history
}
```
- Extracts structured tasks from planning conversation
- Architect agent parses JSON from LLM response
- Bulk-creates tasks with `createTasksBatch()`

### Agent System Files

```
lib/agents/orchestrator.ts        ← Coordination: runAgent(), runTeam(), runTasks()
lib/agents/configs.ts             ← Agent definitions + system prompts
lib/agents/tools/index.ts         ← 5 tools: db_query, task_create, etc.
lib/agents/prompts.ts             ← Prompt builders for different contexts
app/api/agents/stream/route.ts    ← Streaming endpoint
app/api/agents/plan/route.ts      ← Planning endpoint
app/api/agents/generate-tasks/route.ts ← Task extraction
```

### Tool Registry & Executor

```typescript
// Built once per process
function buildRegistry(): ToolRegistry {
  const registry = new ToolRegistry()
  registerBuiltInTools(registry)           // OpenAI built-ins
  for (const tool of allTools) {
    registry.register(tool)                 // Custom DB tools
  }
  return registry
}

const sharedRegistry = buildRegistry()
const sharedExecutor = new ToolExecutor(sharedRegistry)
```

### Orchestrator Functions

```typescript
// Run single agent with prompt
runAgent(role: AgentRole, prompt: string): Promise<unknown>

// Run team-based problem solving
runTeam(goal: string, agents: AgentRole[]): Promise<unknown>

// Run DAG-scheduled tasks with dependencies
runTasks(tasks: Array<{agent, prompt, dependencies?}>): Promise<unknown>
```

---

## 4. OVERALL ARCHITECTURE

### Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Client State**: React hooks (useState, useCallback, useRef)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm
- **AI Framework**: @jackchen_me/open-multi-agent
- **LLM**: OpenAI (gpt-4o-mini)
- **Validation**: Zod schemas
- **Streaming**: Server-Sent Events (SSE)

### Data Models

**Task Model**:
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
  conversations: Conversation[]  // One-to-many
}
```

**Project Model**:
```typescript
{
  id: string (UUID)
  name: string
  description: string | null
  createdAt: DateTime
  updatedAt: DateTime
  tasks: Task[]  // One-to-many relationship
}
```

**Conversation Model**:
```typescript
{
  id: string (UUID)
  taskId: string | null
  messages: Json  // Array of {role: 'user'|'assistant', content, timestamp}
  result: Json    // AI response text
  tokenUsage: Json // {input: number, output: number}
  createdAt: DateTime
  task: Task?     // Relationship
}
```

### API Endpoints

**Task Endpoints**:
```
GET    /api/tasks                     → List tasks (filter by status/projectId)
POST   /api/tasks                     → Create task {title, description?, projectId?}
GET    /api/tasks/[id]                → Fetch specific task
PUT    /api/tasks/[id]                → Update task {status?, title?, priority?, ...}
DELETE /api/tasks/[id]                → Delete task
```

**Agent Endpoints**:
```
POST   /api/agents/stream             → Stream agent response {role, userMessage, taskId}
POST   /api/agents/plan               → Plan project {projectId, userMessage}
POST   /api/agents/generate-tasks     → Extract tasks {projectId, messages}
POST   /api/agents/tasks              → Run multi-agent tasks with DAG
POST   /api/agents/team               → Run team-based problem solving
POST   /api/agents/run                → Run single agent {role, prompt}
```

**Project Endpoints**:
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/[id]
PUT    /api/projects/[id]
DELETE /api/projects/[id]
```

### State Management

**Client-Side** (React components):
```typescript
// In MissionControlClient.tsx
const [project, setProject] = useState(initialProject)
const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
const [draggingTaskStatus, setDraggingTaskStatus] = useState<TaskStatus | null>(null)
const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
const [cancelReason, setCancelReason] = useState('')
```

**Server-Side**:
- Prisma ORM handles all database operations
- `lib/status-lifecycle.ts` validates transitions
- API routes handle request validation + transactions

### File Organization

```
.
├── app/
│   ├── (routes)/
│   │   ├── mission-control/[id]/
│   │   │   └── page.tsx              # ← Main kanban board page
│   │   ├── chat/[id]/
│   │   │   └── page.tsx              # ← Task chat page
│   │   ├── planning/[id]/
│   │   ├── directory/
│   │   └── summary/[id]/
│   └── api/
│       ├── tasks/
│       │   ├── route.ts              # GET/POST tasks
│       │   └── [id]/route.ts         # GET/PUT/DELETE task
│       └── agents/
│           ├── stream/route.ts       # ← Streaming agent responses
│           ├── plan/route.ts
│           ├── generate-tasks/route.ts
│           ├── tasks/route.ts
│           ├── team/route.ts
│           └── run/route.ts
├── components/
│   ├── mission-control/
│   │   └── MissionControlClient.tsx  # ← Interactive kanban UI
│   ├── task-chat/
│   │   └── TaskChatClient.tsx        # ← Chat interface
│   └── shared/
│       ├── AgentBadge.tsx
│       └── ChatBubble.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts
│   │   ├── tasks.ts
│   │   ├── projects.ts
│   │   └── conversations.ts
│   ├── agents/
│   │   ├── orchestrator.ts           # ← Multi-agent coordination
│   │   ├── configs.ts                # ← Agent definitions
│   │   ├── prompts.ts
│   │   └── tools/
│   │       └── index.ts              # ← Agent tools (CRUD)
│   ├── status-lifecycle.ts           # ← Transition rules (CRITICAL!)
│   ├── hooks/
│   │   └── useAgentStream.ts
│   └── validations/
│       └── schemas.ts
├── prisma/
│   └── schema.prisma                 # ← Database schema
└── types/
    └── domain.ts
```

---

## 5. EXISTING AUTOMATION & AUTO-MODE FEATURES

### Current Automation

#### 1. Status Transition Enforcement
- **Automatic Validation**: Every status update is validated against TRANSITION_MAP
- **Client-Side**: `isValidDropTarget()` prevents invalid drops
- **Server-Side**: `validateTransition()` in API route rejects invalid updates
- **Error Handling**: Returns 422 with allowed transitions if invalid

#### 2. Conversation Persistence
- **Automatic Save**: When agent finishes streaming, conversation auto-saved to DB
- **Includes**: Full message history + result + token usage
- **Location**: `/api/agents/stream/route.ts` (lines 80-96)

#### 3. Task Batch Creation
- **Transaction Support**: `createTasksBatch()` uses Prisma transaction
- **Bulk Insert**: Multiple tasks created in single operation
- **Used By**: `/api/agents/generate-tasks` endpoint

#### 4. Column Task Counts
- **Real-time**: Footer shows task counts per status
- **Live Updates**: Updates immediately after drag-drop
- **Function**: `tasks.filter((t) => t.status === columnId).length`

#### 5. Project Completion Validation
- **Close Project Button**: Only enabled when no tasks in TO_DO, IN_PROGRESS, IN_REVIEW, or BLOCKED
- **Logic**: `tasks.some((t) => t.status !== 'DONE' && t.status !== 'BLOCKED')`

### Missing Automation / Potential Features

**NOT Currently Implemented**:
- ❌ Auto-status updates (e.g., auto-move to DONE after review approved)
- ❌ Time-based automation (e.g., auto-block stale tasks)
- ❌ Recurring task generation
- ❌ Smart agent assignment (auto-select reviewer if task has "needs review" tag)
- ❌ Notification system
- ❌ Auto-prioritization based on due dates
- ❌ Bot/Workflow triggers (e.g., "when task moves to IN_REVIEW, notify reviewer agent")

### Extensibility Points for Automation

If you wanted to add automation:

1. **Status Transition Hooks**
   - Add middleware in `/api/tasks/[id]/route.ts` after updateTask()
   - Example: Auto-create conversation when status changes to IN_REVIEW

2. **Agent Auto-Triggers**
   - Add webhook handler in new route `/api/hooks/task-status-changed`
   - Trigger agent chain based on event

3. **Background Jobs**
   - Use cron-like service (e.g., node-cron)
   - Run in separate process or API endpoint
   - Example: Auto-block TODO tasks older than 30 days

4. **Agent Tool Callbacks**
   - Extend tools in `lib/agents/tools/index.ts`
   - Add side effects (e.g., when task_update called, trigger notification)

---

## 6. KEY DEPENDENCIES & IMPORTS

### Core Dependencies
```json
{
  "@jackchen_me/open-multi-agent": "Multi-agent AI framework",
  "next": "Framework (App Router, API routes)",
  "react": "UI library",
  "prisma": "ORM",
  "zod": "Input validation",
  "lucide-react": "Icons",
  "react-markdown": "Markdown rendering",
  "tailwindcss": "Styling"
}
```

### Critical Files to Know

| File | Why Important |
|------|---|
| `lib/status-lifecycle.ts` | SINGLE SOURCE OF TRUTH for task transitions |
| `components/mission-control/MissionControlClient.tsx` | Kanban board UI + drag-drop logic |
| `lib/agents/orchestrator.ts` | Multi-agent coordination |
| `lib/agents/configs.ts` | Agent role definitions |
| `lib/agents/tools/index.ts` | Tool implementations |
| `prisma/schema.prisma` | Database schema |
| `app/api/tasks/[id]/route.ts` | Task update API + transition validation |

---

## 7. WORKFLOW EXAMPLES

### User Workflow: Mission Control → Chat → Update

```
1. User navigates to /mission-control/[projectId]
2. Server fetches project + tasks, renders interactive board
3. User sees 5 columns with tasks
4. User clicks a task card
5. Browser navigates to /chat/[taskId]
6. Task chat page loads with agent selector
7. User selects "Developer" agent
8. User types: "Can you implement the login form?"
9. Frontend POSTs to /api/agents/stream with:
   {role: 'developer', userMessage: '...', taskId: '...'}
10. Agent streams response (real-time)
11. Agent may call tools: db_query, task_create, task_update
12. Conversation auto-saved to database
13. User sees conversation history below
14. User can click "Move to IN_REVIEW" button
15. Frontend PUTs /api/tasks/[taskId] with {status: 'IN_REVIEW'}
16. Backend validates transition (valid)
17. Task status updated in DB
18. User navigates back to mission control board
19. Task appears in IN_REVIEW column
```

### Agent Tool Usage Flow

```
1. Agent receives user message in chat
2. Agent determines which tool to use
3. Agent calls tool with input (e.g., task_create)
4. Tool handler in lib/agents/tools/index.ts executes
5. Tool queries/mutates database via Prisma
6. Tool returns result JSON
7. Agent receives result, incorporates into response
8. Response streams back to user
9. Conversation saved with tool calls visible
```

### Status Transition Flow

```
VALIDATION PATHS:

Path 1: Drag & Drop
  User drags TODO → IN_PROGRESS column
  → isValidDropTarget('TODO', 'IN_PROGRESS')
  → checks TRANSITION_MAP['TODO'].includes('IN_PROGRESS') = true
  → handleDrop() calls updateTaskStatus()
  → PUT /api/tasks/[id] {status: 'IN_PROGRESS'}
  → API validates transition via validateTransition()
  → updateTask() in lib/db/tasks.ts checks rules again
  → Prisma updates DB
  → Response returns updated task
  → setProject() updates React state
  → UI re-renders with task in new column

Path 2: Invalid Drop
  User drags DONE → TODO column
  → isValidDropTarget('DONE', 'TODO')
  → checks TRANSITION_MAP['DONE'].includes('TODO') = false
  → onDragOver prevents default (preventDefault() not called)
  → Column doesn't highlight
  → setDragOverColumn() not called
  → User can't drop there

Path 3: Invalid API Call
  Some code calls: updateTask(taskId, {status: 'DONE'})
  → Backend validates: validateTransition('IN_PROGRESS', 'DONE')
  → TRANSITION_MAP['IN_PROGRESS'].includes('DONE') = false
  → Throws InvalidTransitionError
  → API returns 422 with {error, allowed: [...]}
  → Frontend displays error to user
```

---

## 8. SUMMARY TABLE: KEY INTERACTIONS

| What | File | Function | Validates? |
|------|------|----------|-----------|
| Drag task | MissionControlClient.tsx | handleDrop() | Yes (client-side) |
| Update status via API | api/tasks/[id]/route.ts | PUT route | Yes (server-side) |
| DB operation | lib/db/tasks.ts | updateTask() | Yes (transition validation) |
| Get allowed transitions | lib/status-lifecycle.ts | getAllowedTransitions() | N/A (utility) |
| Stream agent response | api/agents/stream/route.ts | POST route | Via Zod schemas |
| Create task via agent | lib/agents/tools/index.ts | taskCreateTool | Via agent tool schema |
| Save conversation | api/agents/stream/route.ts | (in stream handler) | N/A (direct DB) |

---

## 9. HOW TO EXTEND

### Add a New Task Status
1. Edit `prisma/schema.prisma` → Update `enum TaskStatus { ... }`
2. Edit `lib/status-lifecycle.ts` → Add row to `TRANSITION_MAP`
3. Update `MissionControlClient.tsx` → Add to `KANBAN_COLUMNS` array
4. Update `MissionControlClient.tsx` → Add to `STATUS_COLORS` object
5. Run `npx prisma migrate dev --name add_new_status`
6. Update agent prompts/system prompts if behavior changes

### Add Agent Tool
1. Define in `lib/agents/tools/index.ts` using `defineTool()`
2. Export in `allTools` array
3. Update agent configs in `lib/agents/configs.ts` → Add tool name to `tools` array
4. Tool automatically available to that agent

### Add Automation Trigger
1. Add event handler in API route
2. Or create cron job in separate service
3. Call orchestrator functions (runAgent, runTeam, runTasks)
4. Persist results to database

---

## KEY INSIGHTS

1. **Status Lifecycle is Law**: `lib/status-lifecycle.ts` is validated at client, API, and DB levels
2. **No Real-time Updates**: UI updates only after API response (no WebSocket/real-time sync)
3. **Agent Tools are Powerful**: Agents can modify database structure via tools
4. **Conversation is Persistent**: Every chat is saved with full history + token usage
5. **Column Operations are Simple**: Just filter tasks by status (no hidden metadata)
6. **Transactions for Bulk Operations**: Batch task creation uses Prisma transactions
7. **Multi-layered Validation**: Status transitions checked 3 times (client, API, DB)

---

## QUICK REFERENCE: MOST IMPORTANT LOCATIONS

```typescript
// Transition Rules (THE SOURCE OF TRUTH)
lib/status-lifecycle.ts

// Main Kanban UI
components/mission-control/MissionControlClient.tsx

// Update Task Status
app/api/tasks/[id]/route.ts (PUT handler)

// Agent Interaction
app/api/agents/stream/route.ts

// Agent Definitions
lib/agents/configs.ts

// Agent Tools (Database Operations)
lib/agents/tools/index.ts

// Database Schema
prisma/schema.prisma
```


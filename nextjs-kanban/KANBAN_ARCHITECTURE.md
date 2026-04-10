# Next.js Personal Kanban - Complete Architecture Analysis

## Overview
This is a **Next.js-based Kanban application** with an integrated **multi-agent AI system**. The app combines traditional kanban board management with AI agents that can assist with task planning, development, and review processes.

---

## 1. MISSION-CONTROL PAGE STRUCTURE

### Location & Routes
- **Main Page**: `app/(routes)/mission-control/[id]/page.tsx`
  - Server component that fetches project and tasks data
  - Renders `MissionControlClient` with serialized project data
  
- **Client Component**: `components/mission-control/MissionControlClient.tsx`
  - Full interactive kanban board implementation
  - Handles drag-and-drop, task management, and status transitions

### Page Flow
```
/mission-control/[projectId]
    ↓
1. Server fetches project by ID via getProject()
2. Serializes project + tasks data
3. Passes to MissionControlClient (client-side)
4. Client renders interactive kanban board
```

### Header Section
- Project name and description
- Back button to home
- "Add Task" button (creates new task with prompt)
- Responsive layout with flex layout

### Main Kanban Board
- **5 Columns** displayed horizontally with overflow scroll
- Columns can be dragged/dropped into
- Task cards support drag-and-drop between columns
- Column headers show task count badges

### Footer Stats
- **Total tasks** count
- **In Progress** count (all non-DONE, non-BLOCKED tasks)
- **Done** count
- **Cancelled** count
- **Close Project** button (only enabled when no tasks in TO_DO, IN_PROGRESS, IN_REVIEW, or BLOCKED status)

---

## 2. KANBAN COLUMNS & TASK FLOW

### The 5 Columns (Statuses)
Database uses **TaskStatus** enum with 5 values:

| Column Name | Status Value | Purpose |
|-------------|--------------|---------|
| **To Do** | `TODO` | Initial state for new tasks |
| **In Progress** | `IN_PROGRESS` | Task is being actively worked on |
| **In Review** | `IN_REVIEW` | Task awaiting review/approval |
| **Done** | `DONE` | Task is complete (terminal state) |
| **Blocked** | `BLOCKED` | Task is stuck/cancelled (terminal state) |

### Status Transition Map
Defined in `lib/status-lifecycle.ts`:

```typescript
export const TRANSITION_MAP: Record<TaskStatusValue, TaskStatusValue[]> = {
  TODO:        ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'TODO', 'BLOCKED'],
  IN_REVIEW:   ['DONE', 'IN_PROGRESS', 'BLOCKED'],
  DONE:        [],           // terminal — no transitions out
  BLOCKED:     ['TODO'],     // restore only
}
```

### How Tasks Flow
1. **New tasks** start in `TODO`
2. **Can move to**: `IN_PROGRESS` or `BLOCKED`
3. From **IN_PROGRESS**: Can go to `IN_REVIEW`, back to `TODO`, or `BLOCKED`
4. From **IN_REVIEW**: Can complete to `DONE`, return to `IN_PROGRESS`, or `BLOCKED`
5. **DONE** is terminal - no transitions out
6. **BLOCKED** can only be restored to `TODO`

### Drag-and-Drop Behavior
- **Valid drops**: Only allowed transitions per lifecycle rules
- **Invalid drops**: Rejected with visual feedback (grayed out column)
- **Smooth transitions**: Database persists status changes via `/api/tasks/[id]` PUT

### Hover Actions on Task Cards
When hovering over a task card, 3 action buttons appear:

1. **Restore button** (RotateCcw icon) - Only shows if task is BLOCKED and can transition to TODO
2. **Cancel button** (XCircle icon) - Transitions to BLOCKED, opens confirmation dialog for reason
3. **Forward button** (ArrowRight icon) - Moves to next allowed status in lifecycle

---

## 3. AGENT/TASK INTERACTION SYSTEM

### Overview
The system has **3 specialized AI agents** that can interact with tasks:

| Agent Role | Name in UI | System Prompt | Capabilities |
|-----------|-----------|--------------|----------------|
| `architect` | Planner Agent | System design, task breakdown, planning | `db_query`, `project_create` |
| `developer` | Doer Agent | Implementation, coding, problem-solving | `db_query`, `task_create`, `task_update`, `task_delete`, `project_create` |
| `reviewer` | Reviewer Agent | Code review, quality check, best practices | `db_query` (read-only) |

### Agent Interaction Points

#### 1. **Task Chat Page** (`/chat/[taskId]`)
- Users open individual tasks for AI-assisted work
- Can select which agent to chat with
- Real-time streaming responses
- Multi-turn conversation support

**File**: `components/task-chat/TaskChatClient.tsx`

**Features**:
- Agent selection dropdown (Planner, Doer, Reviewer)
- Live streaming chat interface with markdown support
- Conversation history with pagination (3 items per page)
- Task status quick-update buttons
- Token usage tracking

**Chat Flow**:
```
User selects agent → Types message → Hits Enter
    ↓
Frontend sends to /api/agents/stream (POST)
    ↓
Backend builds prompt with task context
    ↓
Agent streams response with tool calls visible
    ↓
Conversation persisted to database
    ↓
Token usage + conversation history shown
```

#### 2. **Agent Tools** (`lib/agents/tools/index.ts`)
Agents have access to these database manipulation tools:

| Tool Name | Description | Agent Access |
|-----------|-------------|---------------|
| `db_query` | Query tasks, projects, conversations | All agents |
| `task_create` | Create new tasks | Architect, Developer |
| `task_update` | Update task (with transition validation) | Developer |
| `task_delete` | Delete tasks | Developer |
| `project_create` | Create new projects | Architect, Developer |

**Tool Example Usage**:
```typescript
// Agents can call tools like:
await dbQueryTool({ 
  table: 'tasks', 
  filter: { status: 'TODO' },
  limit: 10 
})
```

#### 3. **Planning/Project-Level Agents** (`/api/agents/plan`)
- Architect agent helps plan entire projects
- Takes user message + projectId
- Builds prompt with existing tasks
- Can create task batches

#### 4. **Generate Tasks Endpoint** (`/api/agents/generate-tasks`)
- Extracts tasks from conversation history
- Uses architect agent to parse planning conversation
- Returns structured task list as JSON

### User-Agent Interaction Flow
```
User clicks task in Mission Control
    ↓
Opens /chat/[taskId]
    ↓
Selects agent role (Planner/Doer/Reviewer)
    ↓
Sends message about task
    ↓
Frontend calls /api/agents/stream
    ↓
Agent processes with available tools
    ↓
Response streams back in real-time
    ↓
Conversation saved to DB
    ↓
Can reference conversation history in future sessions
```

---

## 4. STATE MANAGEMENT & DATA PERSISTENCE

### Database Schema (`prisma/schema.prisma`)

#### Project Model
```typescript
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tasks       Task[]   // One-to-many relationship
}
```

#### Task Model
```typescript
model Task {
  id            String         @id @default(uuid())
  title         String
  description   String?
  status        TaskStatus     @default(TODO)
  priority      TaskPriority   @default(MEDIUM)
  projectId     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  project       Project?       @relation(fields: [projectId])
  conversations Conversation[] // One-to-many
}
```

#### Conversation Model
```typescript
model Conversation {
  id         String   @id @default(uuid())
  taskId     String?
  messages   Json     // Array of {role, content, timestamp}
  result     Json?    // AI response text
  tokenUsage Json     // {input: number, output: number}
  createdAt  DateTime @default(now())
  task       Task?    @relation(fields: [taskId])
}
```

### Client-Side State (React)
In `MissionControlClient.tsx`:
```typescript
const [project, setProject] = useState(initialProject)
const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)
const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
const [draggingTaskStatus, setDraggingTaskStatus] = useState<TaskStatus | null>(null)
const [cancelTarget, setCancelTarget] = useState<Task | null>(null)
```

### API Endpoints for Data

#### Task Endpoints
```
GET    /api/tasks                     → Fetch all tasks (filterable by status/projectId)
POST   /api/tasks                     → Create new task
GET    /api/tasks/[id]                → Fetch specific task
PUT    /api/tasks/[id]                → Update task (status, title, priority, etc.)
DELETE /api/tasks/[id]                → Delete task
```

#### Agent Endpoints
```
POST   /api/agents/tasks              → Run multi-agent tasks with DAG
POST   /api/agents/team               → Run team-based problem solving
POST   /api/agents/plan               → Plan project with architect
POST   /api/agents/generate-tasks     → Extract tasks from conversation
POST   /api/agents/stream             → Stream agent response to client
POST   /api/agents/run                → Run single agent
```

#### Project Endpoints
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/[id]
PUT    /api/projects/[id]
DELETE /api/projects/[id]
```

---

## 5. OVERALL ARCHITECTURE

### Directory Structure
```
.
├── app/
│   ├── (routes)/
│   │   ├── mission-control/[id]/
│   │   │   └── page.tsx                    # Main kanban board page
│   │   ├── chat/[id]/
│   │   │   └── page.tsx                    # Task chat with agents
│   │   ├── planning/
│   │   ├── directory/
│   │   └── summary/
│   ├── api/
│   │   ├── tasks/
│   │   │   ├── route.ts                    # GET/POST tasks
│   │   │   └── [id]/route.ts               # GET/PUT/DELETE specific task
│   │   └── agents/
│   │       ├── stream/route.ts             # Stream agent responses
│   │       ├── plan/route.ts               # Planning endpoint
│   │       ├── generate-tasks/route.ts
│   │       ├── tasks/route.ts              # Run tasks endpoint
│   │       ├── team/route.ts               # Team endpoint
│   │       └── run/route.ts                # Run single agent
│   └── layout.tsx
│
├── components/
│   ├── mission-control/
│   │   └── MissionControlClient.tsx        # Main kanban board UI
│   ├── task-chat/
│   │   └── TaskChatClient.tsx              # Task chat interface
│   ├── shared/
│   │   ├── AgentBadge.tsx
│   │   └── ...
│   └── ui/
│       ├── button.tsx
│       ├── dropdown.tsx
│       └── ...
│
├── lib/
│   ├── db/
│   │   ├── client.ts                       # Prisma client
│   │   ├── tasks.ts                        # Task queries/mutations
│   │   ├── projects.ts                     # Project queries
│   │   └── conversations.ts                # Conversation persistence
│   ├── agents/
│   │   ├── orchestrator.ts                 # Multi-agent coordination
│   │   ├── configs.ts                      # Agent role configs
│   │   ├── prompts.ts                      # Prompt builders
│   │   └── tools/
│   │       └── index.ts                    # Agent tools (CRUD operations)
│   ├── status-lifecycle.ts                 # Transition rules (single source of truth)
│   ├── hooks/
│   │   └── useAgentStream.ts               # Streaming hook
│   └── validations/
│       └── schemas.ts
│
├── prisma/
│   └── schema.prisma                       # Database schema
│
├── constants/
│   └── agents.ts                           # Agent & column constants
│
└── types/
    └── domain.ts                           # Domain types
```

### Data Flow Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js Client)                    │
│                                                                  │
│  Mission Control Board          Task Chat Interface             │
│  ├─ Kanban Columns              ├─ Agent Selector               │
│  ├─ Task Cards (draggable)      ├─ Message History              │
│  ├─ Drag-drop state             ├─ Live Streaming               │
│  └─ Add/Remove Tasks            └─ Conversation Persistence     │
└─────────────────┬──────────────────────────────────┬────────────┘
                  │                                  │
                  │ HTTP (REST + SSE)               │ HTTP (REST + SSE)
                  │                                  │
┌─────────────────▼──────────────────────────────────▼────────────┐
│                   Backend (Next.js API Routes)                  │
│                                                                  │
│  Task API (/api/tasks)          Agent API (/api/agents)        │
│  ├─ GET all tasks               ├─ Stream endpoint               │
│  ├─ POST create task            ├─ Plan endpoint                 │
│  ├─ PUT update status           ├─ Generate tasks                │
│  └─ DELETE task                 ├─ Run tasks (DAG)              │
│                                 └─ Run team                      │
│                                                                  │
│  Orchestrator (/lib/agents)     Status Lifecycle                │
│  ├─ runAgent()                  ├─ Transition rules              │
│  ├─ runTeam()                   ├─ Validation                    │
│  └─ runTasks()                  └─ Error handling                │
│                                                                  │
│  Agent Tools:                   Multi-Agent Framework            │
│  ├─ db_query                    ├─ OpenMultiAgent                │
│  ├─ task_create                 ├─ Agent roles                   │
│  ├─ task_update                 ├─ Tool registry                 │
│  ├─ task_delete                 ├─ DAG scheduling                │
│  └─ project_create              └─ Stream events                 │
└─────────────────┬──────────────────────────────────┬────────────┘
                  │                                  │
                  │ SQL (Prisma ORM)                │ SQL (Prisma ORM)
                  │                                  │
┌─────────────────▼──────────────────────────────────▼────────────┐
│              Database (PostgreSQL)                               │
│                                                                  │
│  Projects          Tasks             Conversations              │
│  ├─ id             ├─ id             ├─ id                      │
│  ├─ name           ├─ title          ├─ taskId                  │
│  ├─ description    ├─ description    ├─ messages (JSON)         │
│  └─ timestamps     ├─ status         ├─ result (JSON)           │
│                    ├─ priority       ├─ tokenUsage (JSON)       │
│                    ├─ projectId      └─ timestamps              │
│                    └─ timestamps                                │
└────────────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Client State**: React hooks (useState, useCallback, useRef)
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons
- **Markdown**: React Markdown + remark-gfm
- **AI Framework**: `@jackchen_me/open-multi-agent`
- **LLM Provider**: OpenAI (gpt-4o-mini)
- **Validation**: Zod schemas
- **Streaming**: Server-Sent Events (SSE)

---

## 6. KEY FEATURES

### Mission Control Board Features
1. ✅ **Drag-and-drop** tasks between columns with validation
2. ✅ **Status transitions** enforced by lifecycle rules
3. ✅ **Task creation** via prompt modal
4. ✅ **Task actions** (move forward, cancel, restore)
5. ✅ **Visual feedback** for drag states
6. ✅ **Task counts** per column
7. ✅ **Project stats** in footer
8. ✅ **Project closing** only when all tasks complete/cancelled

### Agent Interaction Features
1. ✅ **Multi-turn conversations** with 3 agent roles
2. ✅ **Real-time streaming** responses
3. ✅ **Tool usage** (agents can create/update tasks)
4. ✅ **Conversation history** with pagination
5. ✅ **Token usage tracking**
6. ✅ **Markdown support** in responses
7. ✅ **Progress indicators** for tool calls
8. ✅ **Abort capability** to stop long-running streams

### Data Integrity
1. ✅ **Status lifecycle validation** (single source of truth)
2. ✅ **Transition rules** enforced at DB and API layers
3. ✅ **Zod schema validation** on all inputs
4. ✅ **Error handling** for invalid transitions
5. ✅ **Transaction support** for batch operations

---

## 7. FILE REFERENCE MAP

### Core Files to Know

| File | Purpose | Key Functions |
|------|---------|----------------|
| `app/(routes)/mission-control/[id]/page.tsx` | Server page for kanban | getProject, generateMetadata |
| `components/mission-control/MissionControlClient.tsx` | Main UI component | updateTaskStatus, handleDrop, getTasksByStatus |
| `lib/status-lifecycle.ts` | Transition rules | validateTransition, getAllowedTransitions |
| `lib/agents/orchestrator.ts` | Agent coordination | runAgent, runTeam, runTasks |
| `lib/agents/configs.ts` | Agent definitions | agentConfigs (architect, developer, reviewer) |
| `lib/agents/tools/index.ts` | Agent capabilities | dbQueryTool, taskCreateTool, etc. |
| `app/api/tasks/route.ts` | Task CRUD API | GET (list), POST (create) |
| `app/api/tasks/[id]/route.ts` | Individual task API | GET, PUT (with validation), DELETE |
| `app/api/agents/stream/route.ts` | Streaming endpoint | POST (stream agent response) |
| `prisma/schema.prisma` | Database structure | Project, Task, Conversation models |
| `lib/db/tasks.ts` | Task queries | getTasks, getTask, updateTask |
| `lib/db/conversations.ts` | Conversation storage | createConversation, getConversations |
| `components/task-chat/TaskChatClient.tsx` | Task chat UI | sendMessage, updateTaskStatus |
| `lib/hooks/useAgentStream.ts` | Streaming hook | startStream, abort |

---

## Summary: How It All Works Together

1. **User navigates to mission-control board** → Sees kanban with 5 columns
2. **User drags task to new column** → Status validated via lifecycle rules → API persists change
3. **User clicks task** → Opens chat interface for that specific task
4. **User selects an agent** and types message → Frontend streams response from backend
5. **Agent can use tools** (like create_task) → Tools access database directly
6. **Conversation saved** → Database stores messages, results, token usage
7. **User sees task history** → Pagination through past conversations
8. **Status updates via chat** → Both drag-drop and direct button updates work
9. **Project closure** → Only allowed when all tasks are DONE or BLOCKED

This creates a **cohesive system** where agents enhance kanban workflow through intelligent assistance while maintaining strict data integrity via lifecycle rules.


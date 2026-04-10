# Next.js Kanban App — Comprehensive Backend Architecture Analysis

**Date:** April 10, 2026  
**Purpose:** Full server-side code audit to plan backend refactor (post Atomic Design frontend refactor)

---

## 📊 Executive Summary

- **Backend Codebase Size:** ~1,241 lines in `/app/api`, ~23,741 lines total in `/lib` (excluding node_modules & generated)
- **Architecture:** Modular layered approach with clear separation: API Routes → DB Layer → Domain Logic
- **Database:** PostgreSQL + Prisma ORM with 5 core models (Project, Task, Conversation, PlanningThread, PlanningMessage)
- **Agent System:** Multi-agent AI orchestration using `@jackchen_me/open-multi-agent` library (Architect, Developer, Reviewer roles)
- **Key Issue:** Some schema/validation duplication across route files; mixed concerns in API routes

---

## 📁 Directory Structure

```
lib/
├── db/                 # Database access layer (5 files, ~300 LOC)
├── agents/             # AI agent orchestration & configs (3 files + tools)
├── hooks/              # React Query hooks for client (7 files, ~910 LOC)
├── utils/              # Security, parsing utilities (2 files, ~210 LOC)
├── validations/        # Centralized Zod schemas (1 file, ~186 LOC)
├── stores/             # Zustand client-side stores (1 file, ~100 LOC)
├── auto-mode/          # Column automation constants (1 file, ~43 LOC)
├── generated/          # Prisma client (auto-generated)
├── status-lifecycle.ts # Status transition rules (81 LOC) ⭐ SHARED LOGIC
├── status-mapping.ts   # Frontend ↔ DB status conversion (85 LOC) ⭐ SHARED LOGIC
└── utils.ts            # General utilities (28 LOC)

app/
└── api/                # 19 route files, ~1,241 LOC total
    ├── tasks/
    ├── projects/
    ├── conversations/
    ├── planning-threads/
    ├── agents/
    └── analytics/

prisma/
├── schema.prisma       # Database schema (125 LOC) ⭐ SCHEMA
├── seed.ts             # Sample data (82 LOC)
└── migrations/         # 4 migration files

types/
└── domain.ts           # Core TypeScript types (59 LOC) ⭐ SHARED TYPES

constants/
├── status.ts           # Status color mappings (29 LOC)
└── agents.ts           # Agent icons, colors, column defs (72 LOC)
```

---

## 🔍 Detailed File Breakdown

### Core Shared Logic (Independent of Routes)

#### **lib/status-lifecycle.ts** (81 LOC)
- **Purpose:** Single source of truth for valid task status transitions
- **Exports:** 
  - `TaskStatusValue` type (union of all DB statuses)
  - `TRANSITION_MAP` record (defines all valid state edges)
  - `getAllowedTransitions(from)` → array of valid target statuses
  - `validateTransition(from, to)` → `{ valid, allowed, message }`
  - `InvalidTransitionError` custom error class
- **Key Imports:** None (shared, can be imported everywhere)
- **Code Smell:** ✅ CLEAN – No duplication, pure functions, well-documented
- **Usage:** Referenced by API routes (`/tasks/[id]/route.ts`), DB layer, client hooks

#### **lib/status-mapping.ts** (85 LOC)
- **Purpose:** Bidirectional frontend ↔ database status conversion
- **Exports:**
  - `toDbStatus(frontendStatus)` → Prisma enum value
  - `toFrontendStatus(dbStatus)` → Lowercase frontend status
  - `getAllowedFrontendTransitions(frontendStatus)` → array of frontend statuses
  - `getAllowedDbTransitions(dbStatus)` → array of DB statuses
- **Key Imports:** `status-lifecycle`, `@/types/domain`
- **Code Smell:** ✅ CLEAN – Thin mapping layer, no business logic duplication
- **Usage:** Frontend components, API route validation
- **Frontend/Backend Split:** Frontend statuses (`todo`, `doing`, `review`, `done`, `cancelled`) map to Prisma enums (uppercase)

#### **lib/utils.ts** (28 LOC)
- **Purpose:** General utilities (Tailwind merging, ID generation, relative time formatting)
- **Exports:**
  - `cn(...inputs: ClassValue[])` → merged Tailwind classes
  - `newId()` → random short ID
  - `relativeTime(isoString)` → human-readable relative time ("5m ago")
- **Key Imports:** `clsx`, `tailwind-merge`
- **Code Smell:** ✅ CLEAN – Minimal, focused utilities
- **Usage:** UI components, everywhere

#### **types/domain.ts** (59 LOC)
- **Purpose:** Centralized TypeScript domain types
- **Exports:**
  - `TaskStatus` union (frontend lowercase statuses)
  - `AgentHint` union (agent roles as strings)
  - `UITaskStatus` (Prisma enum values for UI)
  - `UITaskPriority`, `ProjectDomain` unions
  - `UITask`, `UIProject`, `UIConversation` interfaces
  - `ChatMsg` interface
- **Key Imports:** None
- **Code Smell:** ⚠️ MINOR – Has both frontend (`TaskStatus`) and UI layer (`UITaskStatus`) types mixed; could be split
- **Usage:** Everywhere (constants, hooks, routes)

---

### Database Layer (lib/db/)

**Purpose:** Thin data access layer — each file wraps Prisma queries + business logic

#### **lib/db/client.ts** (27 LOC)
- **Purpose:** Singleton Prisma client with connection pooling
- **Exports:** Default export `prisma` (PrismaClient instance)
- **Config:**
  - Uses `@prisma/adapter-pg` with `pg.Pool` for connection pooling
  - Conditional global cache for dev to prevent reinitialization
  - Logs warnings/errors in dev, only errors in prod
- **Key Imports:** Generated Prisma client, `pg` driver
- **Code Smell:** ✅ CLEAN – Standard Prisma singleton pattern

#### **lib/db/tasks.ts** (99 LOC)
- **Purpose:** Task CRUD operations + status transition validation
- **Exports:**
  - `getTasks(status?, projectId?)` → array of tasks with project relation
  - `getTask(id)` → single task with project + conversations
  - `createTask(data)` → new task (validates defaults: TODO, MEDIUM priority)
  - `updateTask(id, data, currentStatus?)` → updates task, validates status transitions
  - `deleteTask(id)` → deletes task
  - `createTasksBatch(tasks[], projectId)` → batch insert (transaction-wrapped)
- **Key Imports:** `prisma`, Prisma enums, `status-lifecycle`
- **Code Smell:** ⚠️ MINOR – Type casting `as TaskStatusValue` in updateTask (line 55–56); could be stronger
- **Usage:** API routes (`/api/tasks/*`)

#### **lib/db/projects.ts** (52 LOC)
- **Purpose:** Project CRUD operations
- **Exports:**
  - `getProjects()` → all projects with tasks
  - `getProject(id)` → single project with tasks
  - `createProject(data)` → new project (supports optional domain)
  - `updateProject(id, data)` → update name/description only
  - `deleteProject(id)` → delete (cascade deletes tasks via schema)
  - `getProjectWithTaskCount(id)` → project with `_count.tasks` aggregate
- **Key Imports:** `prisma`, Prisma `ProjectDomain` enum
- **Code Smell:** ✅ CLEAN – Straightforward CRUD, minimal bloat
- **Usage:** API routes (`/api/projects/*`)

#### **lib/db/conversations.ts** (70 LOC)
- **Purpose:** Conversation (AI chat session) persistence
- **Exports:**
  - `getConversations(taskId?, limit=10, offset=0)` → paginated conversations
  - `getConversation(id)` → single conversation
  - `createConversation(data)` → new conversation + messages array (stored as JSON)
  - `updateConversation(id, data)` → update messages/result/tokenUsage
  - `deleteConversation(id)` → delete
- **Key Imports:** `prisma`
- **Code Smell:** ⚠️ MODERATE – Heavy use of `as any` type casting (lines 38–40, 57–60); messages/result/tokenUsage stored as JSON without schema validation
- **Usage:** API routes (`/api/conversations/*`)

#### **lib/db/planning-threads.ts** (50 LOC)
- **Purpose:** Planning thread (long-running planning conversations per project)
- **Exports:**
  - `getThreadsByProject(projectId)` → threads with latest message preview
  - `getThread(id)` → single thread with all messages
  - `createThread(projectId, title?)` → new thread (auto-titled "New Thread")
  - `updateThread(id, data)` → update title
  - `deleteThread(id)` → delete (cascade deletes messages)
- **Key Imports:** `prisma`
- **Code Smell:** ✅ CLEAN – Simple queries, comment notes cascade behavior
- **Usage:** API routes (`/api/planning-threads/*`)

#### **lib/db/planning-messages.ts** (52 LOC)
- **Purpose:** Messages within planning threads + auto-update thread timestamp
- **Exports:**
  - `getMessagesByThread(threadId)` → messages with mutation actions
  - `createMessage(threadId, role, content, tokenUsage?)` → new message + auto-updates thread.updatedAt
  - `getRecentMessages(threadId, limit=20)` → last N messages (returns in chrono order)
- **Key Imports:** `prisma`, Prisma `PlanningMessageRole` type
- **Code Smell:** ⚠️ MINOR – Auto-updates thread timestamp on every message creation (good for UI, adds side effect)
- **Usage:** API routes (`/api/planning-threads/[id]/messages/*`)

---

### Validation & Security (lib/validations/ + lib/utils/)

#### **lib/validations/schemas.ts** (186 LOC)
- **Purpose:** Centralized Zod schemas for all API input validation
- **Exports:** 19 Zod schemas + `validateEnv()` function
- **Key Schemas:**
  - `createTaskSchema`, `updateTaskSchema`, `taskQuerySchema`
  - `createProjectSchema`, `updateProjectSchema`
  - `createConversationSchema`, `conversationQuerySchema`
  - `runAgentSchema`, `streamAgentSchema`, `teamAgentSchema`, `taskPipelineSchema`
  - `createPlanningThreadSchema`, `planningThreadQuerySchema`, `sendPlanningMessageSchema`
  - `envSchema` + `validateEnv()` for startup validation
- **Key Imports:** `zod`
- **Code Smell:** ✅ CLEAN – Single source of truth for validation; good reuse pattern
- **Usage:** API routes (imported in most route files)

#### **lib/utils/security.ts** (141 LOC)
- **Purpose:** Security utilities: path sanitization, input validation, query guards
- **Exports:**
  - `sanitizeFilePath(unsafePath)` → normalized path with directory traversal prevention
  - `sanitizeString(input)` → removes null bytes & control chars
  - `stripHtml(input)` → removes HTML tags
  - `sanitizeUuid(id)` → validates & lowercases UUID
  - `validateToolParams<T>(params, required)` → validates tool params
  - `clampQueryLimit(limit?)` → ensures limit ≤ 100
  - `ALLOWED_SORT_FIELDS` + `validateSortField(model, field)` → prevents column injection
- **Key Imports:** `path` (Node.js)
- **Code Smell:** ✅ CLEAN – Well-structured, good defaults (e.g., limit clamp to 20 if undefined)
- **Usage:** Agent tools, future API guard middleware

#### **lib/utils/parseTaskMutations.ts** (68 LOC)
- **Purpose:** Parse task mutation directives from AI markdown responses
- **Exports:**
  - Types: `TaskMutationAdd`, `TaskMutationUpdate`, `TaskMutationDelete`, `ParsedContent`
  - Function: `parseTaskMutations(content)` → extracts JSON blocks from fenced code
- **Regex Pattern:** `` ```task-mutations\n[...]\n``` ``
- **Code Smell:** ⚠️ MINOR – Uses regex for markdown parsing (fragile); errors silently logged with `console.warn`
- **Usage:** AI response processing (planning-threads messages)

---

### Agent System (lib/agents/)

#### **lib/agents/configs.ts** (47 LOC)
- **Purpose:** Agent role configs (model, provider, tools, system prompt)
- **Exports:**
  - `AgentRole` type (`'architect' | 'developer' | 'reviewer'`)
  - `agentConfigs` record with 3 agent definitions
  - `getAgentConfigForDomain(role, domain)` → domain-specific config
  - `getAgentConfig(role)`, `getAvailableAgents()`
- **Agent Roles:**
  - **Architect:** gpt-4o-mini, tools: `db_query`, `project_create`
  - **Developer:** gpt-4o-mini, tools: `db_query`, `task_create`, `task_update`, `task_delete`, `project_create`
  - **Reviewer:** gpt-4o-mini, tools: `db_query`
- **Key Imports:** `@jackchen_me/open-multi-agent`, `./prompts`, `./tools`
- **Code Smell:** ✅ CLEAN – Centralized config, easy to extend
- **Usage:** Orchestrator, agent stream routes

#### **lib/agents/orchestrator.ts** (81 LOC)
- **Purpose:** Coordinate multi-agent workflows (single agents, teams, DAG task pipelines)
- **Exports:**
  - `runAgent(role, prompt, onProgress?)` → run single agent
  - `runTeam(goal, agents[], onProgress?)` → coordinate multiple agents
  - `runTasks(tasks[], onProgress?)` → DAG scheduling for task dependencies
- **Key Implementation:**
  - Builds tool registry once per process (shared across agents)
  - Uses `OpenMultiAgent` for team/DAG workflows
  - `Agent` class for single-agent runs (has shared registry)
- **Key Imports:** `@jackchen_me/open-multi-agent`, `./configs`, `./tools`
- **Code Smell:** ✅ CLEAN – Well-structured orchestration; comments explain registry sharing
- **Usage:** API routes (`/api/agents/*`), planning thread message handler

#### **lib/agents/prompts.ts** (555 LOC)
- **Purpose:** System prompts for agents + domain-specific prompts
- **Exports:**
  - `SYSTEM_PROMPTS` record with `architect`, `developer`, `reviewer` prompts
  - `DOMAIN_SYSTEM_PROMPTS` record with domain-aware variants
  - `buildChatPrompt(role, userMessage, taskId)` → constructs prompt from DB context
  - `buildPlanPrompt(content, projectId, history)` → planning-specific prompt
- **Key Imports:** `./configs`, database functions (`getTasks`, `getProject`, etc.)
- **Code Smell:** ⚠️ MODERATE – 555 LOC is large; prompts hardcoded as strings; makes domain extensions difficult
- **Usage:** Orchestrator, agent stream routes, planning message handler

#### **lib/agents/tools/index.ts** (226 LOC)
- **Purpose:** Tool definitions for agent execution (DB queries, mutations)
- **Exports:** `allTools` array of Tool definitions (10+ tools)
- **Tool Categories:**
  - **Query:** `db_query`, `list_tasks`, `list_projects`
  - **Mutation:** `task_create`, `task_update`, `task_delete`, `project_create`
  - **Utility:** Custom tools (not detailed here)
- **Key Imports:** `@jackchen_me/open-multi-agent`, db functions, `security.ts`
- **Code Smell:** ⚠️ MODERATE – Tool implementations inline; security calls in tools (line references in security.ts)
- **Usage:** Registry building (configs, orchestrator)

---

### React Query Hooks (lib/hooks/)

**Purpose:** Client-side data fetching & caching using TanStack React Query

#### **lib/hooks/useTasks.ts** (139 LOC)
- **Exports:**
  - `useTasks(params?)` → query hook for filtered tasks list
  - `useTask(id)` → query hook for single task
  - `useCreateTask()` → mutation hook (POST) + invalidates `['tasks']` cache
  - `useUpdateTask()` → mutation hook (PUT) + optimistic updates + transition error handling
  - `useDeleteTask()` → mutation hook (DELETE)
  - `TransitionError` class for 422 status responses
- **Query Keys:** `['tasks', params]`, `['tasks', id]`
- **Optimistic Update:** Yes (in `useUpdateTask`)
- **Code Smell:** ⚠️ MINOR – Transition error parsing is fragile (checks for `from`/`to`/`allowed` fields); could use stricter typing
- **Usage:** Task kanban board, task details, task forms

#### **lib/hooks/useProjects.ts** (106 LOC)
- **Exports:** Similar pattern: `useProjects()`, `useProject(id)`, `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()`
- **Query Keys:** `['projects']`, `['projects', id]`
- **Code Smell:** ✅ CLEAN – Standard TRQ patterns, good error handling
- **Usage:** Project sidebar, project details

#### **lib/hooks/useConversations.ts** (72 LOC)
- **Exports:** `useConversations(taskId?, limit?, offset?)`, `useConversation(id)`, `useCreateConversation()`
- **Query Keys:** `['conversations', params]`, `['conversations', id]`
- **Code Smell:** ✅ CLEAN – Pagination-aware
- **Usage:** Conversation history views

#### **lib/hooks/usePlanningThreads.ts** (60 LOC)
- **Exports:** Query + mutation hooks for planning threads
- **Query Keys:** `['planning-threads']`, `['planning-threads', id]`
- **Code Smell:** ✅ CLEAN
- **Usage:** Planning thread list, thread details

#### **lib/hooks/usePlanningMessages.ts** (83 LOC)
- **Exports:** Hooks for fetching/sending planning messages
- **Query Keys:** `['planning-messages', threadId]`
- **Special:** `useSendPlanningMessage()` handles streaming (server-sent events)
- **Code Smell:** ⚠️ MINOR – SSE handling may have edge cases (retry logic not visible)
- **Usage:** Planning thread message UI

#### **lib/hooks/useAgentStream.ts** (154 LOC)
- **Purpose:** SSE client for agent streaming responses
- **Exports:**
  - `useAgentStream()` → manages SSE connection, parses events
  - Returns: `{ isConnected, isStreaming, events, error, startStream, stopStream }`
- **Event Types:** `started`, `token`, `progress`, `done`, `error`
- **Code Smell:** ⚠️ MODERATE – Builds EventSource URL client-side; no reconnection logic; error recovery minimal
- **Usage:** Agent chat widget, live streaming responses

#### **lib/hooks/useColumnAutoMode.ts** (295 LOC)
- **Purpose:** Auto-process tasks in kanban column (trigger agent for task based on column status)
- **Exports:** `useColumnAutoMode(column, tasks)` → manages automation for a column
- **Features:** Enable/disable per column, process tasks sequentially, error handling
- **Code Smell:** ⚠️ MODERATE – Large hook (295 LOC); complex state machine for column processing; unclear if side effects are properly scoped
- **Usage:** Kanban board (one instance per column)

---

### Stores (lib/stores/)

#### **lib/stores/uiStore.ts** (101 LOC)
- **Purpose:** Zustand stores for ephemeral client UI state (not persisted)
- **Exports:** 4 Zustand stores:
  1. **useModalStore** — manages open modal type + payload
  2. **useTaskFormStore** — form state for task creation (title, description, priority, projectId)
  3. **useNavStore** — sidebar collapsed state
  4. **useAgentStreamStore** — agent streaming UI state (isStreaming, events, error)
- **Code Smell:** ✅ CLEAN – Well-scoped, minimal stores, good separation
- **Usage:** Modal controllers, form inputs, navigation, streaming UI

---

### Constants (constants/)

#### **constants/status.ts** (29 LOC)
- **Purpose:** Status → Tailwind color mapping for badges/badges
- **Exports:**
  - `STATUS_COLORS` record (bordered badge classes)
  - `STATUS_COLORS_COMPACT` record (compact badge classes)
- **Statuses:** TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED
- **Code Smell:** ✅ CLEAN – Simple, DRY
- **Usage:** Task badges, status displays

#### **constants/agents.ts** (72 LOC)
- **Purpose:** Agent & kanban column metadata
- **Exports:**
  - `AGENT_MAPPING` (TaskStatus → agent name)
  - `AGENT_ICONS` (agent name → Lucide icon component)
  - `AGENT_COLORS` (agent name → Tailwind classes)
  - `STATUS_COLORS` (TaskStatus → Tailwind classes) ⚠️ duplicate of `constants/status.ts`
  - `KANBAN_COLUMNS` (array of column definitions with icons & agents)
- **Code Smell:** ⚠️ MODERATE – `STATUS_COLORS` defined in both `status.ts` and `agents.ts` (values differ slightly)
- **Usage:** UI components, agent stream, kanban board

---

### Auto-Mode Configuration (lib/auto-mode/)

#### **lib/auto-mode/constants.ts** (43 LOC)
- **Purpose:** Column automation configuration
- **Exports:**
  - Types: `TaskStatus`, `AutoModeStatus`, `AutoModeColumnState`
  - Constants: `AUTO_MODE_COLUMNS`, `COLUMN_AGENT_MAP`, `DEFAULT_PROMPTS`
  - Factory: `createInitialColumnState()`
- **Details:**
  - Supports TODO, IN_PROGRESS, IN_REVIEW (not DONE/BLOCKED)
  - Maps columns to agents (TODO→architect, IN_PROGRESS→developer, IN_REVIEW→reviewer)
  - Default prompts per column
- **Code Smell:** ✅ CLEAN – Well-organized automation config
- **Usage:** `useColumnAutoMode` hook, column UI

---

## 🔗 API Routes (app/api/)

**Total Lines:** ~1,241 across 19 route files

### Route Structure

```
/api
├── /tasks
│   ├── GET  (fetch all/filtered)
│   ├── POST (create)
│   └── /[id]
│       ├── GET (fetch single)
│       ├── PUT (update + transition validation)
│       └── DELETE
├── /projects
│   ├── GET (fetch all)
│   ├── POST (create)
│   └── /[id]
│       ├── GET (fetch single)
│       ├── PUT (update)
│       └── DELETE
├── /conversations
│   ├── GET (fetch all/paginated)
│   ├── POST (create + store messages as JSON)
│   ├── /token-usage (GET analytics)
│   └── /[id]
│       ├── GET
│       ├── PUT
│       └── DELETE
├── /planning-threads
│   ├── GET (fetch threads for project + preview)
│   ├── POST (create)
│   └── /[id]
│       ├── GET (fetch single + all messages)
│       ├── PUT (update title)
│       ├── DELETE
│       └── /messages
│           ├── GET (fetch all)
│           ├── POST (send message + call agent)
│           └── /[messageId]
│               └── /mutations (POST handle approved/dismissed mutations)
├── /agents
│   ├── /run (POST single agent)
│   ├── /stream (POST with SSE response)
│   ├── /team (POST multi-agent coordination)
│   ├── /tasks (POST task pipeline)
│   ├── /plan (POST planning agent)
│   ├── /generate-tasks (POST generate tasks from conversation)
│   └── /test/agents (test endpoint)
├── /analytics
│   └── /token-usage (GET LLM token stats)
```

### Key Route Patterns

#### **Pattern 1: CRUD Routes (Tasks, Projects)**
Example: `/api/tasks/route.ts`
```
- GET: Fetch with optional filters (status, projectId) → getTasks()
- POST: Create with validation → createTask()
- Error handling: Zod validation → 400, server errors → 500
- ⚠️ CODE SMELL: Schema duplicated inline (lines 5–16) instead of importing from lib/validations
```

Example: `/api/tasks/[id]/route.ts`
```
- GET: Fetch single task → getTask()
- PUT: Update + validate status transitions
  - Fetches current status for validation
  - Catches InvalidTransitionError → 422 with details
- DELETE: Delete task
- ⚠️ CODE SMELL: Schema duplicated inline (lines 6–15); type casting needed
```

#### **Pattern 2: Planning Thread Messages (Orchestration)**
Example: `/api/planning-threads/[id]/messages/route.ts`
```
- GET: Fetch all messages for thread
- POST: Send user message → auto-call agent → store response
  - Creates user message immediately (for optimistic UI)
  - Auto-titles thread on first message
  - Fetches recent messages (20) for context
  - Calls architect agent via runAgent('architect', prompt)
  - Stores assistant response + token usage
- 💡 PATTERN: Direct agent invocation in route handler
- ⚠️ CODE SMELL: Long POST handler (~65 LOC); mixed concerns (DB + agent calling)
```

#### **Pattern 3: Agent Streaming**
Example: `/api/agents/stream/route.ts`
```
- POST: Start streaming agent response via Server-Sent Events
  - Takes role, userMessage, taskId, optional messages history
  - Builds prompt via buildChatPrompt(role, userMessage, taskId)
  - Creates agent with registry + tools
  - Streams events: started → token (delta) → progress → done
  - Accumulates response text, persists to DB on completion
- 💡 PATTERN: ReadableStream for SSE, real-time token streaming
- ⚠️ CODE SMELL: Long POST handler; registry rebuilt per request (should reuse)
```

#### **Pattern 4: Validation Consistency**
⚠️ **MAJOR CODE SMELL:**
- `/api/tasks/route.ts` and `/api/tasks/[id]/route.ts` define `taskStatusEnum` & `taskPriorityEnum` inline
- `/api/projects/route.ts` imports from `lib/validations/schemas`
- `/api/conversations/route.ts` defines schema inline again
- **Result:** 3+ copies of same validation logic; hard to maintain

---

## 🗄️ Database Schema (prisma/schema.prisma)

```prisma
enum ProjectDomain {
  SOFTWARE_ENGINEERING, MARKETING, SALES, LOGISTICS
}

enum TaskStatus {
  TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED
}

enum TaskPriority {
  LOW, MEDIUM, HIGH, URGENT
}

model Project {
  id, name, description, domain, createdAt, updatedAt
  tasks: Task[], planningThreads: PlanningThread[]
  @@index([createdAt])
}

model Task {
  id, title, description, status, priority, projectId, createdAt, updatedAt
  project: Project?, conversations: Conversation[]
  @@index([status, priority, createdAt, projectId])
}

model Conversation {
  id, taskId, messages (JSON), result (JSON), tokenUsage (JSON), createdAt
  task: Task?
  @@index([taskId, createdAt])
}

model PlanningThread {
  id, projectId, title, createdAt, updatedAt
  project: Project (onDelete: Cascade), messages: PlanningMessage[]
  @@index([projectId, updatedAt])
}

model PlanningMessage {
  id, threadId, role (enum), content, tokenUsage (JSON), createdAt
  thread: PlanningThread (onDelete: Cascade), mutationActions: MutationAction[]
  @@index([threadId, createdAt])
}

model MutationAction {
  id, messageId, mutationIndex, action (enum: approved|dismissed), createdAt
  message: PlanningMessage (onDelete: Cascade)
  @@unique([messageId, mutationIndex])
}
```

**Schema Analysis:**
- ✅ Good: Cascade deletes, proper indexes, enum constraints
- ⚠️ JSON columns (messages, result, tokenUsage) lack schema validation → stored as `any`
- ⚠️ Task.projectId nullable but no cascade delete (orphaned tasks possible)

---

## 🔄 Data Flow & Concerns Mapping

### Task CRUD Flow
```
Client Component
    ↓
useUpdateTask() hook
    ↓ (optimistic update)
PUT /api/tasks/[id]
    ↓
validateTransition (status-lifecycle)
    ↓
updateTask() (lib/db/tasks)
    ↓
Prisma update
    ↓
Response to client
    ↓
React Query invalidate ['tasks', id] + ['tasks']
    ↓
UI re-renders
```

### Agent Streaming Flow
```
Client starts SSE
    ↓
POST /api/agents/stream
    ↓
buildChatPrompt (agent/prompts)
    ↓
Agent.stream() (agent orchestrator + tools)
    ↓
Emit: started → token (delta) → done
    ↓
Accumulate response
    ↓
createConversation (lib/db/conversations)
    ↓
Response complete to client
    ↓
useAgentStream hook updates UI
```

### Planning Thread Flow
```
Client sends message
    ↓
POST /api/planning-threads/[id]/messages
    ↓
createMessage (user role)
    ↓
Auto-title thread if first message
    ↓
buildPlanPrompt + runAgent('architect', prompt)
    ↓
createMessage (assistant response + tokenUsage)
    ↓
Response to client with userMessage + assistantMessage
    ↓
usePlanningMessages hook invalidates cache
    ↓
UI re-renders thread with new messages
```

---

## 🚨 Code Quality & Patterns Analysis

### Code Smells Identified

| Issue | Severity | Location | Count |
|-------|----------|----------|-------|
| Schema/validation duplication | 🔴 HIGH | `/api/tasks/route.ts`, `[id]/route.ts`, `/conversations/route.ts` | 3+ |
| Type casting with `as any` | 🟡 MEDIUM | `lib/db/conversations.ts` (lines 38–40, 57–60) | 2 |
| JSON columns without schema | 🟡 MEDIUM | `conversations.messages/result`, `planning-messages.tokenUsage` | 3 |
| Registry rebuilt per request | 🟡 MEDIUM | `/api/agents/stream/route.ts` line 57 | 1 |
| Long route handlers (65+ LOC) | 🟡 MEDIUM | `/api/planning-threads/[id]/messages/route.ts` | 1+ |
| Regex for markdown parsing | 🟡 MEDIUM | `lib/utils/parseTaskMutations.ts` | 1 |
| Duplicate STATUS_COLORS exports | 🟡 MEDIUM | `constants/status.ts` vs `constants/agents.ts` | 1 |
| Status type duplication | 🟡 MEDIUM | `lib/auto-mode/constants.ts` redefines `TaskStatus` | 1 |
| Nullable projectId (no cascade) | 🟡 MEDIUM | `prisma/schema.prisma` Task model | 1 |
| SSE error recovery minimal | 🟡 MEDIUM | `lib/hooks/useAgentStream.ts` | 1 |

### Positive Patterns

| Pattern | Benefit | Location |
|---------|---------|----------|
| Centralized Zod schemas | Single source of truth | `lib/validations/schemas.ts` |
| Status lifecycle isolation | Reusable across client/server | `lib/status-lifecycle.ts` |
| Thin DB layer | Clear separation of concerns | `lib/db/*.ts` |
| Shared agent registry | Efficient tool reuse | `lib/agents/orchestrator.ts` |
| Zustand for ephemeral UI state | Clear state management | `lib/stores/uiStore.ts` |
| Optimistic updates in hooks | Better UX | `lib/hooks/useTasks.ts` |
| Security utilities module | Centralized validation | `lib/utils/security.ts` |
| Domain types module | Shared across layers | `types/domain.ts` |

---

## 📐 Recommended Backend Refactor Plan (Atomic Design Approach)

### Phase 1: Normalize & Deduplicate

1. **Consolidate Schema Validation**
   - Extract all inline Zod schemas from route files
   - Move to centralized locations per domain (TaskSchema, ProjectSchema, etc.)
   - Create barrel exports: `lib/validations/tasks.ts`, `lib/validations/projects.ts`, etc.
   - Update all routes to import

2. **Fix Type Duplication**
   - Move `TaskStatus` definition to `types/domain.ts` (single source)
   - Remove from `lib/auto-mode/constants.ts`
   - Update imports

3. **Resolve STATUS_COLORS Conflict**
   - Keep `constants/status.ts` as primary (UI-agnostic)
   - Update `constants/agents.ts` to import from `status.ts` and extend
   - Or merge into single file with clear sections

### Phase 2: API Route Refactoring (Atomic Layer)

**Goal:** Extract common patterns into smaller, composable route handlers

1. **Create Route Utilities (lib/api/)**
   ```
   lib/api/
   ├── handlers/
   │   ├── createCrudHandlers.ts    (GET, POST, PUT, DELETE patterns)
   │   ├── withValidation.ts        (HOC for Zod validation)
   │   ├── withErrorHandling.ts     (Consistent error responses)
   │   └── withAuth.ts              (placeholder for auth)
   └── responses.ts                  (JsonResponse helpers)
   ```

2. **Example Refactored Route:**
   ```ts
   // Before: 62 LOC with mixed concerns
   // app/api/tasks/route.ts
   export const GET = withErrorHandling(async (req) => {
     const { status, projectId } = taskQuerySchema.parse(req.searchParams)
     const tasks = await getTasks(status, projectId)
     return JsonResponse(tasks)
   })
   
   export const POST = withValidation(createTaskSchema, async (body) => {
     const task = await createTask(body)
     return JsonResponse(task, 201)
   })
   ```

3. **Extract Business Logic from Routes**
   - Move orchestration logic out of `/api/planning-threads/[id]/messages`
   - Create `lib/services/planningService.ts` with `sendPlanningMessage(threadId, content)`
   - Routes become thin adapters to services

### Phase 3: Service Layer (Atomic Molecules)

**Goal:** Group related DB + business logic operations

```
lib/services/
├── TaskService.ts      (task CRUD + transitions)
├── ProjectService.ts   (project CRUD)
├── ConversationService.ts (conversation CRUD + AI calls)
├── PlanningService.ts  (planning threads + messages + agent calls)
└── AgentService.ts     (agent orchestration, team workflows)
```

**Example:**
```ts
// lib/services/TaskService.ts
export class TaskService {
  static async updateWithTransition(id: string, updates: Partial<Task>, currentStatus?: TaskStatus) {
    if (updates.status && currentStatus) {
      const result = validateTransition(currentStatus, updates.status)
      if (!result.valid) throw new InvalidTransitionError(...)
    }
    return updateTask(id, updates, currentStatus)
  }
}
```

### Phase 4: Type Safety & JSON Columns

1. **Create TypeScript types for JSON columns**
   ```ts
   // types/conversation.ts
   export interface ConversationMessage {
     role: 'user' | 'assistant' | 'system'
     content: string
     timestamp: Date
     toolCalls?: unknown
   }
   
   export interface ConversationData {
     messages: ConversationMessage[]
     result?: unknown
     tokenUsage?: { input: number; output: number }
   }
   ```

2. **Add runtime validation**
   ```ts
   const conversationDataSchema = z.object({
     messages: z.array(conversationMessageSchema),
     result: z.unknown().optional(),
     tokenUsage: z.object({...}).optional(),
   })
   ```

3. **Update db/conversations.ts**
   ```ts
   export async function createConversation(data: ConversationData) {
     const validated = conversationDataSchema.parse(data)
     return prisma.conversation.create({
       data: {
         messages: validated.messages,
         result: validated.result,
         tokenUsage: validated.tokenUsage,
       }
     })
   }
   ```

### Phase 5: Orchestration & Event System (Atomic Organisms)

1. **Create event emitters for async operations**
   ```ts
   // lib/events/index.ts
   export const taskEvents = {
     created: new EventEmitter<Task>(),
     updated: new EventEmitter<Task>(),
     statusChanged: new EventEmitter<{ task: Task; from: Status; to: Status }>(),
   }
   ```

2. **Extract agent logic into dedicated orchestrator**
   ```ts
   // lib/orchestration/AgentOrchestrator.ts
   export class AgentOrchestrator {
     async processPlanningMessage(threadId, content) { ... }
     async processTaskWithAgent(taskId, agent, prompt) { ... }
   }
   ```

3. **Registry pattern for tools/agents**
   ```ts
   // lib/orchestration/registry.ts
   export class ToolRegistry {
     static registerTask = registerTools([...])
     static registerAgent = registerAgents([...])
   }
   ```

### Phase 6: Documentation & Type Exports

1. **Create barrel exports**
   ```ts
   // lib/db/index.ts
   export * from './tasks'
   export * from './projects'
   export * from './conversations'
   export * from './planning-threads'
   export * from './planning-messages'
   
   // lib/services/index.ts
   export { TaskService } from './TaskService'
   export { AgentService } from './AgentService'
   // ... etc
   ```

2. **Create README for each domain**
   ```
   lib/db/README.md
   lib/services/README.md
   lib/api/README.md
   ```

3. **Document API contract**
   ```
   docs/api/
   ├── tasks.md
   ├── projects.md
   ├── planning-threads.md
   └── agents.md
   ```

---

## 📊 Size & Metrics Summary

| Component | LOC | Files | Status |
|-----------|-----|-------|--------|
| **DB Layer** | ~300 | 5 | ✅ Well-structured, needs 1 fix (task.projectId cascade) |
| **API Routes** | ~1,241 | 19 | 🟡 Needs consolidation & service extraction |
| **Agent System** | ~900 | 4 | 🟡 Prompts too large (555 LOC), registry rebuild issue |
| **Validations** | ~186 | 1 | ✅ Centralized, good reuse |
| **Hooks** | ~910 | 7 | 🟡 Large hook for column auto-mode, SSE error handling |
| **Utilities** | ~210 | 2 | ✅ Focused, well-designed |
| **Stores** | ~101 | 1 | ✅ Minimal, well-scoped |
| **Types & Constants** | ~232 | 3 | 🟡 Minor duplication |
| **Prisma Schema** | ~125 | 1 | ✅ Good design, 1 security issue |
| **Seed** | ~82 | 1 | ✅ Simple |
| **TOTAL (excl. generated)** | ~4,187 | 44 | 🟡 Ready for refactor |

---

## ✅ Refactoring Checklist

### Priority 1: Foundation (Blocking)
- [ ] Consolidate Zod schemas from routes into `lib/validations/{domain}.ts`
- [ ] Fix Task.projectId cascade delete in schema
- [ ] Create JsonResponse + withValidation helpers in `lib/api/`

### Priority 2: Core (High Value)
- [ ] Extract planning message logic into `PlanningService.ts`
- [ ] Extract conversation logic into `ConversationService.ts`
- [ ] Fix agent registry rebuilding (cache per process)
- [ ] Add JSON column type validation

### Priority 3: Enhancement (Nice to Have)
- [ ] Split `constants/agents.ts` duplications
- [ ] Improve SSE error recovery & reconnection
- [ ] Extract markdown parsing to separate utility
- [ ] Reduce prompts.ts size via parameterization

### Priority 4: Polish (Optional)
- [ ] Add OpenAPI/Swagger docs
- [ ] Create API middleware layer
- [ ] Add request/response logging
- [ ] Create Drizzle ORM migration plan (if moving from Prisma)

---

## 🎯 Conclusion

Your backend has **solid foundations** with a clean DB layer, centralized validations, and good agent orchestration. However, it's ready for the **Atomic Design refactor** to:

1. **Eliminate duplication** (schemas, types, constants)
2. **Extract services** (business logic out of routes)
3. **Standardize patterns** (error handling, validation, responses)
4. **Improve type safety** (JSON columns, tool parameters)
5. **Optimize performance** (registry caching, query optimization)

The refactor should follow the same principles as your frontend: **Atoms** (types, schemas, utilities) → **Molecules** (services, handlers) → **Organisms** (route orchestration) → **Templates** (API patterns).

**Estimated Effort:** 3-5 days for full refactor (foundation to polish)


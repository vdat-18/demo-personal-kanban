# Backend File Index & Quick Lookup

## 📂 Directory Tree with LOC & Key Functions

```
lib/
├── db/                                    [~300 LOC total]
│   ├── client.ts                          [27 LOC] Prisma singleton + connection pooling
│   ├── tasks.ts                           [99 LOC] Task CRUD + batch + transition validation
│   ├── projects.ts                        [52 LOC] Project CRUD + task count
│   ├── conversations.ts                   [70 LOC] Conversation CRUD (JSON columns)
│   └── planning-messages.ts               [52 LOC] Messages + auto-update parent thread
│
├── agents/                                [~900 LOC total]
│   ├── configs.ts                         [47 LOC] Agent role configs (Architect/Developer/Reviewer)
│   ├── orchestrator.ts                    [81 LOC] runAgent/runTeam/runTasks orchestration
│   ├── prompts.ts                         [555 LOC] ⚠️ TOO LARGE - system & domain prompts
│   └── tools/
│       └── index.ts                       [226 LOC] Tool definitions (query + mutation)
│
├── hooks/                                 [~910 LOC total]
│   ├── useTasks.ts                        [139 LOC] Query/mutation hooks + transition error handling
│   ├── useProjects.ts                     [106 LOC] Query/mutation hooks
│   ├── useConversations.ts                [72 LOC] Paginated queries
│   ├── usePlanningThreads.ts              [60 LOC] Query/mutation hooks
│   ├── usePlanningMessages.ts             [83 LOC] Query/mutation + SSE handling
│   ├── useAgentStream.ts                  [154 LOC] SSE client (⚠️ no reconnection)
│   └── useColumnAutoMode.ts               [295 LOC] ⚠️ LARGE - column automation state
│
├── utils/                                 [~210 LOC total]
│   ├── security.ts                        [141 LOC] Sanitization, validation, query guards
│   └── parseTaskMutations.ts              [68 LOC] Regex-based markdown parsing
│
├── stores/                                [~101 LOC]
│   └── uiStore.ts                         [101 LOC] 4 Zustand stores (modal, form, nav, agent)
│
├── validations/                           [~186 LOC]
│   └── schemas.ts                         [186 LOC] 19 Zod schemas + validateEnv()
│
├── auto-mode/                             [~43 LOC]
│   └── constants.ts                       [43 LOC] Automation config + DEFAULT_PROMPTS
│
├── generated/                             [auto-generated]
│   └── prisma/                            Prisma client types + models
│
├── status-lifecycle.ts                    [81 LOC] ✅ CLEAN - transition validation
├── status-mapping.ts                      [85 LOC] ✅ CLEAN - frontend↔DB conversion
└── utils.ts                               [28 LOC] ✅ CLEAN - cn(), newId(), relativeTime()

app/
└── api/                                   [~1,241 LOC total - 19 routes]
    ├── tasks/
    │   ├── route.ts                       [62 LOC] GET (filter) + POST (create)
    │   │                                  ⚠️ Schema duplicated inline
    │   └── [id]/
    │       └── route.ts                   [94 LOC] GET + PUT (transition validation) + DELETE
    │                                      ⚠️ Schema duplicated inline
    ├── projects/
    │   ├── route.ts                       [43 LOC] GET + POST
    │   │                                  ✅ Uses lib/validations/schemas
    │   └── [id]/
    │       └── route.ts                   [~40 LOC] GET + PUT + DELETE
    │
    ├── conversations/
    │   ├── route.ts                       [74 LOC] GET + POST
    │   │                                  ⚠️ Schema duplicated inline
    │   ├── [id]/
    │   │   └── route.ts                   [~30 LOC] GET + PUT + DELETE
    │   └── token-usage/
    │       └── route.ts                   [~20 LOC] Analytics
    │
    ├── planning-threads/
    │   ├── route.ts                       [69 LOC] GET (with preview) + POST
    │   │                                  ✅ Uses lib/validations/schemas
    │   └── [id]/
    │       ├── route.ts                   [~30 LOC] GET + PUT + DELETE
    │       └── messages/
    │           ├── route.ts               [102 LOC] GET + POST (send + call agent)
    │           │                          ⚠️ Long handler - mixed concerns
    │           └── [messageId]/
    │               └── mutations/
    │                   └── route.ts       [~50 LOC] POST (handle mutations)
    │
    ├── agents/
    │   ├── run/
    │   │   └── route.ts                   [~40 LOC] POST single agent
    │   ├── stream/
    │   │   └── route.ts                   [~100+ LOC] POST SSE streaming
    │   │                                  ⚠️ Registry rebuilt per request
    │   ├── team/
    │   │   └── route.ts                   [~40 LOC] POST multi-agent
    │   ├── tasks/
    │   │   └── route.ts                   [~40 LOC] POST DAG pipeline
    │   ├── plan/
    │   │   └── route.ts                   [~40 LOC] POST planning agent
    │   ├── generate-tasks/
    │   │   └── route.ts                   [~60 LOC] POST generate from conversation
    │   └── test/
    │       └── agents/
    │           └── route.ts               [~30 LOC] Test endpoint
    │
    └── analytics/
        └── token-usage/
            └── route.ts                   [~30 LOC] GET token statistics

prisma/
├── schema.prisma                          [125 LOC] ✅ Well-designed
│                                          ⚠️ Task.projectId no cascade delete
│                                          ⚠️ JSON columns no validation
├── seed.ts                                [82 LOC] Sample data (2 projects, 6 tasks)
└── migrations/
    ├── 20260409194516_init_migration/
    ├── 20260409233617_add_planning_threads/
    ├── 20260410000212_cascade_delete_planning_threads/
    └── 20260410001844_add_mutation_actions/

types/
└── domain.ts                              [59 LOC] ⚠️ Frontend + UI types mixed
                                           - TaskStatus (lowercase)
                                           - UITaskStatus (uppercase)
                                           - UITask, UIProject, UIConversation, ChatMsg

constants/
├── status.ts                              [29 LOC] ✅ CLEAN - STATUS_COLORS mapping
└── agents.ts                              [72 LOC] ⚠️ Duplicates STATUS_COLORS
                                           - AGENT_MAPPING, AGENT_ICONS, AGENT_COLORS
                                           - KANBAN_COLUMNS definitions
```

---

## 🔀 Data Flow Map

### Task Creation Flow
```
useCreateTask() hook
  → fetch POST /api/tasks
    → createTaskSchema.parse(body) ✅
    → createTask(data)
      → prisma.task.create()
    → 201 response
  → React Query invalidate ['tasks']
  → UI updates
```

### Task Status Update Flow (With Validation)
```
useUpdateTask() hook
  → fetch PUT /api/tasks/[id]
    → updateTaskSchema.parse(body) ✅
    → getTask(id) [to fetch current status]
    → validateTransition(from, to)
      → check TRANSITION_MAP
      → if invalid → throw InvalidTransitionError
    → updateTask(id, updates, currentStatus)
      → prisma.task.update()
    → Response with updated task
  → Optimistic rollback on error
  → React Query invalidate
```

### Planning Thread Message Flow
```
useSendPlanningMessage() hook
  → fetch POST /api/planning-threads/[id]/messages
    → sendPlanningMessageSchema.parse(body) ✅
    → createMessage(threadId, 'user', content)
      → prisma.planningMessage.create()
      → Auto-update thread.updatedAt
    → Auto-title if first message
    → getRecentMessages(threadId, 20)
    → buildPlanPrompt(content, projectId, history)
    → runAgent('architect', prompt)
      → Agent orchestrator → LLM call
      → Streams back structured output
    → createMessage(threadId, 'assistant', response, tokenUsage)
    → Response: { userMessage, assistantMessage, tokenUsage }
  → React Query invalidate ['planning-messages', threadId]
  → UI appends messages
```

### Agent Streaming Flow
```
useAgentStream() hook (SSE client)
  → fetch POST /api/agents/stream
    → streamAgentSchema.parse(body) ✅
    → buildRegistry() + ToolExecutor
    → new Agent(config, registry, executor)
    → for await event in agent.stream(prompt):
        → emit({ type: 'token', delta: '...' })
        → accumulate response text
    → On done: createConversation(accumulated)
    → Response: NextResponse stream
  → EventSource parses events
  → useAgentStream updates { events: [...] }
  → UI renders tokens in real-time
```

---

## ⚙️ Key Functions & Entry Points

### Core Business Logic

| Function | File | LOC | Purpose |
|----------|------|-----|---------|
| `validateTransition(from, to)` | `status-lifecycle.ts` | - | Validate task status edge |
| `getAllowedTransitions(from)` | `status-lifecycle.ts` | - | Get valid target statuses |
| `toDbStatus(frontendStatus)` | `status-mapping.ts` | - | Convert frontend→DB status |
| `toFrontendStatus(dbStatus)` | `status-mapping.ts` | - | Convert DB→frontend status |
| `getTasks(status?, projectId?)` | `db/tasks.ts` | - | Fetch tasks with filters |
| `updateTask(id, data, currentStatus?)` | `db/tasks.ts` | - | Update + validate transition |
| `createTasksBatch(tasks[], projectId)` | `db/tasks.ts` | - | Transaction-wrapped batch insert |
| `runAgent(role, prompt)` | `agents/orchestrator.ts` | - | Run single agent |
| `runTeam(goal, agents[])` | `agents/orchestrator.ts` | - | Coordinate multi-agent |
| `buildPlanPrompt(content, projectId, history)` | `agents/prompts.ts` | - | Context-aware prompt |
| `parseTaskMutations(content)` | `utils/parseTaskMutations.ts` | - | Extract mutations from markdown |

### Database Access

| Function | File | Purpose |
|----------|------|---------|
| `getTasks()` | `db/tasks.ts` | Fetch all/filtered |
| `getTask(id)` | `db/tasks.ts` | Fetch single |
| `createTask(data)` | `db/tasks.ts` | Create |
| `updateTask(id, data, currentStatus?)` | `db/tasks.ts` | Update |
| `deleteTask(id)` | `db/tasks.ts` | Delete |
| `getProjects()` | `db/projects.ts` | Fetch all |
| `getProject(id)` | `db/projects.ts` | Fetch single |
| `getThreadsByProject(projectId)` | `db/planning-threads.ts` | Fetch threads with preview |
| `getThread(id)` | `db/planning-threads.ts` | Fetch single + messages |
| `createMessage(threadId, role, content, tokenUsage?)` | `db/planning-messages.ts` | Create + auto-update parent |
| `getMessagesByThread(threadId)` | `db/planning-messages.ts` | Fetch all |

### API Route Handlers

| Route | Method | Handler LOC | Validation | Code Quality |
|-------|--------|-----------|-----------|--------------|
| `/api/tasks` | GET | ~20 | Inline ⚠️ | Duplicated |
| `/api/tasks` | POST | ~22 | Inline ⚠️ | Duplicated |
| `/api/tasks/[id]` | GET | ~16 | N/A | ✅ |
| `/api/tasks/[id]` | PUT | ~40 | Inline ⚠️ | Transition check |
| `/api/tasks/[id]` | DELETE | ~12 | N/A | ✅ |
| `/api/projects` | GET | ~12 | N/A | ✅ |
| `/api/projects` | POST | ~22 | Imported ✅ | ✅ |
| `/api/planning-threads/[id]/messages` | POST | ~65 | Imported ✅ | ⚠️ Long |
| `/api/agents/stream` | POST | ~100+ | Imported ✅ | ⚠️ Registry rebuild |

---

## 🔗 Import Dependencies Map

### What Imports What

```
API Routes (app/api/*)
  ├─ → lib/db/*.ts (getTasks, createTask, etc.)
  ├─ → lib/validations/schemas.ts (Zod schemas)
  ├─ → lib/agents/orchestrator.ts (runAgent, runTeam)
  └─ → lib/status-lifecycle.ts (validateTransition)

lib/db/*.ts
  ├─ → lib/generated/prisma (PrismaClient)
  ├─ → lib/status-lifecycle.ts (validation)
  └─ → lib/utils/security.ts (optional)

lib/agents/*.ts
  ├─ → @jackchen_me/open-multi-agent (SDK)
  ├─ → lib/db/*.ts (getTasks, getProject, etc.)
  ├─ → lib/agents/tools/index.ts
  └─ → lib/agents/configs.ts

lib/hooks/*.ts
  └─ → @tanstack/react-query (TRQ)

Constants & Types
  ├─ constants/status.ts → types/domain.ts
  ├─ constants/agents.ts → types/domain.ts + constants/status.ts (duplicate ⚠️)
  └─ lib/auto-mode/constants.ts → types/domain.ts

Utilities
  ├─ status-lifecycle.ts → (no imports) ✅ Pure
  ├─ status-mapping.ts → status-lifecycle.ts + types/domain.ts
  ├─ lib/utils/security.ts → (Node.js path module only) ✅ Pure
  └─ lib/utils/parseTaskMutations.ts → (no imports) ✅ Pure
```

---

## 🎯 Refactoring Hotspots

### Files That Need Attention (Priority Order)

1. **HIGH: Consolidate inline schemas**
   - `/api/tasks/route.ts` → extract to `lib/validations/tasks.ts`
   - `/api/tasks/[id]/route.ts` → extract to `lib/validations/tasks.ts`
   - `/api/conversations/route.ts` → extract to `lib/validations/conversations.ts`

2. **HIGH: Fix database schema issues**
   - `prisma/schema.prisma` → Add `onDelete: Cascade` to Task.projectId
   - `lib/db/conversations.ts` → Add type safety for JSON columns

3. **MEDIUM: Extract service layer**
   - `/api/planning-threads/[id]/messages/route.ts` → Create `lib/services/planningService.ts`
   - `/api/agents/stream/route.ts` → Create `lib/services/agentService.ts`

4. **MEDIUM: Reduce prompts file size**
   - `lib/agents/prompts.ts` (555 LOC) → Parameterize templates + extract domain configs

5. **MEDIUM: Fix type duplication**
   - `lib/auto-mode/constants.ts` → Remove `TaskStatus` type, import from `types/domain.ts`
   - `constants/agents.ts` → Import `STATUS_COLORS` from `constants/status.ts`

6. **MEDIUM: Optimize agent performance**
   - `/api/agents/stream/route.ts` → Cache registry singleton instead of rebuilding per request

7. **LOW: Improve SSE robustness**
   - `lib/hooks/useAgentStream.ts` → Add reconnection logic + error recovery

---

## 📋 Testing Entry Points

### What to Test First

```
✅ Priority 1: Core Business Logic
   └─ lib/status-lifecycle.ts
      - validateTransition() with all state edges
      - InvalidTransitionError conditions

✅ Priority 2: Database Operations
   └─ lib/db/tasks.ts
      - updateTask() with transition validation
      - createTasksBatch() transaction rollback

✅ Priority 3: API Routes
   └─ /api/tasks/[id]/route.ts (PUT)
      - Valid transitions → 200
      - Invalid transitions → 422
      - Missing task → 404

✅ Priority 4: Agent Orchestration
   └─ /api/agents/stream/route.ts
      - SSE event stream format
      - Database persistence on completion

✅ Priority 5: Planning Messages
   └─ /api/planning-threads/[id]/messages/route.ts (POST)
      - Auto-title on first message
      - Agent invocation
      - Thread timestamp update
```

---

## 🚀 Quick Start for New Backend Devs

1. **Understand the status system**
   - Read: `lib/status-lifecycle.ts` → `lib/status-mapping.ts`
   - Test: Valid transitions in all 5 states

2. **Understand data access**
   - Read: `lib/db/tasks.ts` → `lib/db/projects.ts`
   - Test: Each CRUD operation

3. **Understand orchestration**
   - Read: `lib/agents/orchestrator.ts` → `lib/agents/configs.ts`
   - Test: `runAgent('architect', 'test prompt')`

4. **Understand API patterns**
   - Read: `/api/tasks/route.ts` → `/api/projects/route.ts` → `/api/planning-threads/[id]/messages/route.ts`
   - Implement: New entity route following patterns

5. **Before pushing changes**
   - Check: No inline schema duplication
   - Check: All exports documented
   - Check: Tests pass for status transitions


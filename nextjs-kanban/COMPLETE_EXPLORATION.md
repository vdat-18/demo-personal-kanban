# Next.js Kanban Project - Complete Exploration Summary

## 📋 Executive Summary

This is a **sophisticated AI-first personal kanban system** built with Next.js + Prisma + PostgreSQL. It combines:
- A visual Kanban board for task management
- Multi-agent orchestration system with AI-powered planning, development, and review
- Planning threads with vision documents and phase-based conversations
- Task automation via column "auto mode"
- Real-time streaming for AI responses
- Full task lifecycle management with intelligent status transitions

**Key differentiation**: This isn't just a kanban board UI—it's a full system where AI agents can actively participate in planning, execution, and review phases.

---

## 1️⃣ PROJECT STRUCTURE

### Root-Level Organization
```
nextjs-kanban/
├── app/                    # Next.js App Router
│   ├── (routes)/          # All user-facing pages
│   ├── api/               # RESTful API routes
│   ├── layout.tsx         # Root layout
│   └── error.tsx
├── lib/                   # Shared business logic
│   ├── agents/            # AI agent configs, tools, prompts
│   ├── services/          # Service layer (agent, planning, task, etc.)
│   ├── db/                # Database query functions
│   ├── hooks/             # React hooks (useAgentStream, useTasks, etc.)
│   ├── api/               # API utilities (error handler, response formatting)
│   ├── types/             # TypeScript types
│   ├── validations/       # Zod schemas for input validation
│   ├── auto-mode/         # Column auto-mode logic
│   ├── status-lifecycle.ts # Task status transition rules
│   └── stores/            # Zustand state management
├── components/            # React components (atoms, molecules, organisms)
├── prisma/               # Database schema & migrations
├── public/               # Static assets
├── constants/            # App-wide constants
└── types/                # Global TypeScript definitions
```

### Key Directories by Concern

**AI/Agent Focused:**
- `lib/agents/` - Agent orchestration, configs, and tools
- `lib/agents/prompts/` - Domain-specific and role-specific prompts (918 lines total)
- `lib/agents/tools/` - Tool definitions for agents (db_query, task_create, task_update, etc.)
- `app/api/agents/` - Agent API endpoints
- `lib/services/agent.service.ts` - Agent business logic

**Planning & Conversation:**
- `app/(routes)/planning/` - Planning workspace UI
- `lib/services/planning.service.ts` - Planning thread management
- `lib/agents/prompts/builders/plan.ts` - Planning prompt builder
- `app/api/planning-threads/` - Planning API endpoints

**Kanban Board:**
- `app/(routes)/mission-control/` - Main kanban board UI
- `lib/status-lifecycle.ts` - Task status transition rules
- `lib/auto-mode/` - Column automation logic
- `app/api/tasks/` - Task CRUD operations

---

## 2️⃣ TECH STACK

### Frontend
- **Next.js 16.2.2** - React framework with App Router
- **React 19.2.4** - UI library
- **React Query (@tanstack/react-query 5.96.2)** - Data fetching & caching
- **Zustand 5.0.12** - State management
- **Framer Motion 12.38.0** - Animations
- **Tailwind CSS 4** - Styling
- **Shadcn + Base UI** - Component libraries
- **Lucide React 1.7.0** - Icons

### Backend & Database
- **Next.js API Routes** - Serverless API handlers
- **Prisma 7.7.0** - ORM with PostgreSQL adapter
- **PostgreSQL** - Primary database
- **SSE (Server-Sent Events)** - Streaming responses for AI chat

### AI & Agents
- **@anthropic-ai/sdk 0.85.0** - Anthropic (Claude) API
- **@openai/sdk 6.33.0** - OpenAI API
- **@google/genai 1.48.0** - Google Gemini API
- **@jackchen_me/open-multi-agent 1.0.1** - Multi-agent orchestration framework
- **Zod 4.3.6** - Schema validation & parsing

### Development
- **TypeScript 5** - Type safety
- **ESLint 9** - Code linting
- **Tailwind PostCSS 4** - CSS processing

---

## 3️⃣ EXISTING AI/AGENT FEATURES

### 3.1 Multi-Agent System

**Defined Agent Roles** (in `lib/agents/configs.ts`):

| Agent Role | Name | Primary Tools | Purpose |
|-----------|------|--------------|---------|
| **architect** | Architect | db_query, project_create | Planning & initial task breakdown |
| **developer** | Developer | task_create, task_update, task_delete, subtask_update | Task implementation |
| **reviewer** | Reviewer | db_query, task_update | Quality & review checks |

**Agent Orchestration** (in `lib/agents/orchestrator.ts`):
- `runAgent()` - Execute single agent with custom prompt
- `runTeam()` - Coordinate multiple agents on a shared goal
- `runTasks()` - Execute DAG of tasks with dependencies
- Uses shared tool registry across all agents

### 3.2 Agent Tool System

**Available Tools** (in `lib/agents/tools/index.ts`):

1. **db_query** - Query tasks, projects, or conversations
2. **task_create** - Create new tasks with title, description, priority
3. **task_update** - Update task properties (title, status, priority)
4. **task_delete** - Delete tasks from database
5. **project_create** - Create new projects
6. **subtask_update** - Mark subtasks as complete or update title

All tools include validation, error handling, and JSON responses.

### 3.3 Prompt System

**Domain-Specific Prompts** (in `lib/agents/prompts/domains/`):
- SOFTWARE_ENGINEERING
- MARKETING
- SALES
- LOGISTICS

Each domain has role-specific system prompts for architect, developer, and reviewer.

**Prompt Builders**:
- `buildChatPrompt()` - Task-level chat responses
- `buildPlanPrompt()` - Planning phase conversations
- `buildGenerateTasksPrompt()` - Converting plans into executable tasks

### 3.4 Planning System

**Planning Workflow** (Vision-First, 3-Phase):

1. **DISCOVERY Phase**
   - Ask clarifying questions
   - Understand project goals, constraints, timeline
   - Generate running vision summary
   - Marker: `[PHASE:blueprint]` to advance

2. **BLUEPRINT Phase**
   - Write structured project blueprint
   - Define objectives, stakeholders, key pillars
   - Define success metrics, risks, timeline
   - Get user approval
   - Marker: `[PHASE:task_mapping]` to advance

3. **TASK_MAPPING Phase**
   - Break blueprint into concrete tasks
   - Support task mutations (add/update/delete with approval)
   - Suggest sequencing and prioritization

**Planning Data Model**:
- `PlanningThread` - One conversation per planning effort
- `PlanningMessage` - User/assistant messages with role and token usage
- `PlanningPhase` - Current phase (discovery, blueprint, task_mapping)
- `visionDocument` - Stored blueprint/vision

**Mutation Actions**:
- Users can approve/dismiss proposed mutations
- Tracked in `MutationAction` table

### 3.5 Streaming & Real-Time Chat

**Agent Stream API** (`app/api/agents/stream/route.ts`):
- SSE-based streaming response
- Emits events: `started`, `token`, `progress`, `complete`, `error`
- Accumulates response and saves to conversation DB
- Supports token usage tracking

**Stream Hook** (`lib/hooks/useAgentStream.ts`):
- `startStream()` - Begin streaming from agent
- `abort()` - Cancel mid-stream
- `streamingContent` - Live accumulating text
- Event handling for UI updates

### 3.6 Conversation Persistence

**Conversation Model** (in Prisma schema):
- `id` - Unique identifier
- `taskId` - Associated task (optional)
- `messages` - JSON array of all messages
- `result` - Final assistant output
- `tokenUsage` - Input/output token counts

**Service** (`lib/services/conversation.service.ts`):
- Save conversations to database
- Retrieve task-level conversations

### 3.7 Task Generation

**Auto-Breakdown Flow** (`app/api/tasks/auto-breakdown/route.ts`):
- Architect agent analyzes task description
- Generates subtasks via JSON response
- Parses and creates subtasks in database

**Generate Tasks Flow** (`app/api/agents/generate-tasks/route.ts`):
- Take planning conversation history
- Agent extracts structured task list
- Create batch of tasks with descriptions

---

## 4️⃣ TASK & KANBAN STRUCTURE

### Task Data Model

```prisma
model Task {
  id          String      @id @default(uuid())
  title       String
  description String?
  status      TaskStatus  @default(TODO)        // TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED
  priority    TaskPriority @default(MEDIUM)     // LOW, MEDIUM, HIGH, URGENT
  projectId   String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  project     Project?    @relation(...)
  conversations Conversation[]
  subtasks    Subtask[]
}

model Subtask {
  id          String
  title       String
  description String?     @db.Text
  completed   Boolean     @default(false)
  output      String?     @db.Text
  taskId      String
  createdAt   DateTime
  updatedAt   DateTime
}
```

### Task Status Lifecycle

Valid transitions defined in `lib/status-lifecycle.ts`:

```
TODO ──→ IN_PROGRESS ──→ IN_REVIEW ──→ DONE
 ↑         ↓   ↑           ↓   ↑
 └─ BLOCKED ←──┴───────────┴───┘
```

**Terminal States**: DONE, BLOCKED
**Restore from**: BLOCKED can only return to TODO

### Kanban Board Columns

The mission-control page displays **5 columns**:
1. TODO - New, unstarted tasks
2. IN_PROGRESS - Currently being worked on
3. IN_REVIEW - Awaiting approval/review
4. DONE - Completed (terminal)
5. BLOCKED - Stuck or cancelled (terminal)

**Column Auto Mode**:
- Each column can have auto mode enabled/disabled
- Maps columns to agents: TODO→architect, IN_PROGRESS→developer, IN_REVIEW→reviewer
- Default prompts for each column
- Can auto-move tasks through workflows

---

## 5️⃣ API ROUTES

### Agent APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/agents/run` | POST | Run single agent with prompt |
| `/api/agents/stream` | POST | Stream agent response via SSE |
| `/api/agents/plan` | POST | Run planning agent for project |
| `/api/agents/team` | POST | Coordinate multiple agents |
| `/api/agents/tasks` | GET | List agent tasks |
| `/api/agents/generate-tasks` | POST | Generate tasks from planning |

### Planning APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/planning-threads` | GET, POST | List/create threads |
| `/api/planning-threads/[id]` | GET, PUT, DELETE | Thread CRUD |
| `/api/planning-threads/[id]/messages` | GET, POST | Message list/create |
| `/api/planning-threads/[id]/messages/[messageId]/mutations` | POST | Approve/dismiss mutations |

### Task APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/tasks` | GET, POST | List/create tasks |
| `/api/tasks/[id]` | GET, PUT, DELETE | Task CRUD |
| `/api/tasks/auto-breakdown` | POST | Generate subtasks |
| `/api/tasks/[id]/subtasks/[subtaskId]` | PUT, DELETE | Subtask management |

### Conversation APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/conversations` | GET, POST | List/create conversations |
| `/api/conversations/[id]` | GET | Get conversation details |
| `/api/conversations/token-usage` | GET | Get usage analytics |

### Project APIs

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/[id]` | GET, PUT, DELETE | Project CRUD |

---

## 6️⃣ PACKAGE.JSON DEPENDENCIES

### Core AI/Agent
```json
"@anthropic-ai/sdk": "^0.85.0",
"@google/genai": "^1.48.0",
"openai": "^6.33.0",
"@jackchen_me/open-multi-agent": "^1.0.1"
```

### UI & Frontend
```json
"react": "19.2.4",
"react-dom": "19.2.4",
"next": "16.2.2",
"@tanstack/react-query": "^5.96.2",
"zustand": "^5.0.12",
"framer-motion": "^12.38.0",
"lucide-react": "^1.7.0"
```

### Styling & Components
```json
"tailwindcss": "^4",
"@base-ui/react": "^1.3.0",
"shadcn": "^4.2.0"
```

### Database & ORM
```json
"@prisma/client": "^7.7.0",
"@prisma/adapter-pg": "^7.7.0",
"prisma": "^7.7.0"
```

### Utilities
```json
"zod": "^4.3.6",
"class-variance-authority": "^0.7.1",
"clsx": "^2.1.1",
"react-markdown": "^10.1.0",
"remark-gfm": "^4.0.1"
```

---

## 7️⃣ KEY ENVIRONMENT VARIABLES

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/db?schema=public

# LLM API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Local Model (Ollama)
OLLAMA_BASE_URL=http://localhost:11434/v1

# Next.js & Config
NODE_ENV=production|development
AGENT_MODEL=gpt-4o-mini (default)
```

---

## 8️⃣ VALIDATION & TYPE SCHEMAS

**Comprehensive Zod schemas** in `lib/validations/schemas.ts`:

- **Tasks**: createTaskSchema, updateTaskSchema, taskQuerySchema
- **Projects**: createProjectSchema, updateProjectSchema
- **Conversations**: createConversationSchema, conversationQuerySchema
- **Agents**: agentRoleSchema, chatStreamSchema, planRequestSchema, runAgentSchema, teamAgentSchema, runTasksSchema
- **Planning**: createPlanningThreadSchema, sendPlanningMessageSchema, updatePlanningThreadSchema
- **Environment**: envSchema for startup validation

All inputs validated before reaching handlers.

---

## 9️⃣ MCP & CLAUDE INTEGRATION

**Files Found**:
- `AGENTS.md` - Brief agent guidelines (warns about Next.js v16 breaking changes)
- `CLAUDE.md` - References @AGENTS.md

**No existing MCP implementation** in codebase. No Claude API SDK usage. But the infrastructure is there to add it:
- OpenAI SDK already integrated
- Anthropic SDK (v0.85.0) present in dependencies
- Agent orchestration framework ready
- Tool system in place for agent actions

---

## 🔟 DATABASE SCHEMA SUMMARY

### Core Models
- **Project** - Container with domain (SOFTWARE_ENGINEERING, MARKETING, SALES, LOGISTICS)
- **Task** - Has status (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED) and priority
- **Subtask** - Breakdowns of tasks with completion tracking
- **Conversation** - Task-level chat history with token usage
- **PlanningThread** - Planning workspace per project
- **PlanningMessage** - Planning conversation turns
- **MutationAction** - User approval/dismissal of AI suggestions

### Indexes
- Task status, priority, projectId, createdAt
- Project createdAt
- Conversation taskId, createdAt
- PlanningThread projectId, updatedAt
- PlanningMessage threadId, createdAt

---

## 1️⃣1️⃣ ROUTING & PAGES

**Main Routes**:
- `/` - Home/project dashboard
- `/planning/[id]` - Planning workspace (3-phase chat)
- `/mission-control/[id]` - Kanban board
- `/chat/[id]` - Task-level AI chat
- `/summary/[id]` - Task summary
- `/directory` - Global project/task browser
- `/components` - Component showcase (dev)

---

## 1️⃣2️⃣ STATE MANAGEMENT

### Client-Side (Zustand)
- Task store
- Planning thread store
- Conversation store
- Column auto-mode state

### Server-Side (React Query + SSR)
- Task queries with caching
- Project data fetching
- Planning thread queries
- Real-time updates via SSE

---

## 1️⃣3️⃣ NOTABLE IMPLEMENTATION DETAILS

### 1. Agent Service Pattern
- Single source of truth in `lib/services/agent.service.ts`
- Builds prompts server-side
- Handles tool registry creation
- Converts responses to structured format

### 2. Prompt Building Strategy
- Dynamic context injection (fetch project/task data)
- Domain + role specificity
- Vision-first for planning
- Task-specific context for chat

### 3. Tool Validation
- UUID validation for subtask updates
- Transaction safety for batch operations
- Status lifecycle validation before persistence

### 4. Streaming Architecture
- SSE protocol for real-time responses
- Client-side accumulation in hook
- Auto-save to conversation DB
- Graceful error handling

### 5. Auto Mode Automation
- Column-to-agent mapping
- Default prompts per column
- State management for active tasks
- Error recovery

---

## 1️⃣4️⃣ GAPS & PARTIAL IMPLEMENTATIONS

As noted in README:

- **Document Ingestion**: UI present but not functional
- **Reporter Agent**: Designed but incomplete
- **Project Closure Loop**: Only partial implementation
- **Workflow Automation**: Early stage (column auto mode exists)
- **Test Suite**: Not automated yet
- **Linting**: Not fully clean

---

## 1️⃣5️⃣ DEVELOPMENT SETUP

```bash
# Install
npm install

# Setup DB
npm run db:generate
npm run db:migrate
npm run db:seed

# Run
npm run dev

# Build/Test
npm run build
npm run lint
```

Using Docker Compose for PostgreSQL (see `docker-compose.yml`).

---

## 🎯 KEY TAKEAWAYS

This is **not a generic kanban board**. It's an **AI-first project execution system**:

1. **Purpose**: Help non-technical users plan and execute complex projects with AI assistance
2. **Differentiation**: Planning + Execution + Review all orchestrated by specialized agents
3. **Tech**: Multi-agent framework + streaming chat + task automation
4. **State**: Mature planning; solid kanban; partial automation; some aspirational features
5. **Extensibility**: Tool system ready for additional agent capabilities
6. **Production Readiness**: Good foundation but needs testing infrastructure


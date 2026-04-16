# System Architecture Diagram

## High-Level Component Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                          │
│  ┌──────────────────┬──────────────────┬────────────────────┐  │
│  │  Planning Page   │  Mission Control │  Task Chat / Chat  │  │
│  │  (3-Phase Chat)  │  (Kanban Board)  │  (SSE Streaming)   │  │
│  └──────────────────┴──────────────────┴────────────────────┘  │
│                         React 19                                 │
│         (Zustand + React Query for state management)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (HTTP/SSE)
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Routes)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ /api/agents  │  │ /api/planning│  │   /api/tasks        │  │
│  ├──────────────┤  ├──────────────┤  ├─────────────────────┤  │
│  │ /run         │  │ /threads     │  │ /create             │  │
│  │ /stream      │  │ /messages    │  │ /update             │  │
│  │ /team        │  │ /mutations   │  │ /auto-breakdown     │  │
│  │ /plan        │  │              │  │ /subtasks           │  │
│  └──────────────┘  └──────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SERVICE LAYER (lib/services/)                       │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ AgentService    │  │ PlanningService  │  │ TaskService  │  │
│  ├─────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │ • Stream setup  │  │ • Thread mgmt    │  │ • Create     │  │
│  │ • Plan running  │  │ • Message persist│  │ • Update     │  │
│  │ • Task gen      │  │ • Phase tracking │  │ • Batch ops  │  │
│  │ • SSE emission  │  │ • Mutations      │  │              │  │
│  └─────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        AGENT ORCHESTRATION LAYER (lib/agents/)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              OpenMultiAgent Framework                     │  │
│  │  ┌──────────────┬──────────────┬──────────────┐           │  │
│  │  │  Architect   │  Developer   │  Reviewer    │           │  │
│  │  │   Agent      │   Agent      │   Agent      │           │  │
│  │  └──────────────┴──────────────┴──────────────┘           │  │
│  │         (Agent Configs + Tool Registry)                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           PROMPT BUILDERS & SYSTEM PROMPTS              │  │
│  │  ┌─────────────┬─────────────┬──────────────┐            │  │
│  │  │ Chat        │ Plan        │ Task Gen     │            │  │
│  │  │ Prompts     │ Prompts     │ Prompts      │            │  │
│  │  └─────────────┴─────────────┴──────────────┘            │  │
│  │  ┌──────────────────────────────────────────┐            │  │
│  │  │  Domain-Specific Prompts                 │            │  │
│  │  │  (SE, Marketing, Sales, Logistics)       │            │  │
│  │  └──────────────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              TOOL REGISTRY & EXECUTION                   │  │
│  │  ┌──────────────────────────────────────────┐            │  │
│  │  │  db_query          task_create           │            │  │
│  │  │  task_update       task_delete           │            │  │
│  │  │  project_create    subtask_update        │            │  │
│  │  └──────────────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│        DATABASE LAYER (lib/db/ + Prisma ORM)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           POSTGRESQL DATABASE                            │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │ Projects      Tasks        Conversations            ││  │
│  │  │ Subtasks      Planning*     PlanningMessages         ││  │
│  │  │ MutationActions             (Token usage tracking)   ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│           LLM PROVIDERS (Configured at runtime)                 │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   OpenAI     │  Anthropic   │   Gemini     │    Ollama    │ │
│  │  gpt-4o-mini │   Claude 3   │  Gemini Pro  │  Local Model │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Planning Thread

```
User Input
   ↓
POST /api/planning-threads/[id]/messages
   ↓
PlanningService.sendMessage()
   ├─ Create user message in DB
   ├─ Auto-title thread if first message
   ├─ Get conversation history
   └─ Run planning agent
        ↓
   buildPlanPrompt()
   ├─ Inject project context
   ├─ Add phase-specific instructions
   └─ Include recent message history
        ↓
   runAgent('architect', prompt)
   ├─ Use OpenMultiAgent framework
   ├─ Register tools
   └─ Execute with timeout
        ↓
   Parse response for:
   ├─ Phase transition markers ([PHASE:x])
   ├─ Task mutations (add/update/delete)
   ├─ Vision document updates
   └─ Token usage
        ↓
   Create assistant message in DB
        ↓
   Return to client with tokenUsage
```

## Data Flow: Task Chat with Streaming

```
User sends task message
   ↓
POST /api/agents/stream { role, userMessage, taskId, messages }
   ↓
AgentService.createStream()
   ├─ Build context from task/project
   ├─ Create ReadableStream
   └─ Start sending SSE events
        ↓
   buildChatPrompt()
   ├─ Fetch task details
   ├─ Inject conversation history
   └─ Apply role-specific system prompt
        ↓
   agent.stream(prompt)
   ├─ Emit 'started' event
   ├─ For each token: emit 'token' event
   ├─ For each tool use: emit 'progress' event
   └─ On completion: emit 'complete' event
        ↓
   Client accumulates tokens in real-time
        ↓
   On 'complete', save conversation to DB
   ├─ All messages (user + assistant)
   ├─ Final result text
   ├─ Token usage
   └─ Timestamp
```

## Task Status Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                   TASK LIFECYCLE                            │
│                                                              │
│  ┌──────────┐                                               │
│  │  TODO    │  ← New tasks start here                       │
│  └──────────┘                                               │
│       │ ↓                                                    │
│       │ Forward: IN_PROGRESS                                │
│       │ Block:   BLOCKED                                    │
│       ↓                                                     │
│  ┌──────────────────┐                                       │
│  │  IN_PROGRESS     │  ← Active work                        │
│  └──────────────────┘                                       │
│       │ ↓                                                    │
│       │ Forward: IN_REVIEW                                  │
│       │ Back:    TODO                                       │
│       │ Block:   BLOCKED                                    │
│       ↓                                                     │
│  ┌──────────────────┐                                       │
│  │  IN_REVIEW       │  ← Quality gate                       │
│  └──────────────────┘                                       │
│       │ ↓                                                    │
│       │ Approve: DONE   [TERMINAL]                          │
│       │ Back:    IN_PROGRESS                                │
│       │ Block:   BLOCKED                                    │
│       ↓                                                     │
│  ┌──────────────────┐                                       │
│  │  DONE            │  ← Completed                          │
│  └──────────────────┘                                       │
│  (No transitions out)                                       │
│                                                              │
│  ┌──────────────────┐                                       │
│  │  BLOCKED         │  ← Stuck / Cancelled                 │
│  └──────────────────┘                                       │
│       │ ↑                                                    │
│       └─ Restore: TODO                                      │
│  (Only restore available)                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Valid Transitions Enforced Via: lib/status-lifecycle.ts
User Cannot Violate: Checked before DB persist
Agents Respect: Validated in tool calls
```

## Column Auto Mode Flow

```
Column: TODO / IN_PROGRESS / IN_REVIEW
   ↓
Auto Mode Enabled?
   ├─ NO  → Task waits for manual action
   └─ YES → Start auto workflow
        ↓
   Map Column → Agent Role
   ├─ TODO → architect
   ├─ IN_PROGRESS → developer
   └─ IN_REVIEW → reviewer
        ↓
   Get Default Prompt for Column
   ├─ Plan: "Analyze task and create detailed plan..."
   ├─ Code: "Implement this task..."
   └─ Review: "Review implementation..."
        ↓
   Run Agent with Column's Default Prompt
   ├─ Fetch Task + Project context
   ├─ Build prompt with context
   └─ Execute agent
        ↓
   Tool calls may:
   ├─ Create subtasks
   ├─ Update task fields
   └─ Move task to next column (optional)
        ↓
   Save conversation to task
        ↓
   If task moved to terminal (DONE/BLOCKED):
   └─ Stop processing this task
```

## Multi-Agent Team Execution

```
Goal: "Plan marketing campaign"
Agents: [architect, developer, reviewer]
   ↓
OpenMultiAgent Framework
   ├─ Create team with all configs
   ├─ Register tools for all
   ├─ Share tool registry
   └─ Coordinate execution
        ↓
   Agent 1 (Architect)
   ├─ Analyze goal
   ├─ Call db_query, project_create tools
   └─ Produce plan
        ↓
   Agent 2 (Developer)
   ├─ Depends on Agent 1 output
   ├─ Call task_create, subtask_update
   └─ Create action items
        ↓
   Agent 3 (Reviewer)
   ├─ Depends on Agent 2 output
   ├─ Call db_query, task_update
   └─ Validate completeness
        ↓
   Return final coordination result
```

## Planning 3-Phase Vision Document Flow

```
Phase 1: DISCOVERY
   User asks: "Help me plan a product launch"
   Agent asks 3-5 questions:
   - Target audience?
   - Timeline?
   - Budget?
   - Success metrics?
   
   Running Vision Summary:
   ✓ Product: Social media app
   ✓ Timeline: 8 weeks
   ✓ Audience: 18-35 year olds
   
   User says: "OK, let's proceed"
   [PHASE:blueprint] marker sent
        ↓
Phase 2: BLUEPRINT
   Agent writes full blueprint:
   - Objectives
   - Target Audience
   - Key Pillars (5-7 themes)
   - Out of Scope
   - Success Metrics
   - Risks & Mitigations
   - Timeline
   
   Vision Document Updated (stored in DB)
   
   Agent asks: "Approve?"
   User: "Yes" + feedback
   [PHASE:task_mapping] marker sent
        ↓
Phase 3: TASK_MAPPING
   Agent breaks blueprint into tasks:
   [
     { "action": "add", "title": "Setup CI/CD", ... },
     { "action": "add", "title": "Design UI mockups", ... },
     { "action": "update", "id": "...", "priority": "HIGH" }
   ]
   
   Each mutation requires user approval
   Once approved:
   ├─ Task created in DB
   ├─ Associated with project
   └─ Appears in kanban TODO column
   
   Vision Document: Complete and finalized
```

---

## Component Hierarchy (Frontend)

```
Layout (Root)
├─ pages (via routes)
│  ├─ (routes)/planning/[id]
│  │  └─ PlanningPage (server)
│  │     └─ PlanningClient (client, hooks)
│  │        ├─ ThreadPanel
│  │        ├─ ChatPanel (messages, SSE stream)
│  │        └─ TaskPanel
│  │
│  ├─ (routes)/mission-control/[id]
│  │  └─ MissionControlPage (server)
│  │     └─ MissionControlClient (client)
│  │        ├─ KanbanHeader
│  │        ├─ KanbanBoard
│  │        │  ├─ Column (TODO)
│  │        │  ├─ Column (IN_PROGRESS)
│  │        │  ├─ Column (IN_REVIEW)
│  │        │  ├─ Column (DONE)
│  │        │  └─ Column (BLOCKED)
│  │        └─ KanbanFooter
│  │
│  └─ (routes)/chat/[id]
│     └─ ChatPage (server)
│        └─ ChatClient (client)
│           ├─ TaskHeader
│           ├─ ConversationHistory
│           └─ ChatInput (with streaming)
│
└─ components (atoms, molecules, organisms)
   ├─ TaskCard
   ├─ MessageBubble
   ├─ StreamingText
   └─ ColumnHeader
```


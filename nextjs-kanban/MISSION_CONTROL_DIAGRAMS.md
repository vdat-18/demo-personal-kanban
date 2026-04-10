# Mission Control - Visual Diagrams & Flow Charts

## 1. STATUS LIFECYCLE DIAGRAM

```
┌────────────────────────────────────────────────────────────────────┐
│                    TASK STATUS LIFECYCLE                           │
└────────────────────────────────────────────────────────────────────┘

                              ┌─────────┐
                              │   TODO  │
                              │ (Slate) │
                              └────┬────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ↓ start work   │              ↓ give up
              ┌──────────────┐     │         ┌─────────────┐
              │IN_PROGRESS   │     │         │  BLOCKED    │
              │   (Blue)     │     │         │   (Red)     │
              └──────┬───────┘     │         └──────┬──────┘
                     │             │                │
           ┌─────────┴─────┐       │                │
           │               │       │                │
      review needed   back to fix  │         restore to try
           │               │       │         again (only option)
           ↓               ↓       │                ↓
      ┌──────────────┐     │       │          ┌─────────┐
      │  IN_REVIEW   │◄────┘       │          │   TODO  │
      │  (Yellow)    │─────────────┼─────────→│ (Slate) │
      └──────┬───────┘   cancel    │          └─────────┘
             │                     │
         approval                  │
           ↓                       │
      ┌──────────────┐             │
      │    DONE      │◄────────────┘
      │  (Green)     │   (Terminal State)
      └──────────────┘
      ✅ COMPLETE
      (No Transitions Out)


TRANSITION RULES:
┌─────────────────────────────────────────────────────────────┐
│ TODO        → [IN_PROGRESS, BLOCKED]                        │
│ IN_PROGRESS → [IN_REVIEW, TODO, BLOCKED]                    │
│ IN_REVIEW   → [DONE, IN_PROGRESS, BLOCKED]                  │
│ DONE        → [] (Terminal - Frozen)                        │
│ BLOCKED     → [TODO] (Can only restore)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. MISSION CONTROL PAGE COMPONENT HIERARCHY

```
mission-control/[id]/page.tsx (Server Component)
    │
    ├─ getProject(id) 
    │  └─ Fetch from DB via Prisma
    │
    ├─ Serialize tasks
    │  └─ Convert ISO dates, flatten structure
    │
    └─→ MissionControlClient (Client Component)
         │
         ├─ Header (h-20)
         │  ├─ Back Button
         │  ├─ Project Name + Description
         │  └─ Add Task Button
         │
         ├─ Main Kanban Board (flex-1)
         │  │
         │  └─ For each Column (5 total):
         │     ├─ Column Header (task count badge)
         │     ├─ onDragOver (highlight if valid)
         │     ├─ onDragLeave (remove highlight)
         │     └─ onDrop (validate + updateTaskStatus)
         │        │
         │        └─ For each Task in Column:
         │           ├─ Task Card (draggable)
         │           │  ├─ Status Badge
         │           │  ├─ Title
         │           │  ├─ Description (optional)
         │           │  └─ Hover Actions (3 buttons)
         │           │     ├─ Restore (if BLOCKED)
         │           │     ├─ Cancel (if can go to BLOCKED)
         │           │     └─ Forward (if getNextStatus())
         │           │
         │           └─ onClick → router.push(/chat/[taskId])
         │
         ├─ Empty Column Placeholder
         │  └─ Archive icon + "Empty" text
         │
         ├─ Add Column Ghost (future feature)
         │  └─ Plus icon + "Add Column" text
         │
         └─ Footer (h-20)
            ├─ Stats (Total, In Progress, Done, Cancelled)
            ├─ Close Project Button
            │  └─ Disabled until all tasks in DONE/BLOCKED
            └─ Visual: Rocket icon + "Close Project"
```

---

## 3. DRAG-AND-DROP FLOW

```
┌─ User Drags Task Card ─────────────────────────────────────────┐
│                                                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
            handleDragStart(e, taskId, taskStatus)
            │
            ├─ e.dataTransfer.setData('taskId', taskId)
            ├─ e.dataTransfer.setData('taskStatus', taskStatus)
            ├─ setDraggingTaskId(taskId)
            └─ setDraggingTaskStatus(taskStatus)
                       │
                       ↓
        ┌─ User Hovers Over Column ──┐
        │                            │
        └────────────────┬───────────┘
                         │
                         ↓
              onDragOver(e, columnId)
              │
              ├─ isValidDropTarget(fromStatus, toColumnStatus)?
              │  │
              │  ├─ YES: 
              │  │  ├─ e.preventDefault()
              │  │  ├─ setDragOverColumn(columnId)
              │  │  └─ Highlight column (border-blue-300)
              │  │
              │  └─ NO:
              │     ├─ Do NOT preventDefault()
              │     └─ Column shows grayed-out state
              │
              └─ onDragLeave → setDragOverColumn(null)
                       │
                       ↓
        ┌─ User Releases Task ──────┐
        │                           │
        └────────────┬──────────────┘
                     │
                     ↓
          handleDrop(e, toColumnStatus)
          │
          ├─ const taskId = e.dataTransfer.getData('taskId')
          ├─ const fromStatus = e.dataTransfer.getData('taskStatus')
          │
          ├─ if (taskId && isValidDropTarget(fromStatus, toStatus)):
          │  │
          │  └─ updateTaskStatus(taskId, toStatus)
          │     │
          │     └─ PUT /api/tasks/[taskId] {status: toStatus}
          │        │
          │        ├─ API validates transition
          │        ├─ DB updates task
          │        ├─ Response returns updated task
          │        │
          │        └─ setProject((prev) => ({
          │              ...prev,
          │              tasks: [...] // replaced with updated task
          │           }))
          │
          ├─ setDragOverColumn(null)
          ├─ setDraggingTaskId(null)
          └─ setDraggingTaskStatus(null)
                     │
                     ↓
              Task appears in new column! ✅
```

---

## 4. AGENT INTERACTION FLOW

```
┌─ Mission Control Board ────────────────────────────────────────┐
│ [Task Card] Click to chat...                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ router.push(/chat/[taskId])
        ┌─────────────────────────────────────┐
        │   Task Chat Page (/chat/[taskId])   │
        │                                     │
        │  TaskChatClient (Client Component)  │
        └──────────────────┬──────────────────┘
                           │
                           ↓
        ┌──────────────────────────────────────┐
        │  Select Agent Role                   │
        │  [Planner] [Doer] [Reviewer] ▼       │
        └──────────────────┬───────────────────┘
                           │
                           ↓ User selects agent
        ┌──────────────────────────────────────┐
        │  Type message                        │
        │  "Can you implement the login form?" │
        │  [Send Button]                       │
        └──────────────────┬───────────────────┘
                           │
                           ↓ User clicks Send
        
        Frontend POSTs: /api/agents/stream
        ┌─────────────────────────────────────────────────────┐
        │ {                                                   │
        │   role: 'developer' (AgentRole)                    │
        │   userMessage: 'Can you implement...'              │
        │   taskId: '[task-uuid]'                            │
        │   messages?: [{role, content}, ...] (optional)     │
        │ }                                                   │
        └─────────────────┬───────────────────────────────────┘
                          │
                          ↓ Backend: /api/agents/stream/route.ts
        
        ┌──────────────────────────────────────────────────────┐
        │ 1. buildChatPrompt(role, userMessage, taskId)       │
        │    └─ Includes task context + conversation history  │
        │                                                      │
        │ 2. buildRegistry()                                   │
        │    └─ Register all tools (db_query, task_create...) │
        │                                                      │
        │ 3. Create Agent with config + registry              │
        │                                                      │
        │ 4. agent.stream(prompt) - Async Generator           │
        │    │                                                │
        │    ├─ Event: 'text' → Accumulate response text      │
        │    │  Emit: {type: 'token', delta: '...'}           │
        │    │                                                │
        │    ├─ Event: 'tool_use' → Agent calling a tool      │
        │    │  Emit: {type: 'progress', message: '...'}      │
        │    │                                                │
        │    └─ Event: 'done' → All done                      │
        │       └─ Save conversation to DB                    │
        │          Emit: {type: 'complete', tokenUsage}       │
        │                                                      │
        │ 5. Return SSE Stream to frontend                    │
        └─────────────────┬──────────────────────────────────┘
                          │
                          ↓ Server-Sent Events (SSE) Stream
        
        Frontend Receives (streaming):
        ┌────────────────────────────────────────────────┐
        │ data: {"type":"started","role":"developer"}    │
        │ data: {"type":"token","delta":"The"}           │
        │ data: {"type":"token","delta":" login"}        │
        │ data: {"type":"token","delta":" form"}         │
        │ ...                                            │
        │ data: {"type":"progress","message":"...tool"}  │
        │ ...                                            │
        │ data: {"type":"complete","tokenUsage":{...}}   │
        └────────────────┬───────────────────────────────┘
                         │
                         ↓ TaskChatClient processes events
        
        UI Shows:
        ┌──────────────────────────────────────────────┐
        │ [Agent Badge: Developer]                     │
        │                                              │
        │ User: "Can you implement..."                 │
        │                                              │
        │ Assistant: "The login form should have..."   │
        │ [⚡ Using tool: task_create]                 │
        │ "...and we'll create that as a task."        │
        │                                              │
        │ [Tokens: 150 input, 50 output]               │
        │                                              │
        │ [Task Status Buttons]                        │
        │ [Move to IN_REVIEW] [Move to DONE]           │
        └──────────────────────────────────────────────┘
                         │
                         ↓ Conversation History
        
        Paginated History (3 items per page):
        ┌──────────────────────────────────────────────┐
        │ Conversation #3: 2 days ago                  │
        │ "How should we structure..."                 │
        │                                              │
        │ Conversation #2: 5 days ago                  │
        │ "Can you review the code?"                   │
        │                                              │
        │ Conversation #1: 1 week ago                  │
        │ "Implement login feature"                    │
        │                                              │
        │ [← Page 1 of 5 →]                           │
        └──────────────────────────────────────────────┘
```

---

## 5. AGENT TOOL USAGE FLOW

```
┌─ Agent Receives User Message ──────────────────────────────┐
│ "Create a task for database setup"                        │
└─────────────────────┬────────────────────────────────────┘
                      │
                      ↓ Agent LLM decides: "I should use task_create"
        
        Agent calls tool with parameters:
        ┌──────────────────────────────────┐
        │ tool: task_create                │
        │ input: {                         │
        │   title: "Database setup",       │
        │   description: "Set up...",      │
        │   status: "TODO",                │
        │   projectId: "[project-uuid]"    │
        │ }                                │
        └──────────┬───────────────────────┘
                   │
                   ↓ Tool Handler Executes
        
        lib/agents/tools/index.ts: taskCreateTool.execute()
        ┌───────────────────────────────────────────┐
        │ 1. Validate input via Zod schema          │
        │ 2. prisma.task.create({...})              │
        │ 3. Return result as JSON                  │
        │    {                                      │
        │      success: true,                       │
        │      message: "Task created",             │
        │      task: {...full task object...}       │
        │    }                                      │
        └───────────┬───────────────────────────────┘
                    │
                    ↓ Agent Receives Result
        
        Agent continues response:
        "I've created the task 'Database setup'. 
         It's been added to your TODO column."
        
        This response streams back to frontend
        and is saved in conversation history!
```

---

## 6. STATUS VALIDATION LAYERS

```
┌──────────────────────────────────────────────────────────────┐
│              STATUS TRANSITION VALIDATION                    │
│         (Multi-Layer Defense Strategy)                       │
└──────────┬───────────────────────────────────────────────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ↓ LAYER 1: Client-Side (Prevention)   ↓
      ┌────────────────┐
      │ isValidDropTarget() in MissionControlClient.tsx
      │ │
      │ ├─ Checks: TRANSITION_MAP[fromStatus].includes(toStatus)
      │ └─ Returns: boolean
      │
      │ Usage:
      │ ├─ Prevents drag if returns false
      │ ├─ Grays out invalid columns (opacity-50)
      │ └─ Only allows valid drops
      └────────────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ↓ LAYER 2: API Route (Verification)   ↓
      ┌────────────────────────┐
      │ app/api/tasks/[id]/route.ts (PUT handler)
      │ │
      │ ├─ Fetch current task status from DB
      │ ├─ Call validateTransition(currentStatus, newStatus)
      │ └─ If invalid:
      │    └─ Return 422 with {error, allowed: [...]}
      └────────────────────────┘
           │
           ├─────────────────────────────────────┐
           │                                     │
           ↓ LAYER 3: Database (Enforcement)    ↓
      ┌────────────────────────────────────────┐
      │ lib/db/tasks.ts: updateTask()
      │ │
      │ ├─ Validate transition:
      │ │  const result = validateTransition(from, to)
      │ │  if (!result.valid) {
      │ │    throw new InvalidTransitionError(...)
      │ │  }
      │ │
      │ ├─ Only proceed to Prisma update if valid
      │ └─ Return updated task or error
      └────────────────────────────────────────┘
           │
           ↓
    ┌─────────────────────┐
    │ Result to Frontend   │
    │ ✅ Success: Task    │
    │    moved to new     │
    │    status, UI       │
    │    updated          │
    │                     │
    │ ❌ Error: Invalid   │
    │    transition,      │
    │    error message    │
    │    shown to user    │
    └─────────────────────┘
```

---

## 7. KANBAN COLUMN STRUCTURE

```
┌──────────────────────────────────────────────────────────────┐
│                   Mission Control Board                      │
│                  (Horizontal Flex Layout)                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┬──────────────┐
        │              │              │              │              │
        ↓              ↓              ↓              ↓              ↓
   ┌─────────┐  ┌─────────────┐ ┌──────────┐  ┌──────────┐  ┌─────────┐
   │  TODO   │  │IN_PROGRESS  │ │IN_REVIEW │  │  DONE    │  │ BLOCKED │
   │(Slate)  │  │  (Blue)     │ │(Yellow)  │  │ (Green)  │  │  (Red)  │
   └────┬────┘  └──────┬──────┘ └────┬─────┘  └────┬─────┘  └────┬────┘
        │               │              │             │             │
        │               │              │             │             │
        │  ┌──────────┐ │ ┌──────────┐ │ ┌─────────┐ │ ┌────────┐ │ ┌────────┐
        ├─→│ Task Card│ │ │Task Card │ │ │Task Card│ │ │ Task   │ │ │ Task   │
        │  │          │ │ │          │ │ │         │ │ │ Card   │ │ │ Card   │
        │  └──────────┘ │ └──────────┘ │ └─────────┘ │ │ (grayed│ │ │(grayed)│
        │               │               │             │ │ out)   │ │ │        │
        │  ┌──────────┐ │               │             │ └────────┘ │ └────────┘
        ├─→│ Task Card│ │               │             │             │
        │  │          │ │ ┌──────────┐ │             │             │
        │  └──────────┘ │ │Task Card │ │ ┌─────────┐ │             │
        │               │ │(selected)│ │ │Task Card│ │             │
        │  ┌──────────┐ │ │ring-2 .. │ │ │         │ │             │
        ├─→│ Task Card│ │ └──────────┘ │ └─────────┘ │             │
        │  │          │ │               │             │             │
        │  └──────────┘ │ ┌──────────┐ │             │             │
        │               │ │Task Card │ │             │             │
        │               │ └──────────┘ │             │             │
        │               │               │             │             │
        ├──────────────┼───────────────┼─────────────┼─────────────┤
        │ Task Count:  │ Task Count:   │ Task Count: │Task Count:  │
        │  3           │  2            │  1          │ 4           │
        └──────────────┴───────────────┴─────────────┴─────────────┘

EACH COLUMN:
┌─────────────────────────────────────────────────────────────┐
│ Column Header (px-6 pt-6 pb-4)                              │
│ ┌──────────────────────────────┐                            │
│ │ [ICON] COLUMN TITLE      [3] │ [⋮ More Options]          │
│ │        (badge with count)    │                            │
│ └──────────────────────────────┘                            │
├─────────────────────────────────────────────────────────────┤
│ Task Container (overflow-y-auto, flex-col gap-4)            │
│                                                             │
│  ┌──────────────────────────────────────┐                  │
│  │ Task Card (bg-white, rounded-3xl)    │                  │
│  ├──────────────────────────────────────┤                  │
│  │ [Status Badge] e.g. "IN_PROGRESS"    │                  │
│  │                                      │                  │
│  │ Task Title (font-bold, text-sm)      │                  │
│  │                                      │                  │
│  │ Task Description (optional, clipped) │                  │
│  │                                      │                  │
│  │          [Hover Actions]              │ ←── Only on     │
│  │          [↻] [✗] [→]                 │     hover       │
│  └──────────────────────────────────────┘                  │
│                                                             │
│  [... more task cards ...]                                 │
│                                                             │
│ OR if column is empty:                                      │
│  ┌────────────────────────────────────┐                    │
│  │     [📦] Archive Icon               │                    │
│  │           Empty                     │                    │
│  │    (dashed border, light gray)      │                    │
│  └────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. CONVERSATION PERSISTENCE FLOW

```
┌─ User Sends Message in Task Chat ─────────────────────────┐
│ "Help me implement this feature"                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓ Frontend POSTs /api/agents/stream
         
         Agent starts streaming response...
         ┌─────────────────────────────────┐
         │ Agent responds + calls tools    │
         │ (user sees in real-time)        │
         └────────────┬────────────────────┘
                      │
         Stream events:
         ├─ Started
         ├─ Token Token Token... (accumulate)
         ├─ Progress (if using tool)
         └─ Done (final event)
                      │
                      ↓ On "Done" Event
         
         Backend: lib/db/conversations.ts
         ┌──────────────────────────────────────┐
         │ createConversation({                 │
         │   taskId: "[task-uuid]",             │
         │   messages: [                        │
         │     {role: 'user', content: '...'},  │
         │     {role: 'assistant',              │
         │      content: '[full response]'},    │
         │   ],                                 │
         │   result: '[response text]',         │
         │   tokenUsage: {                      │
         │     input: 150,                      │
         │     output: 50                       │
         │   }                                  │
         │ })                                   │
         └────────────┬───────────────────────┘
                      │
                      ↓ Prisma Creates Record
         
         Database (PostgreSQL):
         ┌──────────────────────────────────────┐
         │ Conversations Table                  │
         │ ┌──────────────────────────────────┐ │
         │ │ id: [uuid]                       │ │
         │ │ taskId: [task-uuid]              │ │
         │ │ messages: [JSON array]           │ │
         │ │ result: [full text]              │ │
         │ │ tokenUsage: {input, output}      │ │
         │ │ createdAt: [timestamp]           │ │
         │ └──────────────────────────────────┘ │
         └─────────────────┬────────────────────┘
                           │
                           ↓ Saved! ✅
         
         Frontend:
         ┌──────────────────────────────────────────┐
         │ Conversation History                     │
         │                                          │
         │ Today, Just now:                         │
         │ "Help me implement this feature"         │
         │ → Agent response + tools used...         │
         │                                          │
         │ [← Previous Conversations Page 1 of 3 →] │
         └──────────────────────────────────────────┘
```

---

## 9. MULTI-AGENT COORDINATION

```
┌─ OpenMultiAgent Framework ────────────────────────────┐
│ (From: lib/agents/orchestrator.ts)                   │
└──────────────┬──────────────────────────────────────┘
               │
    ┌──────────┴──────────┬──────────────┐
    │                     │              │
    ↓                     ↓              ↓
 runAgent()            runTeam()      runTasks()
 │                     │              │
 ├─ Single agent      ├─ Multiple    ├─ DAG-scheduled
 │  with prompt       │  agents       │  task pipeline
 │                    │  collaborating│
 └─ Use case:        └─ Use case:    └─ Use case:
    Planning          Brainstorming     Sequential
    Code review       Problem solving   workflow

ARCHITECTURE:
┌───────────────────────────────────────────────────────┐
│ Agent Configuration (lib/agents/configs.ts)           │
│ ┌─────────────────┬────────────────┬────────────────┐ │
│ │ Architect       │ Developer      │ Reviewer       │ │
│ │ (Planner)       │ (Doer)         │ (Assessor)     │ │
│ │                 │                │                │ │
│ │ • Design        │ • Implement    │ • Review       │ │
│ │ • Break down    │ • Code         │ • Check quality│ │
│ │ • Plan          │ • Fix bugs     │ • Find issues  │ │
│ │                 │                │                │ │
│ │ Tools:          │ Tools:         │ Tools:         │ │
│ │ • db_query      │ • db_query     │ • db_query     │ │
│ │ • project_...   │ • task_create  │ (read-only)    │ │
│ │                 │ • task_update  │                │ │
│ │                 │ • task_delete  │                │ │
│ │                 │ • project_...  │                │ │
│ └─────────────────┴────────────────┴────────────────┘ │
└──────────┬──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────┐
│ Shared Tool Registry                                 │
│ ┌────────────────────────────────────────────────┐  │
│ │ Built-in Tools (from open-multi-agent):        │  │
│ │ • Web search, file operations, etc.            │  │
│ │                                                │  │
│ │ Custom Tools (from lib/agents/tools/index.ts): │  │
│ │ • db_query      (all agents)                   │  │
│ │ • task_create   (architect, developer)         │  │
│ │ • task_update   (developer)                    │  │
│ │ • task_delete   (developer)                    │  │
│ │ • project_create(architect, developer)         │  │
│ └────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────────────────┐
│ Tool Executor (ToolExecutor instance)                │
│ Executes tools with proper context isolation        │
└────────────────────────────────────────────────────┘
```

---

## 10. USER INTERACTION JOURNEY MAP

```
┌─────────────────────────────────────────────────────────────┐
│           COMPLETE USER JOURNEY: PROJECT START TO CLOSE     │
└─────────────────────────────────────────────────────────────┘

START
  │
  ├─→ Home Page
  │   ├─ User clicks "New Project"
  │   └─ Creates: "Login Feature"
  │
  ├─→ Mission Control: /mission-control/[projectId]
  │   ├─ Empty board with 5 columns
  │   ├─ User clicks "Add Task"
  │   │  └─ Creates: "Design login form"
  │   ├─ User clicks "Add Task"
  │   │  └─ Creates: "Implement authentication"
  │   └─ User clicks "Add Task"
  │      └─ Creates: "Deploy to production"
  │
  ├─→ Chat with Planner: /chat/[taskId]
  │   ├─ Selects "Planner Agent"
  │   ├─ Asks: "How should I structure the login form?"
  │   ├─ Agent responds with architectural advice
  │   ├─ Conversation saved to DB
  │   └─ User goes back to board
  │
  ├─→ Back to Mission Control
  │   ├─ Drags "Design login form" → IN_PROGRESS
  │   │  (Status updated via API)
  │   └─ Drags it → IN_REVIEW
  │      (Validates transition, success)
  │
  ├─→ Chat with Developer: /chat/[taskId]
  │   ├─ Selects "Developer Agent"
  │   ├─ Asks: "Can you create the form components?"
  │   ├─ Agent calls: task_create (creates subtasks)
  │   │  └─ "Create input fields", "Add validation"
  │   ├─ New tasks appear in TODO
  │   └─ User goes back to board
  │
  ├─→ Back to Mission Control
  │   ├─ Now 5 tasks showing
  │   ├─ Moves "Design login form" → DONE ✅
  │   │  (Terminal state reached)
  │   ├─ Starts moving implementation tasks
  │   │  through IN_PROGRESS → IN_REVIEW → DONE
  │   │
  │   ├─ One task hits a blocker:
  │   │  └─ Clicks "Cancel Task" button
  │   │     └─ Opens dialog: "Why cancel?"
  │   │     └─ Reason: "Waiting for API design"
  │   │     └─ Task moves to BLOCKED (red)
  │   │
  │   ├─ Task Count Updates:
  │   │  • Total: 5
  │   │  • In Progress: 2
  │   │  • Done: 2
  │   │  • Cancelled: 1
  │   │
  │   └─ Close Project Button: DISABLED (still work to do)
  │
  ├─→ Later: Back with new information
  │   ├─ Returns to BLOCKED task
  │   ├─ Hovers on card
  │   ├─ Clicks "Restore" button (↻ icon)
  │   │  └─ Task returns to TODO
  │   ├─ Moves it → IN_PROGRESS
  │   ├─ Chat with Developer again
  │   ├─ Completes the task
  │   └─ Drags to DONE
  │
  ├─→ Mission Control: All Done!
  │   ├─ All tasks in DONE or BLOCKED
  │   │  • Total: 5
  │   │  • In Progress: 0 ✓
  │   │  • Done: 4 ✓
  │   │  • Cancelled: 1 ✓
  │   │
  │   ├─ Close Project Button: ENABLED ✓
  │   └─ User clicks "Close Project" [🚀]
  │
  ├─→ Project Summary Page
  │   ├─ Shows:
  │   │  • Project name
  │   │  • Completion rate
  │   │  • Tasks breakdown
  │   │  • Total conversations
  │   │  • Total tokens used
  │   └─ Archive project
  │
  END ✅
```

---

## Summary: Key Architecture Patterns

1. **Multi-Layer Validation**: Status transitions validated 3 times (client, API, DB)
2. **Drag-and-Drop**: Native HTML5 with custom validation logic
3. **Agent Tools**: Powerful database operations with strict role-based access
4. **Real-time Streaming**: SSE for agent responses, persisted to database
5. **State Management**: Client-side React state + server-side Prisma
6. **Terminal States**: DONE and BLOCKED prevent further transitions
7. **Conversation Persistence**: Every interaction saved with metadata
8. **Multi-Agent Orchestration**: Framework-based coordination of multiple AI roles


# Personal AI Kanban — Product Vision v2

## 1. Overview

A **personal AI work assistant** built on Kanban, designed for **non-tech users** — freelancers, marketers, small business owners, content writers, etc.

Instead of figuring out tasks alone, **AI helps you explore the problem, plan, and execute step by step** — like having a smart coworker sitting next to you.

## 2. Two Entry Points

When users open the web, they see **2 big choices**:

```
┌─────────────────────────────────────┐
│                                     │
│   🆕  NEW PROJECT                    │
│   I have a problem / idea           │
│   → Go straight to AI chat          │
│                                     │
│   📂  CONTINUE PROJECT               │
│   I already have documents          │
│   → Upload files, AI reads first    │
│                                     │
└─────────────────────────────────────┘
```

### 2.1 NEW PROJECT — Start from a conversation
- User enters a **chat screen** right away.
- Agent and user **talk freely**: brainstorm ideas, clarify the problem, discuss direction.
- No message limit — keep talking until user feels the agent understands enough.

### 2.2 CONTINUE PROJECT — Start from documents
- User **uploads files** (PDF, Word, images, links...).
- Agent **reads all documents first**, then starts the conversation.
- Agent summarizes what it understood, then asks follow-up questions.
- User and agent **go back and forth** to clarify.

### Flow after enough context (same for both):

> **AI-first principle:** The agent drives the entire flow. User only needs to respond in natural language — no buttons required. Every transition is initiated by the agent via a conversational suggestion.

```
Step 1: Context exchange
    ↓  User and agent talk freely
    ↓  Agent asks clarifying questions, user answers
    ↓  No limit — agent decides when context is rich enough (3–5 exchanges)

Step 2: Agent proactively suggests → Report
    ↓  Agent detects sufficient context → suggests "Shall I write the report?"
    ↓  UI shows a hint: 💡 "Say Yes or Go ahead to generate report"
    ↓  User confirms in natural language ("yes" / "go ahead" / "đồng ý")
    ↓  Agent generates Report (LLM call #1) and saves structured task titles
    ↓  Report appears in right panel
    ↓  Agent confirms in chat: "Report ready!"
    ↓  User can edit report if needed (right panel has edit mode)

Step 3: Agent proactively suggests → Tasks
    ↓  Immediately after report, agent posts in chat:
       "✅ Found N key tasks. Want me to elaborate each one with description,
        why it matters, and concrete subtasks?"
    ↓  UI shows hint: 💡 "Say Yes to let AI elaborate all tasks in detail"
    ↓  User confirms in natural language
    ↓  Agent elaborates each task (LLM call #2): description, why, subtasks, agent_hint
    ↓  Agent posts task list summary IN CHAT:
       "✨ Done! Here are your N tasks:
        1. [Task title] — [description one-liner] (Doer Agent)
        2. [Task title] — [description one-liner] (Planner Agent)
        ..."
    ↓  Full task detail appears in right panel (expandable cards)
    ↓  User reviews, edits if needed → clicks "Start execution"
```

**Key AI-first behaviors:**
- Agent never waits for a button click — always proactively suggests next step via chat
- `userIntent` detection: AI classifies each user reply as `confirm | explore | reject | neutral`
- `pendingAction` queue: agent remembers what it suggested (`generate_report` → `suggest_tasks`) and dispatches the right action when user confirms
- Fallback: if AI elaboration fails, tasks are still created from bare titles (no data loss)

## 3. Kanban Dashboard — Each Column Is an AI Agent

After the plan is approved, the system switches to the **Kanban Board**. The difference: each column maps to a **separate AI Agent** with its own name and icon.

```
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  TO DO   │ PLANNING │  DOING   │  REVIEW  │   DONE   │ CANCEL   │
│  🎯      │  🗺️       │  ⚡       │  🔍      │  ✅      │  🚫       │
│ Starter  │ Planner  │  Doer    │ Reviewer │ Reporter │          │
│  Agent   │  Agent   │  Agent   │  Agent   │  Agent   │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Agent Roles:

| Column | Agent | Job |
|---|---|---|
| **To Do** | 🎯 Starter Agent | Analyze task, suggest what to do first |
| **Planning** | 🗺️ Planner Agent | Create detailed plan, split into subtasks, identify resources needed |
| **Doing** | ⚡ Doer Agent | Help execute: draft, research, compile information |
| **Review** | 🔍 Reviewer Agent | Check output quality against the criteria set earlier |
| **Done** | ✅ Reporter Agent | Summarize results, save learnings, suggest next steps |
| **Cancel** | — | Record cancel reason, suggest alternatives if needed |

> **UX note:** Agent icon shows on each column header. Clicking a task → opens the Agent Screen for that column.


## 4. Task Detail — Subtask System
When user clicks a task on the board, they enter the matching Agent Screen (Screens 4–7). Each Agent Screen shows:
- **Subtask list** auto-created by AI (can add/remove/edit)
- **Chat** directly with the agent for that stage
- Attachments and created outputs

## 5. Screen Architecture

The product has **7 main screens**, split into 3 groups:

| Group | Screens | Description |
|---|---|---|
| **Group 1: Entry** | Screen 1 | Home / My Projects |
| **Group 2: Planning** | Screen 2 | Chat → Report → Create tasks |
| **Group 3: Kanban Execution** | Screen 3 | Kanban Board |
| | Screens 4–7 | Per-Agent Task Detail |

---

### Screen 1 — Home / My Projects

**Purpose:** Single entry point for the entire web app.

```
┌────────────────────────────────────────────────────────────────────┐
│  NAVBAR: Logo  |  My Projects  |  Avatar                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   👋 Hi! What do you want to work on today?                         │
│                                                                    │
│   ┌───────────────────────┐   ┌───────────────────────┐           │
│   │  🆕  NEW PROJECT       │   │  📂  CONTINUE PROJECT  │           │
│   │  Chat with AI now      │   │  Upload files first    │           │
│   └───────────────────────┘   └───────────────────────┘           │
│                                                                    │
│   ─── In Progress ───────────────────────────────────────         │
│   [Competitor research Veclam24h  •  4/6  •  Doing]               │
│   [New product launch plan  •  1/8  •  Planning]                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Interactions:**
- Click `NEW PROJECT` → go to Screen 2, start chatting
- Click `CONTINUE PROJECT` → open file upload → agent reads first → go to Screen 2
- Click an existing project card → go to Screen 3 (Kanban Board)

---

### Screen 2 — Chat → Report → Create Tasks (AI-first)

**Purpose:** Split-panel screen — **chat is the primary driver**. Right panel is secondary viewer that updates reactively based on what the agent does in chat.

**Phase 1 — Brainstorming** *(agent drives, right panel is idle)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: OUTPUT PANEL                    │
│  ← Back  |  New Project              │  Phase: ① Brainstorming  ② Report  ③ Tasks│
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  ✨ "Hi! What do you want to do?     │  ⏳ Waiting for conversation...          │
│   Tell me about your project."       │                                         │
│                                      │  Chat with the agent on the left.       │
│  [User]: "Research competitors       │  The agent will guide you through       │
│   of Veclam24h"                      │  each step automatically.               │
│                                      │                                         │
│  ✨ "What's the goal of this         │                                         │
│   research?"                         │                                         │
│                                      │                                         │
│  [User]: "Propose a new marketing    │                                         │
│   strategy to my boss"               │                                         │
│                                      │                                         │
│  ✨ "What aspects to compare?"       │                                         │
│                                      │                                         │
│  [User]: "Online marketing & UX"     │                                         │
│                                      │                                         │
│  ✨ "I have a good picture now.      │                                         │
│   Shall I write the project report?" │                                         │
│   💡 Say "Yes" or "Go ahead"         │                                         │
│                                      │                                         │
│  [User types here...]                │                                         │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```
> **AI-first note:** The agent proactively suggests "generate report" after 3–5 exchanges. No button click needed — user just replies naturally.

**Phase 2 — Report** *(agent confirms in chat, report renders on right)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: 📄 REPORT                       │
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  [User]: "Yes, go ahead"             │  GOAL: Understand marketing strategy    │
│                                      │  & UX of 5 main competitors of         │
│  ✨ Generating project report...     │  Veclam24h.                             │
│   [● ● ●]                            │                                         │
│                                      │  BACKGROUND: Veclam24h needs a new     │
│  ✨ "✅ Report ready! I found         │  marketing strategy...                  │
│   5 key tasks. Want me to            │                                         │
│   elaborate each one with detail,    │  SCOPE: Online marketing + website UX  │
│   subtasks, and agent hints?"        │                                         │
│   💡 Say "Yes" to elaborate tasks    │  TARGET AUDIENCE: Marketing Director    │
│                                      │                                         │
│  [User types here...]                │  [✏️ Edit report]                       │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```
> **AI-first note:** After report is saved, agent immediately posts a proactive suggestion in chat — no button needed. The `pendingAction` is set to `suggest_tasks` internally.

**Phase 3 — Tasks** *(agent lists tasks in chat, full detail on right)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: 📋 TASK DETAIL                  │
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  [User]: "Yes, elaborate them"       │  ▼ Identify top 5 competitors           │
│                                      │    What: Map direct competitors         │
│  ✨ Elaborating tasks...             │    Why: Foundation for all analysis     │
│   [● ● ●]                            │    Subtasks:                            │
│                                      │    ☐ Search competitor names            │
│  ✨ "✨ Done! Here are your 5 tasks: │    ☐ Verify they are direct comps       │
│   1. Identify top 5 competitors      │    ☐ List with URLs                    │
│      — Map & verify (Planner)        │    Agent: 🗺️ Planner Agent             │
│   2. Collect social media data       │                                         │
│      — Followers, engagement (Doer)  │  ▷ Collect social media data           │
│   3. Analyze landing pages & UX      │  ▷ Analyze landing pages & UX          │
│      — UI/UX comparison (Doer)       │  ▷ Analyze content & tone              │
│   4. Analyze content & tone          │  ▷ Compare pricing & packages           │
│      — Content strategy (Planner)    │                                         │
│   5. Compare pricing & packages      │  [🚀 Start execution!]                  │
│      — Pricing table (Doer)          │                                         │
│   Expand each task on the right →"   │                                         │
│                                      │                                         │
│  [User]: "Remove the last task"      │                                         │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```
> **AI-first note:** After elaboration, agent posts the **full task list with one-liner descriptions** directly in chat. User reads it in the conversation, then expands cards on the right for subtask detail. Chat remains the single source of truth for what happened.

### Screen 3 — Kanban Board *(Main Execution Hub)*

**Purpose:** Execution center. All task processing happens here and through Agent Screens 4–7.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  NAVBAR: Logo  |  "Competitor Research Veclam24h"  |  4/6 closed  |  Avatar        │
├────────────────────────────────────────────────────────────────────────────────────┤
│  TOOLBAR: [+ Add task]  [Export report]  [View docs]  [History]                     │
├──────────┬──────────┬──────────┬──────────┬──────────┬────────────────────────────┤
│  TO DO   │ PLANNING │  DOING   │  REVIEW  │   DONE   │  CANCELLED                 │
│  🎯      │  🗺️       │  ⚡      │  🔍      │  ✅      │  🚫                        │
│ Starter  │ Planner  │  Doer    │ Reviewer │ Reporter │                            │
│  Agent   │  Agent   │  Agent   │  Agent   │  Agent   │                            │
│ ──────── │ ──────── │ ──────── │ ──────── │ ──────── │ ────────                   │
│ [Card]   │ [Card]   │ [Card]   │ [Card]   │ [Card✓]  │  [Card ✗]                  │
│  Task A  │  Task B  │  Task C  │  Task D  │  Task E  │  Task F                     │
│  2/4 ✓   │  🗺️ chat │  ⚡ chat  │  🔍 QC    │  Done   │  Cancelled                │
├──────────┴──────────┴──────────┴──────────┴──────────┴────────────────────────────┤
│  FOOTER: Total: 6 tasks  |  In progress: 3  |  Done: 2  |  Cancelled: 1  |  Close project  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Board interactions:**
- Drag & drop cards between columns
- Click a card → open the matching Agent Screen (Screens 4–7)
- Agent avatar on column header: click → see agent description
- When all tasks are Done/Cancelled → "Close project" button lights up

---

### Screen 4 — 🗺️ Planner Agent Screen *(Task in PLANNING column)*

**Purpose:** Planner Agent helps user clarify the task plan and break it into subtasks.

**Layout — Split panel:**
```
┌──────────────────────────────────────┬─────────────────────────────��───────────┐
│  LEFT: CHAT WITH PLANNER AGENT       │  RIGHT: TASK PLAN                       │
│                                      │                                         │
│  🗺️ Planner Agent                    │  Task: "Analyze marketing channels"     │
│  "What should this task produce?     │  ─────────────────────────────          │
│   Can you describe the expected      │  📋 SUBTASKS (AI auto-created)           │
│   output?"                           │  ☐ List top 5 competitor channels       │
│                                      │  ☐ Measure followers & engagement       │
│  [User]: "I need a comparison table  │  ☐ Screenshot sample posts              │
│  of 5 competitors on social media"   │  ☐ Comment on strategy                  │
│                                      │                                         │
│  🗺️ "I suggest 4 subtasks.           │  ✅ DONE CRITERIA                        │
│   Want to add paid ads too?"         │  Full comparison table of 5 competitors │
│                                      │                                         │
│                                      │  📎 Reference docs                       │
│  [Input]                             │  → planning_report.md                   │
│                                      │                                         │
│                                      │  [✅ Start working → Move to Doing]     │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

---

### Screen 5 — ⚡ Doer Agent Screen *(Task in DOING column)*

**Purpose:** Doer Agent helps execute the task — research, draft, compile information.

```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT WITH DOER AGENT          │  RIGHT: PROGRESS & OUTPUT               │
│                                      │                                         │
│  ⚡ Doer Agent                        │  Task: "Analyze marketing channels"     │
│  "I found social data for 4/5        │  ─────────────────────────────          │
│   competitors. Still searching       │  📋 SUBTASKS                            │
│   Joboko..."                         │  ✅ List top 5 channels                  │
│                                      │  ✅ Measure followers & engagement       │
│  [User]: "Add Careerlink too"        │  ☐ Screenshot sample posts  ← working   │
│                                      │  ☐ Comment on strategy                  │
│  ⚡ "Added Careerlink.               │                                         │
│   Vietnamworks (850k),               │  📄 CREATED OUTPUT                       │
│   TopCV (620k)..."                   │  [Followers comparison table - draft]   │
│                                      │                                         │
│  [User]: "Make a comparison table"   │  📎 Attachments                          │
│                                      │  + Upload file                          │
│  [Input]                             │                                         │
│                                      │  [🔍 Send to Review →]  [🚫 Cancel task]│
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

---

### Screen 6 — 🔍 Reviewer Agent Screen *(Task in REVIEW column)*

**Purpose:** Reviewer Agent checks output quality — compares against criteria set earlier.

```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT WITH REVIEWER AGENT      │  RIGHT: REVIEW CHECKLIST                │
│                                      │                                         │
│  🔍 Reviewer Agent                   │  Task: "Analyze marketing channels"     │
│  "I reviewed the output. The table   │  ─────────────────────────────          │
│   has all 5 competitors ✅           │  ✅ All 5 competitors included          │
│   But missing the Paid Ads column    │  ✅ Follower numbers have sources       │
│   we agreed on in the plan."         │  ❌ Missing Paid Ads column              │
│                                      │  ✅ Engagement rate calculated          │
│  [User]: "Let me add that column"    │                                         │
│                                      │  📄 Output under review:                │
│  🔍 "After you add it, I'll         │  [View comparison table]                │
│   review again."                     │                                         │
│                                      │  [✅ Approve → Done]  [↩️ Back to Doing]│
│  [Input]                             │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

---

### Screen 7 — ✅ Reporter Agent Screen *(Task in DONE column)*

**Purpose:** Reporter Agent summarizes task results, saves output, suggests next steps.

**Layout — read-heavy, no split panel needed:**
```
┌────────────────────────────────────────────────────────────────────┐
│  ✅ Reporter Agent                                                  │
│  ─────────────────────────────────────────────────────────────     │
│  Task: "Analyze competitor marketing channels"  •  DONE ✅         │
│                                                                    │
│  📝 RESULT SUMMARY                                                  │
│  Analyzed 5 competitors (Vietnamworks, TopCV, Careerlink,          │
│  Joboko, 1900jobs). Vietnamworks leads in followers                │
│  (850k FB). TopCV has the highest engagement rate (4.2%).          │
│  None are using TikTok — potential opportunity.                    │
│                                                                    │
│  📎 SAVED OUTPUT                                                    │
│  → competitor_social_comparison_table.xlsx                          │
│  → screenshots_folder/                                              │
│                                                                    │
│  💡 SUGGESTED NEXT STEP                                             │
│  Next task to work on: "Analyze content & tone of voice"           │
│                                                                    │
│  [View full report]  [Export task summary]  [← Back to Board]      │
└────────────────────────────────────────────────────────────────────┘
```

---

**Design notes:**
- Screens 4–6 use the same **split-panel pattern** (chat on left, context/output on right) → consistent, easy to learn.
- Screen 7 is a read panel — no chat needed, mostly view and export.
- Cancelled tasks have no separate screen — a confirm modal + reason input on Screen 3.
- Transitions between screens 4–7 happen when user drags a card to a new column or clicks a transition button.

---

## 8. Closing a Project

When all tasks are **Done** or **Cancelled**:

1. The **"Close project"** button in the board footer lights up
2. User clicks → **Reporter Agent** auto-generates a summary report:
   - Summary of each task's results (output, key numbers)
   - List of all created files
   - Suggested next steps (agent proposes 2–3 directions)
3. User reviews, exports (PDF/Word), or starts a new project from a suggestion

---

## 9. Technical Implementation — AI-first Planning Flow

> This section documents the **actual code logic** implemented in the frontend, mapped to the product vision above.

### Architecture Overview

```
PlanningScreen (container)
  ├── usePlanningChat        — manages chat state + agentic AI messaging
  ├── useTaskElaboration     — manages task elaboration lifecycle
  ├── PlanningPhaseView      — Phase 1 + 2 UI: chat left, report right
  └── TasksPhaseView         — Phase 3 UI: detailed task cards
```

### LLM Calls

| Call | Function | When | Output |
|---|---|---|---|
| #1 | `generateProjectReport()` | User confirms "generate report" | Markdown report + `{ title, goal, suggested_tasks: string[] }` |
| #2 | `generateDetailedTasks()` | User confirms "elaborate tasks" | Array of `DetailedTask` with `description`, `why`, `suggested_subtasks`, `agent_hint` |
| Ongoing | `chatWithAgenticAI()` | Every user message | `{ reply, userIntent, suggestedAction }` |

### Intent Detection — `chatWithAgenticAI`

The agent classifies every user reply into:

| `userIntent` | Triggers when user says |
|---|---|
| `confirm` | "yes" / "go ahead" / "ok" / "sure" / "tạo" / "đồng ý" / "được" |
| `reject` | "no" / "not yet" / "wait" |
| `explore` | User wants to discuss more |
| `neutral` | General conversation |

When `userIntent === "confirm"`, the `pendingAction` stored locally is dispatched (not the LLM's suggestion) — this ensures the agent's last suggestion is always honored even if LLM context drifts.

### `pendingAction` State Machine

```
[initial]
    │
    ▼ (3–5 exchanges, LLM suggests)
{ type: "generate_report" }
    │
    ▼ (user confirms → report generated)
{ type: "suggest_tasks" }     ← set by handleGenerateReport() after LLM call #1
    │
    ▼ (user confirms → elaboration starts)
null                           ← cleared after dispatch
```

### `DetailedTask` Type

Each AI-elaborated task has:

```typescript
{
  title: string,
  description: string,       // 2–3 sentences: what the task involves
  why: string,               // 1–2 sentences: why it is critical
  suggested_subtasks: string[], // 3–5 concrete action items
  agent_hint: "Starter Agent" | "Planner Agent" | "Doer Agent" | "Reviewer Agent" | "Reporter Agent"
}
```

The `agent_hint` maps directly to the Kanban column agent when the task is created on the board.

### Known Gap (to implement)

After `generateDetailedTasks()` completes, the agent should post a **task list summary message** in chat before switching to the Tasks panel:

```
✨ Done! Here are your 5 tasks:
1. [title] — [description one-liner] (Doer Agent)
2. [title] — [description one-liner] (Planner Agent)
...
```

This requires adding an `onElaborationComplete(tasks, summary)` callback to `useTaskElaboration`, which `PlanningScreen` uses to call `chat.pushAgentMessage()` before `setPhase("tasks")`.
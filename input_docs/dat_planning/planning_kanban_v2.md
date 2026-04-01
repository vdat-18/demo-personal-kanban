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

```
Step 1: Context exchange
    ↓  User and agent talk freely
    ↓  Agent asks, user answers (and vice versa)
    ↓  No limit — until user feels it's enough

Step 2: User asks for Report
    ↓  User says "Write the report" or clicks button
    ↓  Agent reads all context → writes Report
    ↓  User reads report, edits if needed

Step 3: User asks for Tasks from Report
    ↓  User says "Create tasks" or clicks button
    ↓  Agent uses report → creates task list
    ↓  Each task has a description (what to do, what problem it solves)
    ↓  User reviews, edits if needed → clicks "Start execution"
```

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

### Screen 2 — Chat → Report → Create Tasks

**Purpose:** Split-panel screen — chat on the left, report/tasks panel on the right.

**Phase 1 — Conversation** *(right panel is empty, waiting)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: OUTPUT PANEL                    │
│  ← Back  |  New Project              │  Phase: ① Chat  ② Report  ③ Tasks       │
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  🤖 "What do you want to do?         │  ⏳ Waiting for conversation...          │
│   Tell me about it."                 │                                         │
│                                      │  Chat with the agent on the left.       │
│  [User]: "Research competitors       │  When you're ready, click              │
│   of Veclam24h"                      │  "Write the report" to continue.        │
│                                      │                                         │
│  🤖 "What's the goal?"               │                                         │
│                                      │                                         │
│  [User]: "Propose a new marketing    │                                         │
│   strategy to my boss"               │                                         │
│                                      │                                         │
│  🤖 "What aspects to compare?"       │                                         │
│                                      │                                         │
│  [User]: "Online marketing & UX"     │                                         │
│                                      │                                         │
│  ...keep chatting if needed...       │                                         │
│                                      │                                         │
│  [📝 Write the report!]              │                                         │
│  [💬 I want to say more]             │                                         │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

**Phase 2 — Report** *(right panel shows the report)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: 📄 REPORT                       │
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  🤖 "Here's the report based on      │  GOAL: Understand marketing strategy    │
│   our conversation. Review it        │  & UX of 5 main competitors of         │
│   on the right."                     │  Veclam24h.                             │
│                                      │                                         │
│  [User]: "Looks good, but add        │  BACKGROUND: Veclam24h needs a new     │
│   pricing comparison too"            │  marketing strategy...                  │
│                                      │                                         │
│  🤖 "Updated. Check again."          │  SCOPE: Online marketing + website UX  │
│                                      │                                         │
│                                      │  TARGET AUDIENCE: Marketing Director    │
│                                      │                                         │
│                                      │  [✏️ Edit report]                       │
│                                      │                                         │
│  [📋 Create tasks from report!]      │  [📋 Create tasks from report!]         │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

**Phase 3 — Tasks** *(right panel shows task list)*
```
┌──────────────────────────────────────┬─────────────────────────────────────────┐
│  LEFT: CHAT                          │  RIGHT: 📋 TASK LIST                    │
├──────────────────────────────────────┼─────────────────────────────────────────┤
│                                      │                                         │
│  🤖 "Based on the report, here       │  ☐ Identify top 5 competitors           │
│   are 6 tasks. Review on the         │    └ List and verify 5 direct comps     │
│   right. Edit anything you           │  ☐ Collect social media data            │
│   want."                             │    └ Followers, engagement, frequency   │
│                                      │  ☐ Analyze landing pages & UX           │
│  [User]: "Remove the last task,      │    └ Compare UI/UX of 5 competitors     │
│   it's out of scope"                 │  ☐ Analyze content & tone of voice      │
│                                      │    └ Evaluate content strategy          │
│  🤖 "Removed. Anything else?"        │  ☐ Compare pricing & packages           │
│                                      │    └ Pricing comparison table           │
│                                      │  ~~☐ Compile final report~~  ← removed  │
│                                      │                                         │
│                                      │  [✏️ Edit tasks]                        │
│                                      │  [🚀 Start execution!]                  │
│                                      │                                         │
└──────────────────────────────────────┴─────────────────────────────────────────┘
```

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
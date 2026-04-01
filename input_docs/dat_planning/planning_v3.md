# Personal AI Kanban — Product Vision v3

## Core Insight

> **User is the SUPERVISOR — AI is the WORKER.**
>
> User doesn't drag or drop anything. User talks with agent to clarify scope, then agent executes on its own. User only steps in when agent needs a decision.

## 1. Product Vision

**Personal AI Kanban v3** is a personal project assistant where:

- **User talks with agent** to clarify the problem and scope — this is the main user involvement
- **Agent plans, executes, and reviews on its own** — user supervises, only steps in when asked
- **Kanban runs in the backend** — but user never sees columns, never drags cards
- **Feels like a game**: user is the "quest owner", AI agents are the "adventurer team" doing the work


## 2. Two Entry Points

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
    ↓  Agent reads the full conversation history → writes Report
    ↓  Report structure and content reflect what was discussed
    ↓  User reads report, edits if needed

Step 3: User asks for Tasks from Report
    ↓  User says "Create tasks" or clicks button
    ↓  Agent uses report → creates task list
    ↓  Each task has a description (what to do, what problem it solves)
    ↓  User reviews, edits if needed → clicks "Start execution"
```

### Back-navigation Rules

- **At Phase 2 (Report)** → user can go back to chat to add more context → click "Rewrite report" → agent regenerates
- **At Phase 3 (Tasks)** → user can go back to edit report → click "Recreate tasks" → agent regenerates tasks from updated report
- **After clicking "Start execution"** → no going back. Report and tasks are locked. User can still view the report from Mission Control ("Documents" tab).


## 3. Main Interface: Mission Control + Task Chat

After user clicks "Start execution", the system switches to **Mission Control** — a progress monitoring dashboard. User can **click any task to open a dedicated chat** with the agent working on that task.

### Dashboard layout:

```
┌──────────────────────────────────────────────────────────────────┐
│  🎯 Competitor Research Veclam24h                                  │
│  Progress: ████████░░  4/6 tasks done                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❗ NEEDS YOU (1)                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  🔍 Reviewer:                                             │    │
│  │  "Competitor comparison table is missing Paid Ads column. │    │
│  │   Do you want to add it or skip?"                         │    │
│  │  [✅ Add it]  [⏭️ Skip]  [💬 See details →]               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  🔄 IN PROGRESS (2)                                               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ⚡ Analyze landing pages & UX                      [💬]  │    │
│  │     Agent is collecting screenshots of 5 competitors...   │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │  🗺️ Analyze content & tone of voice                 [💬]  │    │
│  │     Agent is planning the analysis...                     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ✅ COMPLETED (3)                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  ✅ Identify top 5 competitors              [👁️ View]     │    │
│  │  ✅ Collect social media data               [👁️ View]     │    │
│  │  ✅ Compare pricing & service packages      [👁️ View]     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  🚫 SKIPPED (1)                                                   │
│  • Analyze offline marketing — reason: "User chose to focus      │
│    on online only"                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Each task has a [💬] button — click to open Task Chat

When user clicks any task (or the 💬 button), it opens a **dedicated chat between user and the agent working on that task**:

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Dashboard  |  Task: "Analyze landing pages & UX"      │
│  Agent: ⚡ Doer  |  Status: IN PROGRESS                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚡ Doer Agent                                                   │
│  "I'm analyzing landing pages of 5 competitors.                  │
│   Done 3/5 so far. Careerlink has a unique UI —                  │
│   homepage is just 1 big search bar."                            │
│                                                                  │
│  [User]: "Interesting. Screenshot the comparison please."        │
│                                                                  │
│  ⚡ "Done. Which criteria should I evaluate —                    │
│   load speed, mobile UX, or design?"                             │
│                                                                  │
│  [📱 Mobile UX]  [🎨 Design]  [⚡ Speed]  [💬 All of them]       │
│                                                                  │
│  ─── Progress ──────────────────────────────────────             │
│  ✅ Vietnamworks  ✅ TopCV  ✅ Careerlink                         │
│  🔄 Joboko (analyzing...)                                        │
│  ⏳ 1900jobs                                                     │
│                                                                  │
│  ─── Draft output ──────────────────────────────────             │
│  📎 landing_page_comparison_draft.xlsx                           │
│  📎 screenshots/                                                 │
│                                                                  │
│  [🚫 Cancel this task]                                           │
└──────────────────────────────────────────────────────────────────┘
```

### Why Task Chat?

1. **Keeps dashboard clean**: Dashboard shows overview only — details live in the chat
2. **Natural for non-tech users**: Everyone knows how to chat (like Messenger/WhatsApp)
3. **Agent posts updates automatically**: Agent logs progress in chat — user opens it and sees everything
4. **User can step in anytime**: Type a message to ask, request more, or click quick-action buttons
5. **Clear history**: All decisions, outputs, files are in the chat thread
6. **User doesn't change status**: Agent reviews and marks done on its own. User only steps in when agent pings or wants to cancel

---

## 4. Agent Autonomy — Self-execute, Self-transition

Agent doesn't wait for user. Agent **does everything on its own** and moves tasks through stages:

```
Agent receives new task (to_do)
        ↓
🗺️ Planner creates plan → splits subtasks → moves to "doing"
        ↓
⚡ Doer executes → creates output → moves to "review"
        ↓
🔍 Reviewer checks quality
        ↓  Pass → moves to "done"
        ↓  Fail → sends back to "doing" (Doer fixes it)
        ↓  Needs user input → pings user (❗ Needs you)
        ↓
✅ Reporter summarizes results
```

**Agent pings user when:**
- Ambiguity (unclear what user wants)
- Needs information only user has
- Output doesn't meet criteria and needs user decision: keep or fix
- Task is done — reports the result

**Agent does NOT ping user when:**
- Task is running normally
- Moving between stages (does it automatically)
- Creating subtasks (does it automatically)
- Review passes (moves to done automatically)

---

## 5. Closing a Project — Summary & Next Steps

When **all tasks are done** (done or cancelled), agent automatically:

### 5.1 Generates a summary report

```
┌────────────────────────────────────────────────────────────┐
│  📊 PROJECT SUMMARY REPORT                                   │
│  "Competitor Research Veclam24h"                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📝 SUMMARY                                                 │
│  Completed 5/6 tasks (1 skipped).                           │
│  Analyzed 5 main competitors: Vietnamworks, TopCV,          │
│  Careerlink, Joboko, 1900jobs. Vietnamworks leads in        │
│  followers (850k FB). TopCV has highest engagement.          │
│  None are using TikTok — big opportunity.                   │
│                                                            │
│  📎 RESULTS BY TASK                                         │
│  ✅ Identify top 5 competitors      → competitor_list.xlsx  │
│  ✅ Collect social media data       → social_data.xlsx      │
│  ✅ Analyze landing pages & UX      → ux_comparison.pdf     │
│  ✅ Analyze content & tone          → content_analysis.docx │
│  ✅ Compare pricing & packages      → pricing_table.xlsx    │
│  🚫 Analyze offline marketing      → (skipped)             │
│                                                            │
│  📊 COMPILED FILE                                           │
│  → full_competitor_research_report.pdf                      │
│                                                            │
│  [📥 Download report]  [📧 Send email]  [📋 Copy summary]  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💡 SUGGESTED NEXT PROJECTS                                 │
│                                                            │
│  Based on the research results, I suggest 3 directions:    │
│                                                            │
│  1. 📱 Build a TikTok strategy for Veclam24h               │
│     → No competitor is on TikTok yet — first-mover chance  │
│                                                            │
│  2. 🎯 Optimize landing page using TopCV as benchmark      │
│     → TopCV has the best mobile UX — worth learning from   │
│                                                            │
│  3. 📝 Build a unique content strategy & brand voice       │
│     → All competitors sound the same — differentiate       │
│                                                            │
│  [🚀 Start new project from suggestion #1]                 │
│  [🚀 Start new project from suggestion #2]                 │
│  [🚀 Start new project from suggestion #3]                 │
│  [✏️ I have a different idea]                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Project loop

If user picks a suggestion → system creates a new project with context inherited from the previous one. This creates a **continuous loop**: Research → Insight → Action → More Research.

---

## 6. End-to-End Flow

```
User states goal / uploads documents
        ↓
Free conversation with agent (brainstorm, clarify scope)
        ↓
User asks "Write the report"
        ↓
Agent compiles context → writes Report
        ↓
User reads, edits the report
        ↓
User asks "Create tasks"
        ↓
Agent uses report → creates tasks (each with description)
        ↓
User reviews tasks, edits if needed → clicks "Start execution"
        ↓
Agent executes each task on its own (auto-transitions between stages)
        ↓
   ┌────────────────────────────────────────────┐
   │  Agent hits a problem?                     │
   │  Yes → Ping user (buttons or chat)         │
   │  No → Keep going, self-review              │
   └────────────────────────────────────────────┘
        ↓ (repeats for each task)
All tasks done
        ↓
Agent generates final report + suggests next projects
        ↓
User reviews, exports, or starts a new project
```

---

## 7. Screen Architecture — 3 screens + 2 sub-screens

| # | Screen | Purpose |
|---|---|---|
| **1** | **Home / My Projects** | Project list, choose NEW or CONTINUE |
| **2** | **Chat → Report → Create tasks** | Free chat, write report, create tasks from report |
| **3** | **Mission Control** | Dashboard to monitor progress of all tasks |
| **3a** | **Task Chat** | Dedicated chat between user and agent for each task |
| **3b** | **Project Summary** | Final report + suggested next projects |

---

### Screen 1 — Home

```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR: Logo  |  My Projects  |  Avatar                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  👋 Hi! What do you want to work on today?                │
│                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐│
│  │  🆕  NEW PROJECT         │  │  📂  CONTINUE PROJECT   ││
│  │  Chat with AI now        │  │  Upload files first      ││
│  └─────────────────────────┘  └─────────────────────────┘│
│                                                          │
│  ─── In Progress ────────────────────────────────────    │
│  [Competitor research Veclam24h  •  4/6  •  ❗ Needs you]│
│  [New product launch plan  •  1/8  •  🔄 In progress]    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Screen 2 — Chat → Report → Create Tasks

**Everything happens on 1 chat screen — with 3 clear phases:**

```
┌──────────────────────────────────────────────────────────┐
│  ← Back  |  New Project  |  Phase: ① Chat ② Report       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ═══ PHASE 1: CONVERSATION ══════════════════════════    │
│                                                          │
│  🤖 AI Agent                                             │
│  "What do you want to do? Tell me about it."             │
│                                                          │
│  [User]: "Research competitors of Veclam24h"             │
│                                                          │
│  🤖 "What's the goal of the research?"                   │
│                                                          │
│  [User]: "To propose a new marketing strategy to my boss"│
│                                                          │
│  🤖 "What aspects do you want to compare?"               │
│                                                          │
│  [User]: "Online marketing and website UX"               │
│                                                          │
│  ...keep chatting if needed...                           │
│                                                          │
│  [📝 Write the report!]   [💬 I want to say more]        │
│                                                          │
│  ═══ PHASE 2: REPORT ════════════════════════════════    │
│                                                          │
│  🤖 "Based on our conversation, here's the report:"     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📄 REPORT                                          │  │
│  │  ─────────────────────────────────────────────      │  │
│  │  GOAL: Understand marketing strategy & UX           │  │
│  │  of 5 main competitors of Veclam24h.                │  │
│  │                                                     │  │
│  │  BACKGROUND: Veclam24h needs a new strategy...      │  │
│  │                                                     │  │
│  │  SCOPE: Online marketing + website UX               │  │
│  │                                                     │  │
│  │  TARGET AUDIENCE: Marketing Director                 │  │
│  │                                                     │  │
│  │  [✏️ Edit report]                                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [📋 Create tasks from report!]                          │
│                                                          │
│  ═══ PHASE 3: TASKS ═════════════════════════════════    │
│                                                          │
│  🤖 "Based on the report, I suggest 6 tasks:"           │
│                                                          │
│  ☐ Identify top 5 competitors                           │
│    └ List and verify 5 direct competitors               │
│  ☐ Collect social media data                            │
│    └ Followers, engagement rate, posting frequency       │
│  ☐ Analyze landing pages & UX                           │
│    └ Compare UI/UX desktop + mobile of 5 competitors    │
│  ☐ Analyze content & tone of voice                      │
│    └ Evaluate content strategy and brand voice           │
│  ☐ Compare pricing & service packages                   │
│    └ Comparison table of recruitment pricing plans       │
│  ☐ Compile final report                                 │
│    └ Write final report from all collected data          │
│                                                          │
│  [✏️ Edit tasks]   [🚀 Start execution!]                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

### Screen 3 — Mission Control

*(Described in detail in Section 3)*

**Main interactions:**
- Click a task → open **Task Chat** (Screen 3a)
- [💬] button on each task → quick chat with agent
- [👁️ View] button on completed tasks → see results
- When all done → auto-shows **Project Summary** (Screen 3b)
- **"Documents" tab** → view original report and all AI-created files
- **"History" tab** → read the initial context conversation
- **Cancel task from dashboard**: swipe left on task (mobile) or "⋯" menu → "Cancel task" (desktop)

---

### Screen 3a — Task Chat

*(Described in detail in Section 3, "Task Chat" part)*

---

### Screen 3b — Project Summary

*(Described in detail in Section 5)*

---

## 8. UX Design Principles

1. **User never sees Kanban columns** — Kanban is backend, not frontend.
2. **Agent does everything on its own** — plans, executes, reviews, transitions between stages.
3. **Chat is the main interface** — clarify context via chat, clarify tasks via chat.
4. **Skipping is fine** — user can skip any question, agent will pick a default.
5. **Report first, tasks second** — must have a clear report before creating tasks. Tasks serve the report.
6. **Every task has a description** — user knows what the task does and what part of the report it addresses.
7. **Ending includes suggestions** — after completion, agent suggests next directions → project loop.
8. **Friendly language** — no "sprint", "backlog", "story points".

---

## 9. Hidden Kanban — Full Pipeline in the Backend

The system runs a full Kanban pipeline in the backend:

```
to_do → planning → doing → review → done / cancelled
```

But user never sees it. Mapping:

| Backend state | User sees | Who decides the transition |
|---|---|---|
| `to_do` | (queued, not shown) | Agent picks the next task |
| `planning` | 🔄 In progress | Agent auto-transitions |
| `doing` | 🔄 In progress | Agent auto-transitions |
| `review` | 🔄 In progress — or ❗ Needs you | Agent self-reviews; pings user if needed |
| `done` | ✅ Completed | Agent auto-transitions when review passes |
| `cancelled` | 🚫 Skipped | User decides |

**AI agent mapping:**

| Agent | Role | Does on its own | Pings user when |
|---|---|---|---|
| 🗺️ Planner | Plans subtasks | Splits subtasks, estimates scope | Scope is unclear |
| ⚡ Doer | Executes the task | Researches, compiles, drafts | Needs data from user |
| 🔍 Reviewer | Checks quality | Checks criteria, sends back to Doer if incomplete | Output needs user decision: keep or fix |
| ✅ Reporter | Summarizes results | Writes summary, saves files | Task is done — reports the result |

---

*This is a vision document for v3 — focused on the non-tech user experience. Kanban is still the technical backbone, but completely hidden from the user interface.*

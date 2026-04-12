# Current System Snapshot

This document is a codebase-level snapshot of the maintained application in `nextjs-kanban/` as inherited on 2026-04-12.

It is meant to answer:

- What product is this trying to be?
- What user flow exists today?
- Which features are real versus still aspirational?
- Where are the important gaps and risks?

It does **not** describe a live production environment or real customer data. This snapshot is based on source inspection, local build/lint verification, and the planning/spec documents in the repo.

## 1. What This Product Is

At a high level, this is an **AI-assisted personal project workspace** built around a Kanban execution model.

The intended audience is clearly **non-technical or semi-technical operators** such as:

- marketers
- small business owners
- freelancers
- knowledge workers managing multi-step projects

The product vision in `input_docs/dat_planning/*.md` is consistent:

- the **user is the supervisor**
- AI agents are the **workers**
- planning should happen through natural-language chat
- task execution should feel increasingly autonomous
- the Kanban model is the internal execution engine

In the strongest version of the vision, the user should mostly talk to AI, approve important decisions, and monitor progress. The current app only partially reaches that ideal.

## 2. Product Vision vs. Current Reality

### Intended vision

The planning docs describe a flow like this:

1. Start a new project or continue from uploaded documents.
2. Chat with AI until enough context is gathered.
3. AI writes a blueprint/report.
4. AI turns that blueprint into executable tasks.
5. Agents plan, do, review, and report with minimal user micromanagement.
6. The system closes the loop by suggesting next projects.

### Current implementation

The current app still exposes the Kanban model directly and remains fairly manual:

- users can create projects and tasks
- planning is chat-driven and fairly mature
- execution happens on a visible Kanban board
- users still manually open task chats, choose agents, and move status often
- some autonomy exists via per-column auto mode
- the “Reporter” / project-closing loop is only partially implemented

So the current system is best described as:

> **A planning-first AI Kanban workspace with partial automation**

not yet:

> **A mostly autonomous AI project operator**

## 3. Current User Flow

### 3.1 Home / project entry

The landing page is a project dashboard with two entry options:

- `New Project`
- `Import Data`

Current behavior:

- creating a project works
- selecting a business domain works (`SOFTWARE_ENGINEERING`, `MARKETING`, `SALES`, `LOGISTICS`)
- imported-file handling is **not actually implemented yet**

Important detail:

- the import flow currently uses a file picker UI, but the file change handler just creates/starts a project rather than ingesting documents

### 3.2 Planning workspace

This is the strongest part of the app today.

The planning screen is a three-panel workspace:

- left: planning threads
- center: chat
- right: task panel

The planning agent uses a **three-phase flow**:

1. `discovery`
2. `blueprint`
3. `task_mapping`

What exists today:

- planning threads persist in the database
- messages persist in the database
- the AI can maintain a rolling “vision document”
- the AI can propose task mutations inline using structured markdown blocks
- users can approve or dismiss proposed task adds/updates/deletes
- users can also trigger “Generate Tasks from Chat”
- users can manually add tasks
- once tasks exist, users can jump to execution

This part of the product most closely matches the intended “AI planning copilot” vision.

### 3.3 Mission Control / Kanban execution

After planning, the user enters a five-column Kanban board:

- `TODO`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`
- `BLOCKED`

Current board capabilities:

- drag and drop with lifecycle enforcement
- add task
- move forward/back using quick actions
- block/restore tasks
- per-column auto mode for actionable columns
- lightweight footer stats

This is a visible, operator-style mission control surface. It is much more hands-on than the “kanban hidden in the backend” version described in the product vision docs.

### 3.4 Task chat

Each task has a dedicated chat page with:

- task context
- status controls
- persistent conversation history
- streaming AI responses via SSE
- selectable agent role

Current agent choices exposed to the user:

- Planner Agent (`architect`)
- Doer Agent (`developer`)
- Reviewer Agent (`reviewer`)

This is the core task-level work surface. It stores each completed interaction as a `Conversation` linked to the task.

### 3.5 Task summary

There is a task summary page that shows:

- latest result markdown if available
- conversation/session counts
- basic task insight stats

It exists, but it is still incomplete as a polished reporting surface. The intended “Reporter Agent” loop is not fully wired.

### 3.6 Directory

There is also a global directory page for:

- browsing projects
- filtering tasks by status
- searching tasks/projects

This looks like an internal operational index rather than an end-user-facing narrative surface.

## 4. AI / Agent Model

The maintained backend currently supports **three real agent roles**:

- `architect`
- `developer`
- `reviewer`

These run through `@jackchen_me/open-multi-agent` and are configured with:

- OpenAI provider
- `gpt-4o-mini`
- custom DB tools

### What the agents can do

- `architect`
  - planning
  - blueprinting
  - generating tasks
  - project creation

- `developer`
  - task execution
  - task CRUD
  - project creation

- `reviewer`
  - read-only review behavior
  - database lookup only

### Domain-specific prompting

Prompts are specialized by domain:

- software engineering
- marketing
- sales
- logistics

That means the same workflow is intended to serve multiple job families, not just software work.

### Important mismatch

The UI and specs reference a **Reporter Agent**, but the backend does not currently implement a `reporter` role. This is one of the clearest vision-vs-reality gaps in the repo.

## 5. Data Model Snapshot

The current Prisma schema contains these core concepts:

- `Project`
- `Task`
- `Conversation`
- `PlanningThread`
- `PlanningMessage`
- `MutationAction`

### What that means product-wise

- a project is the top-level work container
- tasks represent executable units of work on the board
- task-level AI sessions are stored as conversations
- planning is separate from execution and has its own thread/message system
- AI-suggested task changes in planning can be approved/dismissed and that choice is recorded

### What is not present

- no dependency graph between tasks yet
- no project-level summary/report model
- no first-class artifact/file model
- no user/account/auth model
- no notification/escalation model

So the product currently tracks **planning, task execution, and chat history**, but not a full work graph or document system.

## 6. Features That Are Implemented Today

The following capabilities appear genuinely implemented in the maintained app:

- project CRUD
- domain selection per project
- planning chat with persistent threads
- AI planning phases (`discovery`, `blueprint`, `task_mapping`)
- persistent vision document extracted from AI messages
- AI-suggested task mutation cards in planning
- task CRUD
- AI-generated task list from planning conversation
- task status lifecycle enforcement
- mission-control Kanban board
- task chat with streaming SSE responses
- conversation persistence with token usage
- per-column auto mode for task processing
- token usage analytics endpoints
- Docker-based local environment

## 7. Features That Are Partial or Placeholder

These exist in the UI or docs, but are not fully realized:

- document import / “continue project” workflow
- reporter agent and rich summary generation
- project closeout loop
- autonomous multi-agent end-to-end workflow
- dependency-aware task graph
- timeline and insights product surfaces

## 8. Features That Exist Mostly as Specs / Roadmap

The `openspec/changes/` folder is effectively a roadmap/history of intended product evolution.

Notable planned directions include:

- auto agent selection
- reporter agent
- autonomous workflow chains
- task dependencies
- checkpoint diffing
- TrollLLM/OpenAI-compatible provider switching

Some of these are partially reflected in code, but many are still proposal-level.

## 9. Architecture Snapshot

### App shape

The maintained runtime lives in `nextjs-kanban/` and uses:

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- React Query
- Zustand
- SSE streaming for chat responses

### Interaction pattern

The app uses:

- server-rendered route pages for initial data loading
- client components for interactive workflows
- REST APIs for CRUD
- SSE for streamed agent output

### Important architecture split

There are two conversation systems:

- **planning conversations** for project definition
- **task conversations** for execution

That is a meaningful product design decision. Planning and execution are treated as separate phases with separate storage models.

## 10. Legacy / Repo Shape Reality

This repo contains more than one generation of the product.

### Maintained application

The real application to care about is:

- `nextjs-kanban/`

### Legacy or experimental remnants at the repo root

These appear to be older experiments and not the main runtime path:

- `frontend/`
- `server/`
- `pyproject.toml`

This is important for future planning: the repo is a **multi-era monorepo snapshot**, not a clean single-app repository.

## 11. Current Gaps, Risks, and Oddities

These are the highest-signal issues to know as a new owner.

### Product/UX gaps

- The vision says “AI-first, low-friction, mostly autonomous,” but the execution UX is still fairly manual.
- The document-import story is not implemented despite being a major entry point in the product vision.
- The Reporter loop is missing, which weakens the “close project and suggest next project” story.

### Technical/product consistency gaps

- `Navigation` links to `/timeline` and `/insights`, but those routes do not exist.
- The mission-control “Close Project” button navigates to `/summary/${project.id}`, while the summary route expects a **task id**, not a project id.
- The app-level README was previously a generic Next.js template, which made the project harder to inherit.

### Quality snapshot

- `npm run build` passes
- `npm run db:generate` passes
- `npm run lint` fails with many existing issues
- there is no real automated test suite yet

### Documentation reality

There are many useful docs in the repo, but some older exploration docs are already behind the current schema and feature set. Treat them as historical context, not authoritative truth.

## 12. What I Would Call the System Today

If you need one sentence to align stakeholders, I would describe the current system as:

> A multi-domain AI planning and execution workspace that turns project conversations into tasks, lets users manage those tasks on a Kanban board, and supports task-level AI collaboration with partial automation.

If you need a more candid internal version:

> The system has a strong planning core, a workable execution board, and early automation, but it has not yet fully become the autonomous “user supervises, AI works” product imagined in the vision docs.

## 13. Recommended Starting Points for Future Planning

If you are inheriting the system, the best order to read the codebase is:

1. `CURRENT_SYSTEM_SNAPSHOT.md` (this file)
2. `components/home/HomeClient.tsx`
3. `components/planning/PlanningClient.tsx`
4. `components/mission-control/MissionControlClient.tsx`
5. `components/task-chat/TaskChatClient.tsx`
6. `lib/agents/prompts.ts`
7. `prisma/schema.prisma`
8. `openspec/changes/` for roadmap intent

## 14. Likely Strategic Directions

Based on the code and specs, the most natural future directions are:

- finish the AI-first onboarding story
- make import/doc ingestion real
- complete the reporter/summarization loop
- reduce manual agent/status selection
- add autonomous workflows in a controlled way
- decide whether the long-term UX should remain visible-Kanban or move closer to invisible-Kanban supervision

That last question is the biggest product decision still unresolved in the repo.

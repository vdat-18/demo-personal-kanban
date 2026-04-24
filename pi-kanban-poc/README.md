# pi-kanban-poc

A personal Kanban app where an AI helps you plan, execute, and review your work — from raw idea to finished deliverable.

No server, no database. Everything runs in the browser.

---

## The Big Idea

Most Kanban tools just track cards. This one assigns an **AI agent** to each task that actually *does* the work with you — breaking it down into steps, generating output, then reviewing it for quality before anything is marked done.

The workflow has two phases:

1. **Planning** — you and the AI figure out *what* to build (the vision, the tasks, the scope).
2. **Execution** — for each task, the AI walks you through *how* to build it, step by step.

---

## How to Run

You need Node.js 20+ and an API key from either Anthropic (Claude) or OpenAI (GPT).

```bash
# inside pi-kanban-poc/
npm install
npm run dev
```

Open http://localhost:3000. Set your API key as an environment variable (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) before starting.

Everything you create is saved in your browser. To start fresh, clear the app's data from your browser's local storage.

---

## The Screens

### 1. Dashboard — Your Projects

The home screen. Each card is a project. You can:
- **Create** a project from scratch (just give it a name).
- **Import** a project by uploading documents (PDFs, Word files, spreadsheets, images) or pasting text. The AI reads the materials and pre-fills the project context for you.

---

### 2. Planning — Define What You're Building

This is the most important screen. It's a chat with an AI whose job is to help you clearly define your project before any work starts.

As you chat, the AI maintains a **living vision document** — a summary of what the project is, what it should produce, and any constraints. It updates this document as your conversation evolves.

The planning process has three phases, and the AI guides you through them:

- **Discovery** — What is this project? What problem does it solve?
- **Define** — What exactly will be delivered? What are the rules and constraints?
- **Execute** — Turn the plan into a task list ready for the Kanban board.

Along the way, the AI may:
- Ask you clarifying questions to fill in gaps.
- Propose tasks for you to approve or reject.
- Suggest moving to the next phase when it thinks you're ready.

You can also upload reference files (specs, research, existing content) and the AI will factor them into its suggestions throughout the whole project.

---

### 3. Mission Control — The Kanban Board

A classic four-column board: **To Do → In Progress → In Review → Done**.

Tasks move through these columns as work progresses. You can drag them between columns (only valid moves are allowed — you can't skip directly from To Do to Done, for example).

The board also shows a summary panel at the top with project status, sources, and workflow notes — the same context the AI uses when making decisions.

---

### 4. Task Chat — The Agent Workspace

When you open a task, you enter its dedicated agent workspace. This screen changes depending on where the task is in its journey:

#### Task is "To Do" → Step Planner

The AI proposes a list of subtasks — the concrete steps needed to complete this task. You review each one, approve or deny them, and can edit any step or ask the AI to revise the whole plan via chat.

Once you're happy with the plan, you approve it and the task moves to "In Progress."

#### Task is "In Progress" → Doer

The AI executes one subtask at a time, producing a real output (a written document, a plan, a piece of code, etc.). For each step:
- The AI generates a draft.
- You can accept it, ask it to retry, or give it a specific refinement instruction ("make this more concise" / "add more detail on X").
- Once a step is done, it moves to the next one.

When all subtasks are complete, the task moves to "In Review."

#### Task is "In Review" → Reviewer

A fresh AI perspective reads through everything the Doer produced and gives a verdict:
- **Approved** — work meets the standard, move to Done.
- **Needs revision** — specific steps have issues; task goes back to In Progress with notes.
- **Rejected** — overall quality isn't there; task returns with detailed feedback.

This creates a quality gate so nothing goes to Done without being checked.

---

### 5. Summary

When a task reaches Done, its summary screen shows the final deliverable, the reviewer's notes, and usage stats. Everything is available to copy or download.

---

### 6. Directory

A searchable browser for everything across all projects:
- **Projects tab** — all projects with descriptions and artifact counts.
- **Tasks tab** — all tasks, filterable by project, status, and priority.
- **Artifacts tab** — the actual outputs produced by the AI (vision documents, subtask deliverables), grouped by project, with copy and download buttons.

---

### 7. Knowledge Hub

A read-only gallery of published vision documents across projects. Useful for sharing or archiving what was planned and why.

---

## The AI's Role — Summary

The AI in this app is not just a chatbot. It has four distinct roles:

| Role | When | What it does |
|---|---|---|
| **Planner** | Planning screen | Runs the planning conversation, updates the vision doc, proposes tasks |
| **Breakdown agent** | Task is To Do | Proposes a step-by-step plan for the task |
| **Doer agent** | Task is In Progress | Executes each step and produces real output |
| **Reviewer agent** | Task is In Review | Audits all output and decides if the task is done |

Each role has access to the full project context: the vision document, imported source files, workflow rules, and the history of what's been discussed and produced.

---

## How Data Is Stored

There is no server database. All data — projects, tasks, subtasks, conversations, AI outputs, version history — is stored in your browser's local storage.

This means:
- The app works offline once loaded.
- Data is private to your browser.
- Clearing your browser data will erase everything.
- Multiple browser tabs share the same data via the store.

---

## How the AI Is Called

All AI calls go through a single server endpoint. Depending on the context (planning, breakdown, doer, reviewer), the server builds a detailed system prompt that includes:
- Project vision and context
- Imported source documents
- Workflow rules and constraints
- Conversation history

Then it streams the response back to the browser in real time. The structured parts of the response (task proposals, subtask lists, verdicts) are parsed from the AI's output and rendered as interactive UI elements.

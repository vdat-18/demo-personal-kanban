# Multica Adaptation Overview

This file explains, in simple English, what we adapted from `Multica` into `pi-kanban-poc`, why it matters, and how the product feels before vs after the changes.

## Big Picture

Before these changes, `pi-kanban-poc` was already a useful AI planning flow: create a project, chat with AI, draft a plan, approve tasks, then move into execution. But many important things still felt too chat-based. Uploaded files mostly became prompt text, planning history was hard to scan, users had to remember what still needed action, and each project reused very little long-term user context. The system worked, but too much structure was hidden behind chat turns.

After these changes, the product is closer to a structured work system. Imported files are stored as visible project sources, planning has a timeline, the app can show what needs attention, projects can follow playbooks, AI can reuse personal preferences, and users can quickly resume where they left off. In practice, this means the product now manages more of the workflow explicitly instead of leaving users to reconstruct state from chat history.

In one sentence: before, the app mainly helped users talk to AI about a project; after, it helps users manage context, decisions, and next actions across the project lifecycle.

## What We Adapted

We adapted the parts of Multica that fit this product well: source objects, timeline thinking, reusable playbooks, personal AI context, attention management, and resume clarity. These are the parts that improve workflow structure without changing the core product into an enterprise agent platform. We did not bring over the heavy platform parts such as daemon/runtime architecture, multi-agent orchestration, enterprise autopilot workflows, or AI teammate assignment. Those ideas are useful in Multica, but too heavy for this POC.

## Simple Example

Imagine a non-technical user uploads three files: a project brief PDF, meeting notes, and a budget spreadsheet, then adds one extra note: `Please prioritize launch readiness and keep the plan concise.` This example shows the difference clearly.

## Before vs After

### 1. Imported Files

Before, the flow was simple: upload files, parse them, inject the extracted content into a prompt, and let the AI reply. This worked, but the files themselves did not feel like real project assets. A user could easily ask: Where are my files now? Which file did the AI actually use? Can I review the imported sources later? The files helped the model, but they did not become a visible part of the project structure.

After, imported files are stored as real `ImportedSource` objects. Each source can have a title, file kind, summary, extracted text, status, category, parse quality, and a flag showing whether it is used in planning. The planning screen now includes an `Imported Sources` panel, so the user can review what was imported, inspect weak or partial sources, and understand which source material is actively shaping the plan.

Example: before, `brief.pdf`, `notes.docx`, and `budget.xlsx` disappeared into the prompt. After, the UI can show `brief.pdf` as a high-quality brief used in planning, `notes.docx` as medium-quality notes, and `budget.xlsx` as a high-quality budget source. If parsing was weak, the file can show `needs review`.

### 2. Planning Timeline

Before, planning history was split across chat messages, the plan document, and task proposal cards. The user could continue working, but it was hard to reconstruct the project story: what happened first, when AI revised the plan, or when tasks were proposed. Important decisions existed, but they were not grouped into a readable operational history.

After, planning has a dedicated `Planning Timeline` that records events such as project created, playbook selected, sources imported, AI readback created, vision updated, tasks proposed, task approved, and execution started. It also supports filters like `all`, `sources`, `revisions`, and `tasks`. This gives the project a more explicit event history, closer to how a real work system records progress.

Example: before, the user only remembered that tasks appeared at some point. After, they can read a short history like: project created -> playbook selected -> 3 sources imported -> AI readback created -> plan revised -> tasks proposed -> 2 tasks approved.

### 3. Attention Layer

Before, important states existed, but the user had to remember them manually: maybe a source needed review, maybe tasks were still waiting for approval, maybe the plan was still unpublished, or maybe execution had a blocked task. The system had the raw state, but it did not actively convert that state into a short action list for the user.

After, the app has a lightweight `Needs Attention` layer. Attention items can represent source review, pending approvals, unpublished plan state, or blocked execution. This means the system now surfaces what needs user action instead of expecting the user to remember everything alone. In product terms, this is a small but useful attention-management layer.

Example: before, the user had to remember three separate pending items. After, the panel can simply show: `Some imported sources need review`, `Task proposals are waiting for approval`, and `The current plan is still unpublished`.

### 4. Where We Left Off

Before, when the user returned later, they had to re-orient manually: what phase are we in, what happened last, are there pending approvals, what should I do next? The system stored the data, but resuming still depended too much on user memory.

After, planning includes a `Where We Left Off` panel that shows the current phase, the latest planning event, pending approvals, open attention items, and saved user context. This gives the user a compact resume checkpoint instead of forcing them to scan the full thread.

Example: the panel might show `Current phase: Confirm`, `Latest event: AI proposed 4 tasks for review`, `Pending approvals: 4 tasks waiting`, and `Needs attention: 2 open items`. This makes the project much easier to resume.

### 5. Playbooks

Before, playbooks were light metadata: mostly a label and a short planning hint. Useful, but not strong enough to shape planning deeply. They could label the work, but they did not strongly change how the agent explored or structured it.

After, playbooks include richer guidance such as starter prompt, preferred sections, discovery focus, and task bias. This information is passed more directly into the planning agent. So the playbook now acts more like reusable workflow guidance, not just a UI label.

Example: before, a marketing campaign project and a weekly planning project could still feel too similar. After, `Marketing Campaign` pushes the AI toward audience, message, channels, and metrics, while `Weekly Focus` pushes the AI toward priorities, constraints, and realistic weekly tasks.

### 6. Personal AI Context

Before, each project mostly depended on local context, so the AI had weak memory of the user's long-term working preferences. If the user liked a certain response style, they often had to repeat it from project to project.

After, the app stores `Personal AI Context`, such as preferred language, response style, planning style, and working notes, and reuses that across projects. This creates a small but useful layer of persistent user preference that shapes future planning turns.

Example: before, the user might repeat `use Vietnamese when possible`, `keep plans concise`, and `prefer bullets`. After, they can save that once and future planning sessions start closer to that style.

### 7. Planning to Execution Bridge

Before, planning and execution were related, but the transition was not strongly visible in the operational history. The user moved into doing, but the planning system did not clearly express that phase shift.

After, the system records execution milestones more clearly, for example `execution started`, and can create attention items when execution becomes blocked. This makes planning and execution feel like one connected workflow instead of separate screens, and it makes execution events part of the same project story.

## What Stayed Simple On Purpose

We did not turn this product into a full AI agent platform. There is still no daemon, no runtime registry, no multi-agent task queue, and no enterprise orchestration layer. This was intentional. The goal was to take the best structural ideas from Multica without losing the simplicity and product focus of `pi-kanban-poc`.

## End-to-End Difference

Before: user uploads files, files become prompt text, AI replies, user keeps chatting, task cards appear. This works, but most structure is hidden.

After: user uploads files, files become visible imported sources, AI performs source readback first, the timeline records the important events, the attention panel shows what needs action, the user can return later and resume quickly, the playbook shapes the planning style, personal AI context shapes the output, and execution continues with history and attention still connected. The main difference is that more workflow state is now explicit in the product instead of being hidden inside prompts and chat turns.

So the same journey is now easier to trust, easier to resume, and easier to manage.

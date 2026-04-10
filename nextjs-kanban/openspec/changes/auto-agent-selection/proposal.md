## Why

The task chat currently requires users to manually select which agent to talk to via a dropdown (Planner, Doer, Reviewer). The mapping between task status and appropriate agent is already defined in `constants/agents.ts` (`AGENT_HINTS`), but it's only used for display badges — not for automatic selection. This creates friction: users must remember which agent fits which status, and the Reporter agent (mapped to DONE status) has no backend implementation at all. Auto-selecting the right agent based on task status and implementing the Reporter agent would streamline the workflow and close the agent lifecycle loop.

## What Changes

- Auto-select the appropriate agent when opening task chat based on current task status (TODO → Architect, IN_PROGRESS → Developer, IN_REVIEW → Reviewer, DONE → Reporter)
- When task status changes (via status buttons in chat), auto-switch the active agent
- Keep the manual agent selector as an override (power users may want a different agent)
- Implement the Reporter agent backend: role definition in configs, system prompt focused on summarizing completed work, read-only tools (db_query only)
- Reporter agent auto-generates a summary when a task transitions to DONE
- Wire Reporter output to the existing Summary page (`/summary/[id]`)

## Capabilities

### New Capabilities

- `auto-agent-selection`: Automatic agent selection based on task status, with manual override, and auto-switching when status changes during a chat session
- `reporter-agent`: Backend implementation of the Reporter agent role — summarizes completed task work, generates insights, and feeds the Summary page

### Modified Capabilities

## Impact

- **`lib/agents/configs.ts`** — add `reporter` agent configuration
- **`lib/agents/prompts.ts`** — add `buildReporterPrompt()` for summary generation
- **`components/task-chat/TaskChatClient.tsx`** — auto-select agent on mount and status change, keep dropdown as override
- **`constants/agents.ts`** — formalize status → agent mapping for programmatic use
- **`app/api/agents/stream/route.ts`** — support `reporter` role
- **`components/task-summary/TaskSummaryClient.tsx`** — display Reporter agent output instead of placeholder

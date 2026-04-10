# Design: Auto Agent Selection

## Context

Users currently select agents manually via a dropdown in TaskChatClient. The codebase already has `AGENT_MAPPING` in `constants/agents.ts` that maps each `TaskStatus` to an agent name (todo→"Planner Agent", doing→"Doer Agent", review→"Reviewer Agent", done→"Reporter Agent"), but this mapping is only used for rendering hint badges on task cards. The Reporter agent exists in the frontend types (`types/domain.ts`) but has no corresponding backend role — `AgentRole` in `lib/agents/configs.ts` only includes `'architect' | 'developer' | 'reviewer'`.

## Goals

- Auto-select the recommended agent based on the current task status when the chat opens.
- Auto-switch the selected agent when the user changes the task status within the chat.
- Implement the Reporter agent backend (role, config, prompt).
- Automatically generate task summaries when tasks transition to DONE.
- Feed Reporter-generated summaries to the Summary page, replacing the current placeholder content.

## Non-Goals

- **Removing the manual agent selector entirely** — the dropdown stays as a manual override.
- **Multi-agent selection** — only one agent is active at a time.
- **Custom user-defined agent mappings** — status-to-agent mapping remains hardcoded.

## Decisions

### Decision 1: Auto-selection mechanism

On `TaskChatClient` mount, compute the recommended agent from `AGENT_MAPPING[task.status]` and resolve it to the corresponding `AgentRole`. Set this as the default selected agent in the dropdown. When the user changes the task status via the status buttons in chat, auto-switch the selected agent to match the new status. The dropdown remains visible and interactive — the user can override the auto-selected agent at any time. The override persists until the status changes again or the page is reloaded.

### Decision 2: Status-to-role mapping

Create a shared mapping from frontend agent hint names to backend `AgentRole` values. This bridges the existing `AGENT_MAPPING` (status → display name) to the backend role system:

| Agent Hint (display name) | AgentRole (backend) |
|---------------------------|---------------------|
| "Planner Agent"           | `"architect"`       |
| "Doer Agent"              | `"developer"`       |
| "Reviewer Agent"          | `"reviewer"`        |
| "Reporter Agent"          | `"reporter"`        |

This mapping lives in `constants/agents.ts` alongside the existing `AGENT_MAPPING`, keeping all agent-related constants co-located.

### Decision 3: Reporter agent implementation

Add `'reporter'` to the `AgentRole` union type in `lib/agents/configs.ts`. Define a `ReporterConfig` with:

- **Model**: `gpt-4o-mini` (sufficient for summarization, cost-effective)
- **Tools**: `['db_query']` (read-only access to task data and conversation history)
- **System prompt**: Focused on summarizing completed work, generating insights about the task lifecycle, and producing structured markdown summaries including sections for work done, key decisions, and metrics.

Add `buildReporterPrompt()` to `lib/agents/prompts.ts` to construct the server-side prompt.

### Decision 4: Auto-summary on DONE

When a task transitions to DONE status (detected in the `PUT /api/tasks/[id]` route), trigger a Reporter agent run asynchronously (fire-and-forget). The Reporter agent:

1. Reads the task data and its conversation history.
2. Generates a structured summary.
3. Saves the result as a `Conversation` record with a special marker (e.g., `role: 'reporter-summary'` or a metadata flag) to distinguish it from regular chat conversations.

The Summary page (`/summary/[id]`) reads the latest reporter-tagged conversation for the task and renders the structured markdown output instead of the current placeholder content.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auto-summary adds latency on status transition | User perceives slowness when marking tasks DONE | Fire-and-forget async execution — the status change returns immediately, summary generates in the background |
| Reporter prompt quality affects summary usefulness | Summaries may be too generic or miss important details | Iterate on the reporter system prompt; include structured output format to ensure consistency |
| Auto-switch may surprise users mid-conversation | User loses context if agent switches unexpectedly | Only auto-switch on explicit status changes (not on mount if user has already overridden); keep dropdown visible so user sees the change |

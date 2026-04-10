# Tasks: Auto Agent Selection

## Task 1: Add AgentHint → AgentRole mapping to constants/agents.ts

- **File**: `constants/agents.ts`
- **What**: Add an `AGENT_HINT_TO_ROLE` mapping that bridges the existing `AGENT_MAPPING` display names to backend `AgentRole` values: `"Planner Agent"→"architect"`, `"Doer Agent"→"developer"`, `"Reviewer Agent"→"reviewer"`, `"Reporter Agent"→"reporter"`.
- **Why**: Enables the frontend to resolve a task status → display name → backend role in a single lookup chain.
- **Specs**: auto-agent-selection REQ-1, REQ-2

## Task 2: Add 'reporter' role to AgentRole and define config in configs.ts

- **File**: `lib/agents/configs.ts`
- **What**: Extend the `AgentRole` union type to include `'reporter'`. Add a `ReporterConfig` entry with model `gpt-4o-mini`, tools `['db_query']` (read-only), and a system prompt focused on summarizing completed work and generating structured markdown.
- **Why**: The Reporter agent exists in frontend types but has no backend implementation.
- **Specs**: reporter-agent REQ-1

## Task 3: Add buildReporterPrompt() to lib/agents/prompts.ts

- **File**: `lib/agents/prompts.ts`
- **What**: Add a `buildReporterPrompt()` function that constructs the server-side prompt for the Reporter agent. The prompt should instruct the agent to summarize all task conversations, highlight key decisions, and produce a structured markdown output with sections for work completed, key decisions, and task lifecycle insights.
- **Why**: Server-side prompt construction follows the existing pattern for other agents.
- **Specs**: reporter-agent REQ-1

## Task 4: Update PUT /api/tasks/[id] to trigger async Reporter run on DONE transition

- **File**: `app/api/tasks/[id]/route.ts` (or equivalent API route)
- **What**: After a successful status update to `done`, fire-and-forget a Reporter agent run. The run should read the task's conversation history, generate a summary, and save it as a Conversation with a reporter-summary marker. The API response returns immediately without waiting.
- **Why**: Auto-generates summaries when tasks complete, feeding the Summary page.
- **Specs**: reporter-agent REQ-2

## Task 5: Update TaskChatClient to auto-select agent on mount based on task status

- **File**: `components/TaskChatClient.tsx` (or equivalent)
- **What**: On component mount, look up `AGENT_MAPPING[task.status]`, resolve to `AgentRole` via `AGENT_HINT_TO_ROLE`, and set as the default selected agent in the dropdown. The dropdown remains visible and interactive.
- **Why**: Removes the manual step of selecting the right agent for the current task phase.
- **Specs**: auto-agent-selection REQ-1, REQ-3

## Task 6: Update TaskChatClient to auto-switch agent when status changes

- **File**: `components/TaskChatClient.tsx` (or equivalent)
- **What**: Listen for task status changes (via the status buttons in chat). When status changes, re-compute the recommended agent from the mapping and update the dropdown selection. Clear any manual override.
- **Why**: Keeps the active agent in sync with the task's lifecycle stage.
- **Specs**: auto-agent-selection REQ-2, REQ-3

## Task 7: Update TaskSummaryClient to display Reporter agent conversation output

- **File**: `components/TaskSummaryClient.tsx` (or equivalent summary page component)
- **What**: Query for the latest reporter-tagged conversation for the given task. If found, render the structured markdown summary. If not found, show a "no summary available" message. Replace the current placeholder "AI Insights" content.
- **Why**: Surfaces the auto-generated summaries to users on the Summary page.
- **Specs**: reporter-agent REQ-3

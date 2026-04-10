## Context

The mission-control page renders a kanban board with five columns (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED). Each column displays task cards. Currently, to execute work on a task, users must click a card to navigate to `/chat/[id]`, select an agent (Planner/Doer/Reviewer), type a prompt, and manually update the task status. The agent infrastructure is mature — `useAgentStream` provides SSE streaming, `buildChatPrompt` assembles context-aware prompts, and the status lifecycle (`TRANSITION_MAP`) enforces valid transitions. The missing piece is automation: letting agents work through tasks without manual intervention.

The existing agent-to-column mapping is natural: architect (Planner) for TODO tasks (planning), developer (Doer) for IN_PROGRESS tasks (implementation), reviewer for IN_REVIEW tasks (code review). The `/api/agents/stream` endpoint and conversation persistence already handle the full agent execution lifecycle.

## Goals / Non-Goals

**Goals:**
- Enable per-column auto-mode toggle on actionable columns (TODO, IN_PROGRESS, IN_REVIEW)
- Automatically dispatch the correct agent for each task in an auto-enabled column
- Process tasks sequentially within a column to avoid race conditions
- Automatically advance tasks to the next status upon successful agent completion
- Provide clear visual feedback: column-level toggle state, processing indicator, per-card active state
- Allow users to disable auto mode at any time, gracefully stopping after current task completes
- Persist conversations from auto-mode runs identically to manual chat interactions

**Non-Goals:**
- Cross-column orchestration (e.g., auto-enabling all columns as a single "full auto" pipeline) — this is a future enhancement
- Custom prompt configuration per column — auto mode uses sensible default prompts
- Retry logic for failed agent runs — failed tasks remain in their column for manual intervention
- Server-side auto mode persistence — auto mode state is session-only (client-side)
- Rate limiting or cost controls — users are responsible for API usage when enabling auto mode

## Decisions

### 1. Client-side orchestration over server-side queue

**Decision**: Auto-mode processing runs entirely in the browser using the existing `useAgentStream` hook and client-side state.

**Rationale**: The streaming infrastructure (`/api/agents/stream` → SSE → `useAgentStream`) is already built for client-driven execution. A server-side queue would require new infrastructure (job queue, WebSocket push, status polling) for minimal benefit. The client already has real-time state and can coordinate sequencing naturally.

**Alternative considered**: Server-side job queue with polling — rejected due to added complexity and the fact that users need to see live streaming progress anyway.

### 2. One task at a time per column

**Decision**: Each auto-enabled column processes tasks sequentially — pick the oldest TODO-status task, run the agent, advance status, then pick the next.

**Rationale**: Parallel agent runs within a column create race conditions (e.g., two tasks competing for IN_PROGRESS slots). Sequential processing is predictable, debuggable, and matches the mental model of an agent "working through a stack."

### 3. Agent-column mapping is fixed

**Decision**: Map columns to agents statically: TODO → architect, IN_PROGRESS → developer, IN_REVIEW → reviewer.

**Rationale**: This matches the existing AGENT_OPTIONS in TaskChatClient and the natural workflow. The auto-agent-selection change (if landed) could later provide smarter routing, but a fixed mapping is the simplest correct starting point.

### 4. Default prompts per column

**Decision**: Each auto-mode agent receives a pre-built contextual prompt without user input.

- **TODO (architect)**: "Analyze this task and create a detailed plan. Break it down into actionable steps."
- **IN_PROGRESS (developer)**: "Implement this task based on its description and any prior planning conversations."
- **IN_REVIEW (reviewer)**: "Review the implementation work done on this task. Check for correctness, quality, and completeness."

**Rationale**: Auto mode is about hands-off execution. Prompts are constructed using `buildChatPrompt` which already includes task title, description, and status context. The default prompts provide the "user message" portion.

### 5. Custom React hook `useColumnAutoMode`

**Decision**: Encapsulate all auto-mode logic in a dedicated hook that manages enabled state, processing queue, active task tracking, and agent dispatch per column.

**Rationale**: Keeps `MissionControlClient` clean — the hook returns simple state (`isEnabled`, `isProcessing`, `activeTaskId`) and actions (`toggle`, `stop`). Internally it coordinates `useAgentStream` instances, status updates, and queue management.

### 6. Auto mode stops on error, does not retry

**Decision**: If an agent run fails (stream error, API error), auto mode pauses on that column. The task remains in its current status. Users see an error indicator and can investigate manually.

**Rationale**: Automatic retries could waste API credits on persistent failures. Keeping the task in place lets users inspect the conversation, fix issues, and re-enable auto mode.

## Risks / Trade-offs

- **[API cost spiral]** → Users enabling auto mode on all columns with many tasks could trigger many sequential agent calls. Mitigation: clear visual indicators showing auto mode is active + task count, so users are aware. Future: add optional task-count limits.

- **[Stale UI if tab is backgrounded]** → Browsers throttle inactive tabs, potentially pausing SSE streams. Mitigation: auto mode only runs while the tab is active. If the stream disconnects, it surfaces the error and stops rather than silently failing.

- **[Race condition with manual actions]** → A user could manually drag a task while auto mode is processing it. Mitigation: tasks currently being auto-processed are visually marked and cannot be manually moved (drag disabled on active-auto-processing cards).

- **[Conversation clutter]** → Auto-mode generates conversations without user input, potentially creating noise in conversation history. Mitigation: auto-mode conversations are tagged/identifiable in the history so users can distinguish them from manual interactions.

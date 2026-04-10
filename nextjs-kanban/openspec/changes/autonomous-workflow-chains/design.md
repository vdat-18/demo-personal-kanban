# Design: Autonomous Workflow Chains

## Date

2026-04-10

## Status

PROPOSED

## Context

All three agents (Architect, Developer, Reviewer) and the multi-agent pipeline (`runAgent()`, `runTeam()`, `runTasks()`) exist in `lib/agents/orchestrator.ts`, but every step requires manual triggering. The current workflow for a single task requires **6+ manual steps**:

1. Chat with Architect to plan the task
2. Manually move task status to IN_PROGRESS
3. Chat with Developer to implement
4. Manually move task status to IN_REVIEW
5. Chat with Reviewer to check quality
6. Manually move task to DONE (or back if issues found)

This is tedious, error-prone (users forget steps), and defeats the purpose of having an agent pipeline. The infrastructure is already there — agents, SSE streaming (`POST /api/agents/stream`, `useAgentStream`), status lifecycle (`validateTransition()` in `lib/status-lifecycle.ts`), conversation persistence, and task update tools. What's missing is the glue that chains these together autonomously.

## Goals

- **Single-click autonomous run** — User clicks one button, entire Architect → Developer → Reviewer chain executes for a task
- **Automatic status transitions** — Status moves through TODO → IN_PROGRESS → IN_REVIEW → DONE without manual intervention, using the existing `validateTransition()` lifecycle
- **Real-time progress via SSE** — User sees live streaming output for each agent step, with clear indicators of which step is active
- **User can pause/abort** — Intervention mechanism so the user retains control over the autonomous run
- **Conversations saved per step** — Each agent interaction creates its own Conversation record, preserving full audit trail of the autonomous run

## Non-Goals

- **Parallel autonomous runs on multiple tasks simultaneously** — v2 feature; requires concurrency control and resource management
- **Autonomous project-level orchestration** — v2 feature; needs task-dependency graph to determine execution order across tasks
- **Custom agent chain ordering** — The chain is fixed as Architect → Developer → Reviewer; user-configurable chains are out of scope
- **Code execution or file system changes** — Agents produce text output only; no sandbox execution or file writes

## Decisions

### Decision 1: Orchestration Approach

**Choice**: New `runAutonomous()` function in `lib/agents/orchestrator.ts` that runs agents sequentially with status transitions between each step.

**Why not `runTeam()` or `runTasks()`**: These existing functions handle multi-agent execution but have no awareness of the task status lifecycle. They don't transition statuses between steps, don't handle the Reviewer feedback loop, and don't emit step-level SSE events. Wrapping them would add more complexity than a purpose-built function.

**How it works**: Each step in the chain follows the same pattern:
1. Transition task status via `validateTransition()`
2. Run agent with task context (title, description, prior agent outputs)
3. Save conversation to database
4. Check result quality / determine next step

The chain sequence:
```
TODO → IN_PROGRESS → run Architect (planning)
IN_PROGRESS → IN_PROGRESS → run Developer (implementation, with Architect output as context)
IN_PROGRESS → IN_REVIEW → run Reviewer (quality check, with Developer output as context)
IN_REVIEW → DONE (if approved) OR IN_REVIEW → IN_PROGRESS (if rejected, triggers feedback loop)
```

### Decision 2: SSE Streaming for Multi-Step

**Choice**: Single SSE connection for the entire autonomous run, with step-level marker events in addition to token-level streaming.

**Why single connection**: Opening/closing SSE connections per step would cause UI flicker, lose connection state, and complicate the client. A single persistent connection is cleaner.

**Event types**:
- `chain_start` — Autonomous run begins, includes chain metadata
- `step_start` — New agent step begins, includes `{step, agent, status}`
- `token` — Streaming token from current agent, includes `{delta}`
- `step_complete` — Agent step finished, includes `{step, agent, result_summary}`
- `chain_complete` — Entire chain finished successfully
- `chain_error` — Chain failed, includes error details

The client uses these to render a multi-step progress indicator showing which agent is active, which steps are complete, and the streaming output of the current step.

### Decision 3: Reviewer Feedback Loop

**Choice**: If Reviewer output contains rejection indicators ("needs changes", "issues found", "reject", "not ready", etc.), auto-transition back to IN_PROGRESS and re-run Developer with Reviewer's feedback appended to context. Maximum **2 feedback loops** to prevent infinite cycles.

**Why keyword detection**: The Reviewer agent's output is natural language. Rather than requiring structured output (which would constrain the agent), we scan for rejection keywords/phrases. This is pragmatic and matches how the Reviewer prompt is already structured.

**Loop mechanics**:
```
Reviewer rejects → IN_REVIEW → IN_PROGRESS → re-run Developer (with Reviewer feedback)
                 → IN_PROGRESS → IN_REVIEW → re-run Reviewer
                 → If rejected again, repeat once more (max 2 loops)
                 → After max loops, complete with warning that review issues remain
```

### Decision 4: Intervention Mechanism

**Choice**: `AbortController` on the SSE stream. When aborted, the current agent step completes its generation (doesn't interrupt mid-token), but the chain stops after that step. Task retains whatever status it reached.

**Why complete current step**: Interrupting mid-generation would leave a partial conversation record and potentially an inconsistent state. Letting the current step finish cleanly is safer and more predictable.

**User experience**:
- "Abort" button visible throughout the autonomous run
- On abort, user sees "Paused at [current status]" indicator
- User can then manually continue from where the chain stopped, or restart

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Agent produces low-quality output that passes Reviewer | Medium | Medium | Include explicit review criteria in Reviewer system prompt; structured checklist approach |
| Long-running chains timeout | Medium | High | Per-step timeout of 60 seconds; total chain timeout of 5 minutes; timeout events sent to client |
| Feedback loop produces diminishing returns | Low | Low | Cap at 2 loops; after max loops, complete with advisory warning |
| SSE connection drops mid-chain | Medium | Medium | Client-side reconnection logic; chain state persisted to DB so progress isn't lost |
| Status transition fails (invalid state) | Low | High | Pre-validate entire chain path at start; use existing `validateTransition()` which is well-tested |

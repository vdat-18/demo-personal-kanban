# Tasks: Autonomous Workflow Chains

## Spec

[Autonomous Workflow](specs/autonomous-workflow/spec.md)

## Tasks

### TASK-1: Create `runAutonomous()` in orchestrator

**File**: `lib/agents/orchestrator.ts`

Create the core `runAutonomous(taskId, options?)` function that orchestrates the full agent chain:

- Accept a task ID and optional config (startFromStep, maxFeedbackLoops, timeouts)
- Determine starting step based on current task status (TODO → full chain, IN_PROGRESS → skip Architect, IN_REVIEW → Reviewer only)
- Execute each step sequentially: validate status transition → run agent → save conversation → evaluate result
- Pass cumulative context between agents (each agent receives prior agents' outputs)
- Implement per-step timeout (60s default) and total chain timeout (5min default)
- Return an async generator or callback-based interface that emits chain/step/token events for SSE consumption
- Handle errors gracefully: catch per-step, emit chain_error, preserve partial state

**Reqs**: REQ-1, REQ-5

---

### TASK-2: Create `POST /api/agents/autonomous` endpoint

**File**: `app/api/agents/autonomous/route.ts`

Create the SSE streaming endpoint for autonomous runs:

- Accept `{ taskId }` in request body, validate task exists and is in a runnable status
- Initialize `AbortController` and wire it to the request signal
- Call `runAutonomous()` and stream all events as SSE (`chain_start`, `step_start`, `token`, `step_complete`, `chain_complete`, `chain_error`)
- Format events matching the existing `POST /api/agents/stream` SSE format for consistency
- Handle abort signal: let current step finish, then stop chain and emit abort event
- Return appropriate HTTP errors for invalid task states or missing tasks

**Reqs**: REQ-2, REQ-4

---

### TASK-3: Create `useAutonomousRun` hook

**File**: `hooks/use-autonomous-run.ts` (or colocated with existing `useAgentStream`)

Create a React hook that extends the `useAgentStream` pattern for multi-step autonomous runs:

- Connect to `POST /api/agents/autonomous` via SSE (following existing `useAgentStream` pattern)
- Track chain-level state: `chainId`, `currentStep`, `totalSteps`, `currentAgent`, `status`
- Track step-level state: completed steps array with agent name, result summary, conversation ID
- Expose streaming text for the current step (resets on each `step_start`)
- Expose `abort()` function that signals the AbortController
- Expose chain status: `idle`, `running`, `completed`, `error`, `aborted`
- Handle SSE connection errors and reconnection edge cases

**Reqs**: REQ-2, REQ-4

---

### TASK-4: Implement Reviewer feedback loop logic

**File**: `lib/agents/orchestrator.ts` (within `runAutonomous()`)

Add feedback loop handling to the Reviewer step:

- After Reviewer step completes, scan output for rejection indicators: "needs changes", "issues found", "reject", "not ready", "changes required", "revision needed" (case-insensitive)
- If rejected: transition IN_REVIEW → IN_PROGRESS, emit `step_start` for Developer re-run
- Build Developer re-run context: original task + Architect plan + Developer's previous output + Reviewer's feedback
- Track loop count; enforce max 2 feedback loops
- After max loops with continued rejection: complete chain with warning flag in `chain_complete`
- Each loop iteration creates separate Conversation records for both Developer and Reviewer

**Reqs**: REQ-3, REQ-5

---

### TASK-5: Add "Run Autonomously" button to Mission Control task cards

**File**: `app/mission-control/[id]/` components

Add autonomous run trigger to task cards on the Mission Control kanban board:

- Add "Run Autonomously" button/icon to task cards in TODO, IN_PROGRESS, and IN_REVIEW columns
- Button disabled for DONE and BLOCKED tasks
- On click, initiate autonomous run via `useAutonomousRun` hook
- Show inline progress indicator on the task card during the run (current step, agent name)
- Update task card status in real-time as the chain progresses (reflects status transitions)
- Disable drag-drop for the task while autonomous run is active

**Reqs**: REQ-1, REQ-2

---

### TASK-6: Add "Run Autonomously" action to TaskChatClient

**File**: Task chat page components at `app/chat/[id]/`

Add autonomous run capability to the task chat interface:

- Add "Run Autonomously" button in the chat interface header or action bar
- When triggered, switch chat view to show multi-step autonomous output
- Stream each agent's output in the chat as distinct message blocks (visually separated by step headers)
- After chain completes, chat returns to normal interactive mode
- Conversation records from the autonomous run appear in chat history

**Reqs**: REQ-1, REQ-2, REQ-5

---

### TASK-7: Add multi-step progress indicator component

**File**: `components/autonomous-progress.tsx` (new component)

Create a reusable progress indicator for autonomous runs:

- Visual stepper/timeline showing all chain steps: Architect → Developer → Reviewer
- States per step: pending, active (with spinner/animation), completed (with checkmark), failed, skipped
- Show current agent name and status for the active step
- Show feedback loop iterations if they occur (e.g., "Developer (revision 2)")
- Expandable/collapsible streaming output per step
- Compact variant for task cards, full variant for chat view
- Display elapsed time per step and total chain time

**Reqs**: REQ-2

---

### TASK-8: Add intervention (pause/abort) controls

**File**: `components/autonomous-controls.tsx` (new component, integrated into progress indicator)

Create abort/intervention controls for active autonomous runs:

- "Abort" button visible whenever an autonomous run is active
- On click, call `abort()` from `useAutonomousRun` hook
- Show confirmation dialog before aborting ("Current step will finish. Chain will stop. Continue?")
- After abort, show "Paused at [status]" state with option to view completed conversations
- Disable the abort button once abort is in progress (prevent double-abort)
- Integrate with both Mission Control task cards and TaskChatClient views

**Reqs**: REQ-4

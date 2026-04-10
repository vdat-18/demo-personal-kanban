# Spec: Autonomous Workflow

## Parent

[Autonomous Workflow Chains](../../design.md)

## Status

PROPOSED

## Requirements

### REQ-1: Autonomous Task Execution

**ADDED**

System SHALL execute a multi-agent chain (Architect → Developer → Reviewer) for a single task, auto-transitioning status at each step using the existing `validateTransition()` lifecycle.

Chain sequence:
- TODO → IN_PROGRESS: Architect plans the task
- IN_PROGRESS → IN_PROGRESS: Developer implements based on Architect's plan
- IN_PROGRESS → IN_REVIEW: Reviewer checks Developer's output
- IN_REVIEW → DONE: If Reviewer approves

Each agent receives the output of the previous agent(s) as context, building a cumulative understanding of the task through the chain.

#### Scenarios

**WHEN** user triggers autonomous run on a task in TODO status
**THEN** system executes the full Architect → Developer → Reviewer chain, transitioning status at each step, and the task reaches DONE status upon successful completion

**WHEN** user triggers autonomous run on a task in IN_PROGRESS status
**THEN** system starts the chain from the Developer step (skipping Architect), since planning is assumed complete

**WHEN** user triggers autonomous run on a task in IN_REVIEW status
**THEN** system starts the chain from the Reviewer step only

**WHEN** user triggers autonomous run on a task in DONE or BLOCKED status
**THEN** system rejects the request with an appropriate error message indicating the task cannot be autonomously run from its current status

**WHEN** an agent step fails (error, timeout, or exception)
**THEN** the chain stops, task retains its current status, a chain_error event is emitted, and the error is logged with the partial conversation history preserved

---

### REQ-2: Multi-Step SSE Streaming

**ADDED**

The autonomous endpoint SHALL stream events for the entire agent chain over a single SSE connection. The connection persists from chain start to chain completion (or error/abort).

Event types:
- `chain_start` — `{ chainId, taskId, steps: string[] }`
- `step_start` — `{ step: number, agent: string, status: string, totalSteps: number }`
- `token` — `{ delta: string }`
- `step_complete` — `{ step: number, agent: string, resultSummary: string, conversationId: string }`
- `chain_complete` — `{ chainId, taskId, finalStatus: string, totalSteps: number, conversations: string[] }`
- `chain_error` — `{ chainId, taskId, error: string, failedStep: number, failedAgent: string, currentStatus: string }`

#### Scenarios

**WHEN** an autonomous run begins
**THEN** system emits `chain_start` with the chain ID, task ID, and ordered list of planned steps

**WHEN** a new agent step begins within the chain
**THEN** system emits `step_start` with the step number, agent name, new task status, and total step count

**WHEN** the current agent generates output tokens
**THEN** system emits `token` events with delta text, matching the existing streaming behavior from `POST /api/agents/stream`

**WHEN** an agent step completes successfully
**THEN** system emits `step_complete` with the step number, agent name, a summary of the result, and the conversation ID for that step

**WHEN** the entire chain completes successfully
**THEN** system emits `chain_complete` with the final task status, total steps executed, and list of all conversation IDs

**WHEN** the chain encounters an unrecoverable error
**THEN** system emits `chain_error` with the error description, the step and agent that failed, and the task's current status

---

### REQ-3: Reviewer Feedback Loop

**ADDED**

When the Reviewer agent's output indicates issues with the Developer's work, system SHALL auto-transition the task back to IN_PROGRESS and re-run the Developer agent with the Reviewer's feedback appended to context. Maximum **2 retry loops** to prevent infinite cycles.

Rejection detection: Reviewer output is scanned for rejection indicators including (but not limited to): "needs changes", "issues found", "reject", "not ready", "changes required", "revision needed".

#### Scenarios

**WHEN** Reviewer output contains rejection indicators
**THEN** system transitions task from IN_REVIEW back to IN_PROGRESS, emits a `step_start` for a new Developer run, and re-runs Developer with Reviewer's feedback appended to the prompt context

**WHEN** Developer re-runs after Reviewer feedback
**THEN** Developer receives: original task context + Architect's plan + Developer's previous output + Reviewer's feedback, enabling targeted improvements

**WHEN** the feedback loop has executed 2 times and Reviewer still rejects
**THEN** system completes the chain with the task in DONE status but includes a warning in `chain_complete` that unresolved review issues remain after maximum retries

**WHEN** Reviewer output does NOT contain rejection indicators
**THEN** system transitions task to DONE and emits `chain_complete` normally with no feedback loop

---

### REQ-4: User Intervention

**ADDED**

User SHALL be able to abort an autonomous run at any point during execution. Abort is implemented via `AbortController` on the SSE connection.

#### Scenarios

**WHEN** user triggers abort during an active agent step
**THEN** the current agent step completes its generation (no mid-token interruption), but the chain stops after that step completes

**WHEN** user triggers abort and the current step finishes
**THEN** task retains the status it reached at the end of the completed step, and the conversation for that step is saved

**WHEN** an autonomous run is aborted
**THEN** system emits a `chain_error` event with an abort indicator, the step that was completed, and the task's current status displayed as "Paused at [status]"

**WHEN** user views a task that was previously aborted mid-chain
**THEN** task shows its current status normally with all completed conversation records accessible, and the user can manually continue or restart

---

### REQ-5: Conversation Persistence

**ADDED**

Each agent step in the autonomous chain SHALL create a separate Conversation record linked to the task, preserving the full history of the autonomous run.

#### Scenarios

**WHEN** an agent step completes within the autonomous chain
**THEN** a new Conversation record is created with: the agent's messages, the agent's result output, token usage metrics, and a reference to the task and the chain run

**WHEN** the autonomous chain completes (success, error, or abort)
**THEN** all Conversation records from the chain are accessible via the task's conversation history, ordered by creation time

**WHEN** a feedback loop occurs (Reviewer rejects, Developer re-runs)
**THEN** each re-run creates an additional Conversation record, so the full iteration history is preserved (e.g., Developer v1, Reviewer v1, Developer v2, Reviewer v2)

**WHEN** user views chat history for a task that had an autonomous run
**THEN** conversations from the autonomous run are visually distinguishable from manual chat conversations (e.g., tagged with chain ID and step number)

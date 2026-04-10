## Context

The kanban board has five task statuses defined in Prisma: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`. Currently, any status can be set to any other status — via drag-and-drop in Mission Control, the forward-arrow button, the REST API (`PUT /api/tasks/:id`), or agent tools (`task_update`). There is no validation layer enforcing workflow order. The only "rules" are implicit in the UI (the forward-arrow follows a hardcoded `STATUS_ORDER` array in MissionControlClient, but drag-and-drop ignores it entirely).

The frontend also has a parallel `TaskStatus` type in `types/domain.ts` using lowercase values (`todo`, `doing`, `review`, `done`, `cancelled`) which maps differently than the DB enum. This change focuses solely on the server-side/shared lifecycle rules, not on reconciling the frontend type mapping (that's a separate concern).

## Goals / Non-Goals

**Goals:**
- Define a single-source-of-truth transition map that specifies which status transitions are valid
- Enforce transitions server-side (API returns 422 for invalid transitions)
- Make the transition map importable by the client so the UI can disable invalid targets
- Keep the transition map in a shared module (not duplicated across API route, agent tools, and client)

**Non-Goals:**
- Changing the Prisma `TaskStatus` enum (the five statuses stay as-is)
- Reconciling the frontend lowercase `TaskStatus` type with the DB uppercase enum
- Adding a status change history/audit log
- Adding role-based permissions on transitions
- Changing the Planning page (tasks created there always start as TODO — no transition involved)

## Decisions

### 1. Transition map as a plain TypeScript `Record`

The transition rules will be defined as a `Record<TaskStatus, TaskStatus[]>` in a new shared file `lib/status-lifecycle.ts`. Each key maps to an array of statuses that key can transition to.

```
TODO        → [IN_PROGRESS, BLOCKED]
IN_PROGRESS → [IN_REVIEW, TODO, BLOCKED]
IN_REVIEW   → [DONE, IN_PROGRESS, BLOCKED]
DONE        → []                          (terminal — no transitions out)
BLOCKED     → [TODO]                      (restore only)
```

**Why a Record and not a class/FSM library:** The rules are simple (5 states, ~8 edges). A plain object is easy to test, serialise, and import from both server and client code. No external dependency needed.

**Alternative considered:** Using a state machine library (e.g., xstate). Rejected — too heavy for 5 states. Can revisit if we add conditional transitions or side-effects later.

### 2. Validation function co-located with the map

A `validateTransition(from: TaskStatus, to: TaskStatus): { valid: boolean; message?: string }` function will live alongside the map. Both the API route and agent tools call this function. This avoids duplicating the lookup logic.

### 3. Server-side enforcement at the DB layer (`lib/db/tasks.ts`)

`updateTask` will accept the current task's status (fetched before update) and the new status. If the transition is invalid, it throws a typed error (`InvalidTransitionError`). The API route catches this and returns 422.

**Why in `lib/db/tasks.ts` and not in the API route directly:** The agent tool (`task_update`) also calls Prisma directly, bypassing the API route. Putting validation in the DB layer ensures both paths are covered. However, since the agent tool uses its own Prisma call, we'll refactor it to use the shared `updateTask` function or at minimum call `validateTransition` before its Prisma call.

### 4. Client reads the transition map for UI hints

`MissionControlClient.tsx` will import the transition map and use it to:
- Disable drag-drop onto columns that aren't valid targets for the dragged card's current status
- Only show the forward-arrow button when a valid next status exists
- Grey out invalid columns during drag

No client-side enforcement beyond UI hints — the server is the authority.

### 5. New task creation always starts at TODO

The `createTask` and `createTasksBatch` functions already default to `TODO`. We will not allow creating tasks in any other status via the API. The `createTaskSchema` will change `status` from a free enum to a hardcoded `TODO` default with no override. The agent `task_create` tool will also enforce this.

**Correction:** Actually, agents may legitimately need to create tasks in different statuses (e.g., importing from external systems). We'll keep the create flexibility but document that the standard flow is TODO.

## Risks / Trade-offs

- **[Risk] Existing tasks in invalid states** → On deploy, some tasks may already be in states that wouldn't be reachable under the new rules (e.g., a task moved from TODO straight to DONE). Mitigation: The lifecycle only validates *transitions*, not current state. Existing data is fine — it just can't make invalid *next* moves.
- **[Risk] Agent tools bypass validation** → The `task_update` agent tool currently does raw Prisma calls. Mitigation: Refactor to call `validateTransition` or the shared `updateTask`. This is a code change, not an architectural risk.
- **[Risk] Breaking drag-and-drop UX** → Users accustomed to dragging anywhere may be surprised. Mitigation: Visual feedback — invalid drop targets show a "not allowed" indicator, and a toast/message explains why a drop was rejected.
- **[Trade-off] DONE is terminal** → Once a task is DONE, it cannot be reopened. This is intentional for workflow integrity but may frustrate users who want to reopen tasks. If needed later, we can add a DONE → TODO "reopen" transition.

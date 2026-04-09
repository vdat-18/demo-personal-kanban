## Context

The status-lifecycle shared module (`lib/status-lifecycle.ts`) already exists with a `TRANSITION_MAP`, `validateTransition()`, and `InvalidTransitionError`. The agent `task_update` tool already validates transitions. However, two critical enforcement points are missing: the REST API `PUT /api/tasks/[id]` route allows any status change, and the Mission Control UI permits unrestricted drag-and-drop. This means direct API calls and UI interactions bypass the state machine.

Frontend statuses (todo, doing, review, done, cancelled) map to DB statuses (TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED). The mapping exists in `constants/agents.ts` via `KANBAN_COLUMNS`.

## Goals / Non-Goals

**Goals:**
- Enforce status transitions in the `PUT /api/tasks/[id]` API route, returning 422 on invalid transitions
- Make Mission Control drag-and-drop respect allowed transitions (grey out invalid drop targets)
- Make status advancement buttons show only valid next statuses
- Create a shared frontend utility that maps frontend statuses to DB statuses and calls `getAllowedTransitions()`

**Non-Goals:**
- Changing the existing TRANSITION_MAP rules
- Adding new statuses to the enum
- Modifying the existing `lib/status-lifecycle.ts` module (it's complete)
- Adding transition history/audit logging (deferred to checkpoint-diffing change)

## Decisions

### Decision 1: API validation approach
**Choice**: Import `validateTransition()` directly in the API route handler and return 422 with structured error body (`{ error, from, to, allowed }`).

**Alternatives considered**:
- Middleware-based validation: Over-engineered for a single field check on one route
- Database trigger: Harder to maintain, less visible, poor error messages

**Rationale**: Direct import is simple, the module already exists, and structured 422 responses let the client display meaningful messages.

### Decision 2: Frontend status mapping utility
**Choice**: Create `lib/status-mapping.ts` with `toDbStatus(frontendStatus)`, `toFrontendStatus(dbStatus)`, and `getAllowedFrontendTransitions(frontendStatus)` functions.

**Alternatives considered**:
- Inline mapping in each component: Duplicates logic, error-prone
- Extend `constants/agents.ts`: That file is for agent config, not status logic

**Rationale**: A dedicated mapping module keeps the status conversion logic in one place and makes it testable.

### Decision 3: Drag-and-drop enforcement
**Choice**: Compute allowed target columns on drag start. Apply `opacity-40 pointer-events-none` to invalid column drop zones. Show a subtle tooltip "Cannot move directly to X".

**Alternatives considered**:
- Allow drop but show error toast: Bad UX, user wastes effort
- Hide invalid columns: Confusing, columns appearing/disappearing

**Rationale**: Visual dimming is the standard drag-and-drop pattern for invalid targets (used by Trello, Jira, etc.).

## Risks / Trade-offs

- **[Risk] Frontend/DB status name mismatch causes bugs** → Mitigation: Single mapping module with exhaustive type checking, unit tests for every mapping pair
- **[Risk] Existing tasks in invalid states** → Mitigation: No migration needed since we're only preventing future invalid transitions, not correcting historical data
- **[Risk] API returns 422 but client doesn't handle it** → Mitigation: Update `useTasks` mutation error handlers to parse and display transition error messages

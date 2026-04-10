# Design: Task Dependencies

## Context

Tasks in the Kanban app are flat today — they have no ordering or dependency information. The Architect agent generates tasks as flat arrays via `buildGenerateTasksPrompt()` in `lib/agents/prompts.ts`, and `createTasksBatch()` in `lib/db/tasks.ts` persists them without any relational structure between tasks.

The DAG pipeline endpoint (`runTasks`) already supports a `dependsOn` field in its API contract at the orchestrator level, but this exists only at runtime — there is no persistent data model backing it. Dependencies are not stored, cannot be queried, and are lost after pipeline execution.

The current Task model has: `id` (UUID), `title`, `description`, `status` (TaskStatus enum: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED), `priority` (TaskPriority enum), and `projectId` (FK). The status lifecycle module at `lib/status-lifecycle.ts` provides `validateTransition()` for enforcing legal status changes.

## Goals

1. **Add a `TaskDependency` join table** in the Prisma schema to persistently model directed edges between tasks (Task A depends on Task B).
2. **CRUD API for dependencies** — endpoints to add, remove, and list dependencies for any task.
3. **Circular dependency detection** — reject any dependency addition that would create a cycle in the task graph.
4. **Auto-cascade on completion** — when a task transitions to DONE, automatically move dependent tasks from TODO to IN_PROGRESS if all their dependencies are satisfied.
5. **Update Architect agent** to generate tasks with dependency hints, and resolve those hints to real task IDs after bulk creation.
6. **Dependency visualization** — show dependency badges on task cards in Mission Control.

## Non-Goals

- **Full Gantt chart UI** — no timeline-based visualization of dependencies.
- **Critical path analysis** — no computation of longest dependency chains or bottleneck identification.
- **Cross-project dependencies** — dependencies are scoped to a single project.
- **Parallel execution scheduling** — no runtime scheduler that uses dependency info to parallelize task execution.

## Decisions

### Decision 1: Data Model — Separate Join Table

**Choice**: Use a separate `TaskDependency` join table rather than a self-referential implicit many-to-many relation.

**Rationale**: A dedicated join table gives us explicit control over the relationship and the ability to add metadata later (e.g., dependency type: blocks, requires, relates-to). It also makes queries more readable and allows us to put a unique constraint on the pair.

**Schema**:
```
TaskDependency
  id            String   @id @default(uuid())
  dependsOnId   String   (FK → Task) — the upstream task (prerequisite)
  dependedById  String   (FK → Task) — the downstream task (the one that is blocked)
  createdAt     DateTime @default(now())

  @@unique([dependsOnId, dependedById])
```

Both foreign keys cascade on delete — removing a task removes all its dependency edges.

### Decision 2: Circular Dependency Detection — Iterative BFS

**Choice**: Use iterative BFS from the target task, following `dependsOn` edges. If the source task is reachable from the target, the addition would create a cycle and is rejected.

**Rationale**: BFS is simple to implement, easy to reason about, and returns the actual cycle path for error reporting. DFS would also work but BFS gives us shortest-path cycle detection naturally.

**Complexity**: O(n) where n = number of tasks in the project. Acceptable because dependency graphs are project-scoped and projects have bounded task counts.

**Execution**: Server-side only. Never trust client-side validation for integrity constraints.

### Decision 3: Auto-Cascade Trigger — On Status Change to DONE

**Choice**: In `updateTask()` in `lib/db/tasks.ts`, after a status change to DONE, query `TaskDependency` for tasks that depend on the completed task. For each dependent, check if ALL of its dependencies are now DONE. If so, auto-transition that dependent from TODO to IN_PROGRESS.

**Mechanism**: Use a Prisma transaction to ensure atomicity — the status update and all cascaded transitions happen together or not at all.

**Safety**: Only cascade one level deep per trigger invocation. This prevents chain reactions where completing one task causes a cascade through the entire graph. A depth limit of max 3 levels per single trigger provides additional safety.

### Decision 4: Architect Agent Output Format — Index-Based References

**Choice**: The Architect agent outputs tasks with a `dependsOnIndex` field that references other tasks by their 0-based position in the generated array.

**Example**:
```json
[
  { "title": "Set up database schema", "dependsOnIndex": [] },
  { "title": "Create API endpoints", "dependsOnIndex": [0] },
  { "title": "Build frontend forms", "dependsOnIndex": [0, 1] }
]
```

**Resolution**: After `createTasksBatch()` persists all tasks and receives real UUIDs, the backend maps indices to IDs and creates `TaskDependency` records.

**Rationale**: Index-based referencing is simple for the LLM to produce, unambiguous, and avoids the need for the agent to generate temporary IDs.

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Auto-cascade triggers chain reactions | High — could flood board with IN_PROGRESS tasks | Medium | Depth limit of max 3 levels per single trigger. One-level-deep cascade per invocation. |
| Performance with large dependency graphs | Medium — slow queries on deeply connected graphs | Low | All queries are project-scoped. Add index on `dependsOnId` and `dependedById`. |
| Architect generates invalid dependency indices | Low — out-of-bounds index references | Medium | Validate indices are within array bounds before resolving. Skip invalid references with a warning. |
| Circular dependency check misses edge cases | High — corrupted graph state | Low | Comprehensive test coverage. BFS is well-understood. Unique constraint prevents duplicate edges. |

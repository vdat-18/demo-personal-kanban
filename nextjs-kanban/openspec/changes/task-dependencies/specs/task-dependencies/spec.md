# Spec: Task Dependencies

## Requirements

### 1. Task Dependency Data Model [ADDED]

The system SHALL provide a `TaskDependency` join table to model directed dependency edges between tasks.

- The table has fields: `id` (UUID, primary key), `dependsOnId` (FK → Task), `dependedById` (FK → Task), `createdAt` (DateTime).
- `dependsOnId` represents the upstream/prerequisite task.
- `dependedById` represents the downstream/dependent task.
- A unique constraint EXISTS on the pair `(dependsOnId, dependedById)` to prevent duplicate edges.
- Cascade delete: when either referenced task is deleted, the `TaskDependency` row is deleted.
- Both foreign keys reference the `Task` model's `id` field.

#### Scenarios

**Scenario: Creating a valid dependency record**
- WHEN a TaskDependency is created with `dependsOnId` pointing to Task A and `dependedById` pointing to Task B
- THEN the record is persisted with a generated UUID, both FKs populated, and `createdAt` set to the current timestamp

**Scenario: Preventing duplicate dependency edges**
- WHEN a TaskDependency already exists for the pair (Task A, Task B)
- AND another insert is attempted with the same `dependsOnId` and `dependedById`
- THEN the database rejects the insert with a unique constraint violation

**Scenario: Cascade delete when upstream task is removed**
- WHEN Task A is deleted
- AND TaskDependency records exist where `dependsOnId` = Task A
- THEN all those TaskDependency records are automatically deleted

**Scenario: Cascade delete when downstream task is removed**
- WHEN Task B is deleted
- AND TaskDependency records exist where `dependedById` = Task B
- THEN all those TaskDependency records are automatically deleted

---

### 2. Dependency CRUD API [ADDED]

The system SHALL expose REST endpoints for managing task dependencies.

- **POST** `/api/tasks/[id]/dependencies` — Add a dependency. Request body: `{ dependsOnId: string }`. The `[id]` path parameter is the downstream task (the one that depends). Returns the created TaskDependency record. Returns 400 if the dependency would create a circular reference. Returns 404 if either task does not exist. Returns 409 if the dependency already exists.
- **DELETE** `/api/tasks/[id]/dependencies/[depId]` — Remove a dependency by its TaskDependency ID. Returns 204 on success. Returns 404 if the dependency does not exist.
- **GET** `/api/tasks/[id]/dependencies` — List dependencies for a task. Returns `{ blockedBy: TaskDependency[], blocks: TaskDependency[] }` where `blockedBy` lists tasks this task depends on and `blocks` lists tasks that depend on this task. Each entry includes the related Task's `id`, `title`, and `status`.

#### Scenarios

**Scenario: Adding a valid dependency**
- WHEN POST `/api/tasks/task-B/dependencies` is called with body `{ dependsOnId: "task-A" }`
- THEN the system creates a TaskDependency with `dependsOnId = task-A` and `dependedById = task-B`
- AND returns 201 with the created record

**Scenario: Adding a dependency that would create a cycle**
- WHEN Task B already depends on Task A
- AND POST `/api/tasks/task-A/dependencies` is called with body `{ dependsOnId: "task-B" }`
- THEN the system returns 400 with `{ error: "Circular dependency detected", cycle: ["task-A", "task-B", "task-A"] }`

**Scenario: Adding a dependency with a nonexistent task**
- WHEN POST `/api/tasks/task-B/dependencies` is called with body `{ dependsOnId: "nonexistent-id" }`
- THEN the system returns 404 with `{ error: "Task not found" }`

**Scenario: Removing a dependency**
- WHEN DELETE `/api/tasks/task-B/dependencies/dep-123` is called
- AND dep-123 is a valid TaskDependency ID
- THEN the system deletes the record and returns 204

**Scenario: Listing dependencies**
- WHEN GET `/api/tasks/task-B/dependencies` is called
- AND Task B depends on Task A and Task C depends on Task B
- THEN the system returns `{ blockedBy: [{ id, dependsOnId: "task-A", task: { id, title, status } }], blocks: [{ id, dependedById: "task-C", task: { id, title, status } }] }`

---

### 3. Circular Dependency Prevention [ADDED]

The system SHALL reject any dependency addition that would create a cycle in the task dependency graph.

- Cycle detection uses BFS traversal starting from the proposed upstream task (`dependsOnId`), following `dependsOn` edges (i.e., traversing to what that task depends on — walking backward up the graph to see if we reach the downstream task).
- Actually: starting from the proposed upstream task, follow `dependedBy` edges forward. If the downstream task is reachable from the upstream task via forward edges, adding the reverse link would create a cycle. Alternatively: from the downstream task, follow `dependsOn` edges backward. If the upstream task is reachable, reject.
- Correct approach: Starting from the proposed `dependsOnId` (upstream), traverse the existing `dependsOn` edges (what does the upstream task itself depend on, recursively). If the `dependedById` (downstream) task is found in this traversal, a cycle exists. Equivalently: from `dependedById`, follow `dependedBy` edges — if `dependsOnId` is reachable, a cycle exists.
- The response includes the detected cycle path as an array of task IDs.
- All queries are scoped to the project of the involved tasks.
- Validation runs server-side only.

#### Scenarios

**Scenario: Direct cycle detection (A → B → A)**
- WHEN Task B depends on Task A (A is prerequisite of B)
- AND a request is made to add Task A depends on Task B
- THEN the system detects the cycle [A, B, A]
- AND returns 400 with `{ error: "Circular dependency detected", cycle: ["task-A", "task-B", "task-A"] }`

**Scenario: Indirect cycle detection (A → B → C → A)**
- WHEN Task B depends on Task A, and Task C depends on Task B
- AND a request is made to add Task A depends on Task C
- THEN the system detects the cycle [A, B, C, A]
- AND returns 400 with `{ error: "Circular dependency detected", cycle: ["task-A", "task-B", "task-C", "task-A"] }`

**Scenario: No cycle — valid complex graph**
- WHEN Task B depends on Task A, and Task C depends on Task A
- AND a request is made to add Task C depends on Task B
- THEN no cycle exists (A → B, A → C, B → C forms a valid DAG)
- AND the dependency is created successfully

---

### 4. Auto-Cascade on Completion [ADDED]

The system SHALL automatically transition dependent tasks from TODO to IN_PROGRESS when all of their dependencies are completed.

- When a task's status changes to DONE in `updateTask()`, the system queries `TaskDependency` for all tasks where `dependsOnId` equals the completed task's ID.
- For each dependent task found, the system checks whether ALL of that task's dependencies (via `dependsOnId`) now have status DONE.
- If all dependencies are satisfied AND the dependent task's current status is TODO, the system transitions it to IN_PROGRESS.
- The status update and all cascades execute within a single Prisma transaction.
- Cascading is limited to one level deep per trigger invocation to prevent chain reactions.
- A maximum depth limit of 3 levels applies to any single user-initiated status change.

#### Scenarios

**Scenario: Single dependency satisfied**
- WHEN Task B depends on Task A and Task B has status TODO
- AND Task A's status is updated to DONE
- THEN Task B's status is automatically updated to IN_PROGRESS

**Scenario: Multiple dependencies — not all satisfied**
- WHEN Task C depends on Task A and Task B
- AND Task C has status TODO
- AND Task A's status is updated to DONE but Task B is still IN_PROGRESS
- THEN Task C's status remains TODO

**Scenario: Multiple dependencies — all satisfied**
- WHEN Task C depends on Task A and Task B
- AND Task C has status TODO
- AND Task B is already DONE
- AND Task A's status is updated to DONE
- THEN Task C's status is automatically updated to IN_PROGRESS

**Scenario: Dependent task is not in TODO status**
- WHEN Task B depends on Task A and Task B has status BLOCKED
- AND Task A's status is updated to DONE
- THEN Task B's status is NOT changed (auto-cascade only applies to TODO tasks)

**Scenario: Cascade depth limit**
- WHEN Task A → Task B → Task C → Task D form a dependency chain
- AND all are in TODO status
- AND Task A's status is updated to DONE
- THEN Task B transitions to IN_PROGRESS
- AND Task C and Task D remain in TODO (cascade is one level deep per trigger)

---

### 5. Architect Agent Generates Dependencies [ADDED]

The system SHALL update the Architect agent's task generation to include dependency information.

- `buildGenerateTasksPrompt()` in `lib/agents/prompts.ts` instructs the Architect to include a `dependsOnIndex` field in each generated task.
- `dependsOnIndex` is an array of 0-based indices referencing other tasks in the same generated array.
- `createTasksBatch()` in `lib/db/tasks.ts` is updated to: (1) create all tasks first and receive their real IDs, (2) map `dependsOnIndex` values to the corresponding real task IDs, (3) create `TaskDependency` records for each resolved dependency.
- Invalid indices (out of bounds, self-references) are silently skipped with a warning logged.

#### Scenarios

**Scenario: Architect generates tasks with dependencies**
- WHEN the Architect generates 3 tasks: [Setup DB (index 0), Create API (index 1), Build UI (index 2)]
- AND task at index 1 has `dependsOnIndex: [0]` and task at index 2 has `dependsOnIndex: [0, 1]`
- THEN after bulk creation, TaskDependency records are created: "Create API" depends on "Setup DB", "Build UI" depends on "Setup DB", "Build UI" depends on "Create API"

**Scenario: Architect generates tasks with no dependencies**
- WHEN the Architect generates tasks where all have `dependsOnIndex: []`
- THEN tasks are created normally with no TaskDependency records

**Scenario: Invalid dependency index**
- WHEN the Architect generates 2 tasks and one has `dependsOnIndex: [5]` (out of bounds)
- THEN the invalid index is skipped
- AND a warning is logged
- AND valid tasks and valid dependencies are still created

**Scenario: Self-referencing dependency index**
- WHEN a task at index 1 has `dependsOnIndex: [1]`
- THEN the self-reference is skipped
- AND a warning is logged

---

### 6. Dependency Visualization on Cards [ADDED]

The system SHALL display dependency information on task cards in Mission Control.

- Task cards show a "blocked by N" badge when the task has N unsatisfied dependencies (dependencies where the upstream task is not DONE).
- Task cards show a "blocks N" badge when N other tasks depend on this task and this task is not DONE.
- Badges are not shown when the count is 0.
- Badge counts reflect the current state of dependencies and update when the board refreshes.

#### Scenarios

**Scenario: Task with unsatisfied dependencies**
- WHEN Task C depends on Task A (DONE) and Task B (IN_PROGRESS)
- THEN Task C's card shows "blocked by 1" (only Task B is unsatisfied)

**Scenario: Task that blocks others**
- WHEN Task A is IN_PROGRESS and Task B and Task C both depend on Task A
- THEN Task A's card shows "blocks 2"

**Scenario: No dependencies**
- WHEN Task A has no dependencies and nothing depends on it
- THEN Task A's card shows no dependency badges

**Scenario: All dependencies satisfied**
- WHEN Task B depends on Task A and Task A is DONE
- THEN Task B's card does not show a "blocked by" badge (count is 0)

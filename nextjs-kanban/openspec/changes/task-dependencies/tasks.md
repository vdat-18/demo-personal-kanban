# Tasks: Task Dependencies

## Task 1: Add TaskDependency model to Prisma schema + migration

Add the `TaskDependency` model to the Prisma schema with:
- `id` (UUID, primary key, auto-generated)
- `dependsOnId` (String, FK → Task) — the upstream/prerequisite task
- `dependedById` (String, FK → Task) — the downstream/dependent task
- `createdAt` (DateTime, default now)
- Unique constraint on `(dependsOnId, dependedById)`
- Cascade delete on both foreign key relations
- Indexes on `dependsOnId` and `dependedById` for query performance

Add the reverse relations to the `Task` model (`dependsOn` and `dependedBy` relation fields).

Run `prisma migrate dev` to generate and apply the migration.

**Files**: `prisma/schema.prisma`
**Spec**: Task Dependency Data Model (Requirement 1)

---

## Task 2: Create dependency CRUD functions in lib/db/dependencies.ts

Create a new module `lib/db/dependencies.ts` with:
- `addDependency(dependedById: string, dependsOnId: string)` — creates a TaskDependency record. Validates both tasks exist and belong to the same project. Calls cycle detection before creation.
- `removeDependency(dependencyId: string)` — deletes a TaskDependency by ID.
- `getDependencies(taskId: string)` — returns `{ blockedBy: [...], blocks: [...] }` with related task info (id, title, status).
- `getUnsatisfiedDependencyCount(taskId: string)` — returns count of dependencies where upstream task is not DONE.
- `getBlocksCount(taskId: string)` — returns count of downstream tasks that depend on this task (when this task is not DONE).

**Files**: `lib/db/dependencies.ts`
**Spec**: Dependency CRUD API (Requirement 2), Dependency Visualization (Requirement 6)

---

## Task 3: Create API routes for dependency management

Create Next.js API route handlers:
- `POST /api/tasks/[id]/dependencies` — calls `addDependency()`, returns 201 with created record. Returns 400 for cycles, 404 for missing tasks, 409 for duplicates.
- `DELETE /api/tasks/[id]/dependencies/[depId]` — calls `removeDependency()`, returns 204. Returns 404 if not found.
- `GET /api/tasks/[id]/dependencies` — calls `getDependencies()`, returns the blockedBy/blocks structure.

Validate request bodies with zod schemas. Handle Prisma errors (unique constraint → 409, FK violation → 404).

**Files**: `app/api/tasks/[id]/dependencies/route.ts`, `app/api/tasks/[id]/dependencies/[depId]/route.ts`
**Spec**: Dependency CRUD API (Requirement 2)

---

## Task 4: Implement circular dependency detection (BFS)

Create a `detectCycle(dependedById: string, dependsOnId: string)` function in `lib/db/dependencies.ts` (or a dedicated `lib/dependency-graph.ts` module):
- Uses iterative BFS starting from the `dependedById` task.
- Follows `dependedBy` edges (tasks that depend on the current task) forward through the graph.
- If `dependsOnId` is found reachable from `dependedById`, a cycle would be created.
- Returns `null` if no cycle, or `{ cycle: string[] }` with the path if a cycle is detected.
- All queries scoped to the project of the involved tasks.

Write thorough unit tests covering: direct cycles (A↔B), indirect cycles (A→B→C→A), valid DAGs (diamond shapes), and single-node edge cases.

**Files**: `lib/dependency-graph.ts`, `__tests__/dependency-graph.test.ts`
**Spec**: Circular Dependency Prevention (Requirement 3)

---

## Task 5: Implement auto-cascade logic in updateTask

Modify `updateTask()` in `lib/db/tasks.ts`:
- After a successful status change to DONE, query `TaskDependency` for all records where `dependsOnId` equals the completed task's ID.
- For each dependent task (`dependedById`), check if ALL of that task's dependencies have status DONE.
- If all dependencies are satisfied AND the dependent task's status is TODO, transition it to IN_PROGRESS.
- Wrap the entire operation (original update + cascade) in a Prisma transaction.
- Limit cascade to one level deep per trigger.
- Log cascaded transitions for observability.

Write tests covering: single dependency satisfied, partial satisfaction (no cascade), full satisfaction (cascade), non-TODO dependents (no cascade), and depth limiting.

**Files**: `lib/db/tasks.ts`, `__tests__/auto-cascade.test.ts`
**Spec**: Auto-Cascade on Completion (Requirement 4)

---

## Task 6: Update buildGenerateTasksPrompt and createTasksBatch for dependency-aware generation

**Prompt update** (`lib/agents/prompts.ts`):
- Modify `buildGenerateTasksPrompt()` to instruct the Architect agent to include `dependsOnIndex: number[]` in each generated task.
- Add examples showing how to reference earlier tasks by 0-based index.
- Instruct the agent to leave `dependsOnIndex` as `[]` for tasks with no dependencies.

**Batch creation update** (`lib/db/tasks.ts`):
- Modify `createTasksBatch()` to accept an optional `dependsOnIndex` field per task.
- After creating all tasks and receiving real IDs, iterate through and resolve index references to real task IDs.
- Skip invalid indices (out of bounds, self-references) with a logged warning.
- Create `TaskDependency` records for all valid resolved dependencies.
- Wrap in a transaction.

**Files**: `lib/agents/prompts.ts`, `lib/db/tasks.ts`
**Spec**: Architect Agent Generates Dependencies (Requirement 5)

---

## Task 7: Add dependency badges to Mission Control task cards

Update the task card component used in Mission Control:
- Fetch dependency counts (unsatisfied `blockedBy` count and `blocks` count) alongside task data.
- Display a "blocked by N" badge on cards with N > 0 unsatisfied dependencies. Style with a red/orange indicator.
- Display a "blocks N" badge on cards where this task blocks N other tasks and is not yet DONE. Style with a yellow indicator.
- Badges are hidden when count is 0.
- Ensure badge data is included in the task query to avoid N+1 queries (use `_count` or include in the main task fetch).

**Files**: Task card component (Mission Control), task query/fetch logic
**Spec**: Dependency Visualization on Cards (Requirement 6)

---

## Task 8: Add dependency visualization to Planning UI

Update the Planning UI to allow users to manage dependencies:
- Add a "Dependencies" section to the task detail/edit view.
- Show current dependencies (blocked by / blocks) with task titles and status indicators.
- Provide an "Add dependency" control — a searchable dropdown of tasks in the same project (excluding self and tasks that would create cycles).
- Provide a remove button on each existing dependency.
- Wire up to the CRUD API endpoints from Task 3.
- Show inline error messages when cycle detection rejects an addition.

**Files**: Planning UI components, task detail/edit view
**Spec**: Dependency CRUD API (Requirement 2), Dependency Visualization (Requirement 6)

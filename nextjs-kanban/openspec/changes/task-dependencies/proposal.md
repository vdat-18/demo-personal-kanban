## Why

Tasks are currently flat — no relationships between them. In real projects, tasks have natural dependencies: "Build API" must finish before "Write integration tests." The Architect agent generates task lists during planning, but they're unordered flat arrays with no dependency information. Adding task dependencies enables workflow sequencing, unlocks auto-cascade (dependents auto-start when blockers complete), and gives the Architect agent the ability to produce structured DAGs instead of flat lists.

## What Changes

- Add a self-referential many-to-many relation on Task in Prisma schema (`dependsOn` / `dependedBy`)
- Create a new `TaskDependency` join table with `dependsOnId` and `dependedById` foreign keys
- Add API endpoints for managing dependencies: add, remove, list dependencies for a task
- Update task creation to accept optional `dependsOn` array of task IDs
- Update the Architect agent's `buildGenerateTasksPrompt` to instruct it to output tasks with dependency references
- Add dependency visualization to Mission Control (small dependency badges on cards)
- Add dependency visualization to Planning UI (simple DAG view of task order)
- Prevent circular dependencies via server-side validation
- When a task moves to DONE, auto-advance its direct dependents from TODO to IN_PROGRESS (auto-cascade)

## Capabilities

### New Capabilities

- `task-dependencies`: Self-referential task dependency model, dependency CRUD API, circular dependency validation, auto-cascade on completion, and dependency-aware task generation from the Architect agent

### Modified Capabilities

## Impact

- **`prisma/schema.prisma`** — new `TaskDependency` model + relations on `Task`
- **New migration** — creates `TaskDependency` join table
- **`app/api/tasks/[id]/dependencies/route.ts`** (new) — CRUD for dependencies
- **`lib/db/tasks.ts`** — dependency-aware queries, cascade logic on status change
- **`lib/agents/prompts.ts`** — update `buildGenerateTasksPrompt` to include dependency instructions
- **`components/mission-control/MissionControlClient.tsx`** — dependency badges on cards
- **`components/planning/PlanningClient.tsx`** — dependency visualization
- **`lib/validations/schemas.ts`** — dependency schemas

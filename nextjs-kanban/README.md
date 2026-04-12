# nextjs-kanban

This is the maintained application inside the repository: a Next.js + Prisma + PostgreSQL workspace for an AI-assisted personal kanban system.

At a product level, the app combines:

- project creation
- AI-guided planning
- task generation and approval
- Kanban execution
- task-level AI chat
- early-stage workflow automation

## Read This First

If you are inheriting the project, start with:

- [.planning/CURRENT_SYSTEM_SNAPSHOT.md](./.planning/CURRENT_SYSTEM_SNAPSHOT.md) for the current product and architecture picture
- [.planning/DEMO_SCENARIO_SPECS.md](./.planning/DEMO_SCENARIO_SPECS.md) for three domain-specific demo/test scenario specs
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for file and API navigation
- [KANBAN_ARCHITECTURE.md](./KANBAN_ARCHITECTURE.md) for status and mission-control behavior

## Product Shape

The intended product is an AI-first work assistant where a user:

1. creates or continues a project
2. plans through chat
3. turns that plan into tasks
4. executes via mission control and task chat
5. gradually hands more work to autonomous agents

The current implementation already supports that flow in broad strokes, but some pieces are still partial:

- planning is comparatively mature
- kanban execution works
- per-task AI chat works
- column auto mode exists
- document ingestion, reporter summaries, and deeper autonomy are still incomplete

## Main Routes

- `/` — project home
- `/planning/[id]` — planning workspace with threads, vision doc, and task panel
- `/mission-control/[id]` — Kanban board
- `/chat/[id]` — task-level AI chat
- `/summary/[id]` — task summary
- `/directory` — global project/task browser
- `/components` — internal component showcase

## Run

From the repo root, the recommended command is:

```bash
./run.sh
```

That wrapper starts this app through Docker Compose and creates default env files if needed.

If you want to run only this package directly:

```bash
docker compose up
```

or:

```bash
npm install
npm run db:generate
npm run dev
```

Open `http://localhost:3000`.

## Verify

Practical checks currently available:

```bash
npm run db:generate
npm run build
npm run lint
```

Current state of this codebase snapshot:

- `db:generate` passes
- `build` passes
- `lint` does not pass cleanly yet
- there is no real automated test suite

## Architecture

High-level stack:

- Next.js App Router
- React 19
- Prisma + PostgreSQL
- React Query
- SSE streaming for agent chat
- `@jackchen_me/open-multi-agent` for agent execution

The app separates:

- planning conversations (`PlanningThread`, `PlanningMessage`)
- execution conversations (`Conversation`)

That split is intentional and matters when changing product flow.

## Notes

- This package is the real runtime path. The repo root also contains older experimental `frontend/`, `server/`, and Python-era artifacts.
- Navigation currently includes `/timeline` and `/insights`, but those routes do not exist yet.
- The “Reporter Agent” appears in design language and specs, but is not fully implemented in the backend today.

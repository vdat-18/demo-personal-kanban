# demo-personal-kanban

This repository currently runs from [`nextjs-kanban`](./nextjs-kanban), a Next.js 16 + Prisma + PostgreSQL app for an AI-assisted personal kanban board.

The top-level `frontend/`, `server/`, and `pyproject.toml` files are older experiments and are not the main runtime path for this repo.

## Run

Recommended:

```bash
./run.sh
```

That starts the maintained app with Docker Compose from `nextjs-kanban/` and will create `nextjs-kanban/.env.docker` if it does not already exist.

App URL:

```text
http://localhost:3000
```

Useful modes:

```bash
./run.sh docker   # same as default
./run.sh local    # run Next.js locally instead of Docker
./run.sh check    # run the available verification commands
./run.sh install  # install npm dependencies for nextjs-kanban
```

## Local Development

If you do not want Docker:

1. Run a PostgreSQL instance yourself.
2. Point `DATABASE_URL` at it, or let `./run.sh local` create `nextjs-kanban/.env.local` with this default:

```text
postgresql://kanban:kanban@localhost:5432/kanban
```

3. Start the app:

```bash
./run.sh local
```

`./run.sh local` will install dependencies if needed and run `prisma generate` before `npm run dev`.

AI provider keys are optional for booting the UI, but agent features need the corresponding env vars, for example:

```text
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```

## Test / Verify

There is no `npm test` script in the maintained app right now. The practical checks currently available are:

```bash
./run.sh check
```

That runs:

```bash
cd nextjs-kanban
npm run db:generate
npm run build
npm run lint
```

Current verified status in this repo snapshot:

- `npm run db:generate`: passes
- `npm run build`: passes
- `npm run lint`: fails with many pre-existing ESLint issues in app code and generated files

So the repo is runnable, but it does not currently have a clean lint baseline or an automated test suite.

## Manual Commands

Docker:

```bash
cd nextjs-kanban
docker compose up --build
```

Local:

```bash
cd nextjs-kanban
npm install
npm run db:generate
npm run dev
```

## Notes

- Docker development uses [`nextjs-kanban/docker-compose.override.yml`](./nextjs-kanban/docker-compose.override.yml), so `docker compose up` runs the app in hot-reload mode.
- Production-style Docker startup without the dev override is:

```bash
cd nextjs-kanban
docker compose -f docker-compose.yml up --build
```

## Docs

For system understanding rather than setup, start here:

- [`nextjs-kanban/.planning/CURRENT_SYSTEM_SNAPSHOT.md`](./nextjs-kanban/.planning/CURRENT_SYSTEM_SNAPSHOT.md) — product vision, current flow, implemented features, gaps
- [`nextjs-kanban/.planning/DEMO_SCENARIO_SPECS.md`](./nextjs-kanban/.planning/DEMO_SCENARIO_SPECS.md) — three current-product-first demo/test scenario briefs
- [`nextjs-kanban/README.md`](./nextjs-kanban/README.md) — maintained app overview
- [`nextjs-kanban/QUICK_REFERENCE.md`](./nextjs-kanban/QUICK_REFERENCE.md) — file and API navigation

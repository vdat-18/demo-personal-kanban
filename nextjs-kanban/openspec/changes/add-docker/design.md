## Context

This is a Next.js 16 kanban application using:
- **Runtime**: Node.js / Next.js with `output: "standalone"` already configured
- **Database**: PostgreSQL via Prisma ORM
- **AI integrations**: Anthropic SDK, OpenAI, Google GenAI (require API keys at runtime)

Currently, developers must manually install Node.js, PostgreSQL, set up `.env`, run migrations, and seed data. Docker will consolidate this into a single `docker compose up` workflow.

The project already has `output: "standalone"` in `next.config.ts`, which produces a minimal self-contained build ideal for Docker images.

## Goals / Non-Goals

**Goals:**
- Single-command local dev environment (`docker compose up`)
- Production-ready multi-stage Dockerfile using Next.js standalone output
- PostgreSQL container with persistent volume and automatic migration on startup
- Hot-reload support in development via bind-mount
- Documented `.env.example` for required variables

**Non-Goals:**
- CI/CD pipeline configuration (GitHub Actions, etc.)
- Kubernetes / Helm charts
- Multi-environment deployment (staging, production cloud infra)
- SSL termination inside Docker (handled by reverse proxy externally)

## Decisions

### 1. Multi-stage Dockerfile (builder + runner)

**Decision**: Use a three-stage build: `deps` (install), `builder` (compile), `runner` (minimal runtime).

**Rationale**: The `output: "standalone"` Next.js feature copies only the required node_modules subset into `.next/standalone/`. The final image only needs the standalone output + static assets — no full `node_modules` directory. This keeps the production image small (~150–200MB vs ~1GB+).

**Alternatives considered**:
- Single-stage: Simple but ships all dev dependencies; rejected for image size.
- Distroless base: Minimal attack surface but harder to debug; deferred for now.

### 2. `docker-compose.yml` + `docker-compose.override.yml` split

**Decision**: Base `docker-compose.yml` defines production-like services; `docker-compose.override.yml` (auto-loaded by Docker Compose) adds dev-specific overrides (bind-mounts, `next dev` command).

**Rationale**: Keeps production config clean. Developers get hot-reload automatically without flags; CI uses `docker compose -f docker-compose.yml` to skip overrides.

**Alternatives considered**:
- Single file with profiles: Clutters the file and requires `--profile dev` flag every time.

### 3. Entrypoint script for migrations

**Decision**: An `entrypoint.sh` script runs `prisma migrate deploy` then starts the app.

**Rationale**: Ensures the database schema is always up to date when the container starts. Avoids a separate migration job for local dev.

**Alternatives considered**:
- Separate migration service in compose: More correct for production but overkill for this project scope.
- Manual migration step: Error-prone; developers forget to run it.

### 4. PostgreSQL service in compose (not external)

**Decision**: Bundle a `postgres:16-alpine` service in docker-compose.

**Rationale**: Zero external dependencies for local dev. Database state persists via a named Docker volume.

**Alternatives considered**:
- Require external Postgres: Works but defeats the "one command" goal.

## Risks / Trade-offs

- **Prisma `generate` in image** → Prisma generates the client at build time in the `builder` stage; the `PRISMA_GENERATE_SKIP_AUTOINSTALL` env var is not needed since we run it explicitly. Risk: schema drift if `prisma generate` is not re-run. Mitigation: `postinstall` script in `package.json` already handles this.
- **Hot-reload bind-mount on macOS** → `node_modules` bind-mounted into the container can cause performance issues. Mitigation: use a named volume for `node_modules` in the override to shadow the bind-mount.
- **Secret management** → API keys (Anthropic, OpenAI, Google) are passed via `.env` file. Risk: `.env` committed to source control. Mitigation: `.dockerignore` and `.gitignore` both exclude `.env`; `.env.example` documents required keys.
- **`output: standalone` + Prisma** → Prisma's engine binaries must be copied into the standalone output. Mitigation: Handled by `COPY --from=builder .next/standalone ./` and ensuring `prisma` is in `dependencies` (already done in `package.json`).

## Migration Plan

1. Add Docker files (no changes to existing app code beyond entrypoint env var usage)
2. Ensure `DATABASE_URL` env var is referenced in `prisma/schema.prisma` (verify)
3. Developers stop using local Postgres; run `docker compose up` instead
4. **Rollback**: Simply stop containers and revert to local setup — no data migration needed for dev

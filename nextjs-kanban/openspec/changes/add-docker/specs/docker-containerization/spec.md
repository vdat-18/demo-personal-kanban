## ADDED Requirements

### Requirement: Multi-stage production Dockerfile
The project SHALL include a `Dockerfile` that builds the Next.js application using a multi-stage build (deps → builder → runner), leveraging `output: "standalone"` to produce a minimal production image.

#### Scenario: Build succeeds and produces minimal image
- **WHEN** `docker build -t nextjs-kanban .` is run from the project root
- **THEN** the build completes without error and the final image contains only the standalone Next.js output, static assets, and Prisma engine binaries

#### Scenario: Production container starts correctly
- **WHEN** the built image is run with required environment variables (`DATABASE_URL`, `NODE_ENV=production`)
- **THEN** the Next.js server starts on port 3000 and serves the application

### Requirement: Docker Compose orchestration
The project SHALL include a `docker-compose.yml` that defines and connects the `app` (Next.js) and `db` (PostgreSQL 16) services with a named volume for database persistence.

#### Scenario: Full stack starts with one command
- **WHEN** `docker compose up` is run in the project root
- **THEN** both the PostgreSQL database and Next.js app start, the app is accessible at `http://localhost:3000`, and database data persists across container restarts via a named volume

#### Scenario: Services connect via internal network
- **WHEN** the app container starts
- **THEN** the app can reach the database using the internal hostname `db` on port 5432

### Requirement: Development override with hot-reload
The project SHALL include a `docker-compose.override.yml` that overrides the app service to run `next dev` with source files bind-mounted, enabling hot-reload during development.

#### Scenario: Code changes reflect without rebuild
- **WHEN** a developer edits a source file while `docker compose up` is running
- **THEN** Next.js detects the change and hot-reloads without requiring a container restart or image rebuild

#### Scenario: node_modules are not overwritten by bind-mount
- **WHEN** the source directory is bind-mounted into the container
- **THEN** the container's `node_modules` directory (installed during image build) is preserved via a named volume and not replaced by the host's `node_modules`

### Requirement: Automatic database migration on startup
The project SHALL include an `entrypoint.sh` script that runs `prisma migrate deploy` before starting the Next.js server, ensuring the database schema is always current.

#### Scenario: Migrations run on fresh database
- **WHEN** the app container starts against a brand-new database
- **THEN** `prisma migrate deploy` applies all pending migrations before the app begins accepting requests

#### Scenario: No-op when schema is current
- **WHEN** the app container restarts against an already-migrated database
- **THEN** `prisma migrate deploy` completes immediately with no changes and the app starts normally

### Requirement: Build context exclusion via .dockerignore
The project SHALL include a `.dockerignore` file that excludes `node_modules`, `.next`, `.git`, `.env*`, and other non-essential files from the Docker build context.

#### Scenario: Build context is minimal
- **WHEN** `docker build` is run
- **THEN** `node_modules`, `.next`, `.git`, `.env`, and test/coverage directories are excluded from the build context, reducing transfer time and preventing accidental secret leakage

### Requirement: Environment variable documentation
The project SHALL include a `.env.example` file listing all environment variables required to run the application in Docker, with placeholder values and inline comments.

#### Scenario: New developer can configure environment
- **WHEN** a developer copies `.env.example` to `.env` and fills in their values
- **THEN** `docker compose up` starts successfully with all required services configured

#### Scenario: Sensitive keys are not committed
- **WHEN** a `.env` file is present in the project
- **THEN** `.dockerignore` and `.gitignore` both exclude it, preventing accidental commit of secrets

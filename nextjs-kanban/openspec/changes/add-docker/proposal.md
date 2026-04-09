## Why

The project currently requires manual local setup of Node.js, PostgreSQL, and environment variables, making onboarding slow and environment inconsistencies a real risk. Adding Docker containerization standardizes the development and deployment environment, enabling one-command startup for all services.

## What Changes

- Add a `Dockerfile` for the Next.js application (multi-stage build for production)
- Add a `docker-compose.yml` orchestrating the app + PostgreSQL database services
- Add a `.dockerignore` file to exclude unnecessary files from the build context
- Add a `docker-compose.override.yml` for local development (hot-reload, volume mounts)
- Update `README.md` with Docker usage instructions
- Update `prisma/schema.prisma` datasource to use an environment variable for the DB URL (if not already)
- Add `.env.example` documenting required environment variables for Docker

## Capabilities

### New Capabilities

- `docker-containerization`: Dockerfile and docker-compose setup for running the Next.js app and PostgreSQL database in containers, supporting both development (with hot-reload) and production builds.

### Modified Capabilities

<!-- No existing spec-level requirement changes -->

## Impact

- **New files**: `Dockerfile`, `docker-compose.yml`, `docker-compose.override.yml`, `.dockerignore`, `.env.example`
- **Modified files**: `README.md` (usage docs), possibly `next.config.ts` (host binding), `prisma/schema.prisma` (ensure `DATABASE_URL` env var is used)
- **Dependencies**: Docker Engine and Docker Compose (external tooling, not npm dependencies)
- **Database**: PostgreSQL runs as a Docker service; local Postgres installations no longer required
- **Prisma migrations**: `prisma migrate deploy` runs inside the container on startup

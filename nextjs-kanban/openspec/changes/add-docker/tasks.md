## 1. Build Context & Ignore Files

- [x] 1.1 Create `.dockerignore` excluding `node_modules`, `.next`, `.git`, `.env*`, coverage, and test directories
- [x] 1.2 Create `.env.example` with all required environment variables (`DATABASE_URL`, `NODE_ENV`, `NEXTAUTH_SECRET` or equivalent, AI API keys) with placeholder values and inline comments

## 2. Dockerfile (Multi-stage)

- [x] 2.1 Create `Dockerfile` with a `deps` stage: use `node:20-alpine`, set `WORKDIR /app`, copy `package*.json` and `prisma/schema.prisma`, run `npm ci`
- [x] 2.2 Add `builder` stage: copy source, run `npx prisma generate`, run `npm run build` (produces `.next/standalone`)
- [x] 2.3 Add `runner` stage: use `node:20-alpine`, set `NODE_ENV=production`, copy `.next/standalone`, `.next/static`, `public`, and Prisma engine binaries from builder
- [x] 2.4 Create `entrypoint.sh`: run `npx prisma migrate deploy` then `exec node server.js`; make it executable (`chmod +x`)
- [x] 2.5 Set `ENTRYPOINT ["./entrypoint.sh"]` and `EXPOSE 3000` in the runner stage

## 3. Docker Compose (Base)

- [x] 3.1 Create `docker-compose.yml` with a `db` service: `postgres:16-alpine`, named volume `postgres_data`, env vars `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, health check
- [x] 3.2 Add `app` service to `docker-compose.yml`: build from `Dockerfile`, `depends_on: db` with condition `service_healthy`, port `3000:3000`, `env_file: .env`
- [x] 3.3 Declare named volumes `postgres_data` and `node_modules` at the bottom of `docker-compose.yml`

## 4. Docker Compose Override (Development)

- [x] 4.1 Create `docker-compose.override.yml` that overrides the `app` service command to `npm run dev` (or `next dev`)
- [x] 4.2 Add bind-mount of project root to `/app` in the override, and a named volume for `node_modules` at `/app/node_modules` to prevent host override

## 5. Verification

- [x] 5.1 Run `docker compose build` and confirm no build errors
- [x] 5.2 Run `docker compose up` and confirm app is accessible at `http://localhost:3000`
- [x] 5.3 Confirm database migrations ran (check logs for `prisma migrate deploy` output)
- [x] 5.4 Edit a source file and confirm hot-reload works in development mode
- [x] 5.5 Verify `.env` is not included in the Docker build context (check `docker build --progress=plain` output)

## 6. Documentation

- [x] 6.1 Update `README.md` with a "Getting Started with Docker" section covering: prerequisites, copy `.env.example` → `.env`, `docker compose up`, and how to run migrations/seeds manually

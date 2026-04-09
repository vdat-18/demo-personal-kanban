This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started with Docker (Recommended)

Docker is the easiest way to run the full stack (Next.js app + PostgreSQL) with a single command.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose v2)

### 1. Configure environment variables

```bash
cp .env.example .env.docker
# Edit .env.docker and fill in your API keys:
# - ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
# The DATABASE_URL is pre-configured to connect to the Docker Postgres service.
```

### 2. Start the stack

```bash
docker compose up
```

This starts:
- **PostgreSQL 16** on an internal network (not exposed to host)
- **Next.js app** at [http://localhost:3000](http://localhost:3000), with automatic database migrations on startup

> **Hot-reload in development**: `docker compose up` automatically uses `docker-compose.override.yml`, which runs `next dev` with Turbopack and live file watching via bind-mounts. Edit any source file and the browser will update instantly.

### 3. Seed the database (optional)

```bash
docker compose exec app npm run db:seed
```

### Useful commands

```bash
# View logs
docker compose logs -f app

# Stop all services
docker compose down

# Rebuild after dependency changes
docker compose build

# Run production build (no hot-reload)
docker compose -f docker-compose.yml up
```

---

## Getting Started (Local Development without Docker)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

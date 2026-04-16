# Project Exploration Summary

## 1. Top-Level Directory Structure

### Root: `/Users/triphan/Documents/kanban/demo-personal-kanban/nextjs-kanban/`

**Key Directories:**
- `app/` - Next.js app directory (with api routes)
- `lib/` - Shared libraries and services
- `components/` - React components
- `prisma/` - Database schema and migrations
- `public/` - Static assets
- `types/` - TypeScript types
- `constants/` - Constants
- `scripts/` - Utility scripts

**Key Files at Root:**
- `docker-compose.yml` - Production compose config
- `docker-compose.override.yml` - Development overrides
- `.env.local` - Local environment variables (Docker PostgreSQL + OpenAI API)
- `Dockerfile` - Container build
- `package.json` - Dependencies
- `tsconfig.json` - TypeScript config
- `next.config.ts` - Next.js config
- `instrumentation.ts` - Server instrumentation

### Parent Directories:
```
/Users/triphan/Documents/kanban/demo-personal-kanban/
├── nextjs-kanban/        ← Current project
├── frontend/             ← Separate React app
├── server/               ← Separate server
├── docs/
├── openspec/
└── ...
```

---

## 2. Docker Configuration

### docker-compose.yml (Production)
```yaml
services:
  db:
    image: postgres:16-alpine
    environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (defaults: kanban)
    volumes: postgres_data
    healthcheck: pg_isready check
  
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports: 3000:3000
    env_file: .env, .env.docker (optional)
    depends_on: db (service_healthy)

volumes:
  postgres_data:
```

### docker-compose.override.yml (Development)
```yaml
# Automatically loaded for local dev (skipped in CI)
services:
  app:
    build:
      target: deps  # Stop at deps stage (no full build)
    command: sh -c "npx prisma generate && npx prisma db push && npm run dev"
    environment:
      NODE_ENV: development
    volumes:
      - .:/app  # Bind-mount for hot-reload
      - node_modules:/app/node_modules  # Named volume to shadow host
    ports:
      - "3000:3000"
```

**Current .env.local:**
```
DATABASE_URL="postgresql://kanban:kanban@db:5432/kanban?schema=public"
OPENAI_API_KEY=sk-proj-...
```

**Note:** No `.env.example` file exists yet - this needs to be created.

---

## 3. Environment Validation Schema

### Location: `lib/validations/schemas.ts` (lines 209-238)

```typescript
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'Invalid Anthropic API key').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'Invalid OpenAI API key').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AGENT_MODEL: z.string().min(1).default('gpt-4o-mini'),
})

export type EnvConfig = z.infer<typeof envSchema>

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${issues}`)
  }
  return result.data
}

export function getAgentModel(): string {
  return process.env.AGENT_MODEL || 'gpt-4o-mini'
}
```

**Supported API Keys:**
- `ANTHROPIC_API_KEY` (optional) - format: `sk-ant-*`
- `OPENAI_API_KEY` (optional) - format: `sk-*`
- Default model: `gpt-4o-mini`

---

## 4. Existing Agent Routes

### Location: `app/api/agents/`

**6 Agent Routes:**

1. **`/api/agents/stream` (POST)** - SSE streaming
   - Input: `chatStreamSchema`
   - Calls: `AgentService.createStream(role, userMessage, taskId, messages)`
   - Output: Server-sent events (text/event-stream)

2. **`/api/agents/run` (POST)** - Non-streaming execution
   - Input: `runAgentSchema` (role, prompt)
   - Calls: `runAgent(role, prompt)` from orchestrator
   - Output: JSON response

3. **`/api/agents/plan` (POST)** - Planning workflow
   - Input: `planRequestSchema` (projectId, userMessage)
   - Calls: `AgentService.runPlan(projectId, userMessage)`
   - Output: JSON with result and tokenUsage

4. **`/api/agents/team` (POST)** - Multi-agent team execution
   - Input: `teamAgentSchema` (goal, agents: AgentRole[])
   - Calls: `runTeam(goal, agents)` from orchestrator
   - Output: JSON response

5. **`/api/agents/generate-tasks` (POST)** - Task generation
   - Input: `generateTasksSchema` (projectId, messages)
   - Calls: `AgentService.generateTasks(projectId, messages)`
   - Output: JSON with generated tasks

6. **`/api/agents/tasks` (POST/GET/PATCH)** - Task management
   - CRUD operations for tasks

**Validation Schemas in `lib/validations/schemas.ts`:**
```typescript
export const agentRoleSchema = z.enum(['architect', 'developer', 'reviewer'])

export const chatStreamSchema = z.object({
  role: agentRoleSchema,
  userMessage: z.string().min(1).max(10000),
  taskId: uuidSchema,
  messages: z.array(chatMessageSchema).optional(),
})

export const streamAgentSchema = z.object({
  role: agentRoleSchema,
  prompt: z.string().min(1).max(10000),
  taskId: uuidSchema.optional(),
})

export const runAgentSchema = z.object({
  role: agentRoleSchema,
  prompt: z.string().min(1).max(10000),
})

export const teamAgentSchema = z.object({
  goal: z.string().min(1).max(10000),
  agents: z.array(agentRoleSchema).min(1),
})

export const planRequestSchema = z.object({
  projectId: uuidSchema,
  userMessage: z.string().min(1).max(10000),
})

export const generateTasksSchema = z.object({
  projectId: uuidSchema,
  messages: z.array(generateTasksMessageSchema).min(1),
})
```

---

## 5. AgentService Implementation

### Location: `lib/services/agent.service.ts`

**Main Method: `AgentService.createStream()`**

```typescript
createStream(
  role: AgentRole,
  userMessage: string,
  taskId: string,
  existingMessages?: Array<{ role: string; content: string }>,
): ReadableStream
```

**Behavior:**
1. Creates a `ReadableStream` with SSE events
2. Builds chat prompt using `buildChatPrompt(role, userMessage, taskId)`
3. Initializes `Agent` from `@jackchen_me/open-multi-agent` lib
4. Builds tool registry and executor
5. Streams events:
   - `started` - stream initiated
   - `token` - text delta (incremental response)
   - `progress` - tool usage events
   - `complete` - done (with tokenUsage)
   - `error` - error occurred
6. **Persists conversation** via `ConversationService.create()` after completion
7. Returns: `ReadableStream` with response headers:
   ```
   Content-Type: text/event-stream
   Cache-Control: no-cache, no-transform
   Connection: keep-alive
   X-Accel-Buffering: no
   ```

**Other AgentService Methods:**
- `runPlan(projectId, userMessage)` - Calls architect agent for planning
- `generateTasks(projectId, messages)` - Generates structured tasks from conversation

**Dependencies:**
- `@jackchen_me/open-multi-agent` - Agent framework
- `lib/agents/configs` - Agent configurations (architect, developer, reviewer)
- `lib/agents/prompts` - Prompt building functions
- `lib/agents/tools` - Custom tools registry
- `ConversationService` - Persistence layer
- `TaskService` - Task creation

---

## 6. Library Structure

### `lib/` Directory Organization

```
lib/
├── agents/
│   ├── configs.ts        - Agent role configurations
│   ├── prompts.ts        - Prompt builders
│   ├── tools.ts          - Tool registry
│   └── orchestrator.ts   - Agent orchestration
├── api/
│   ├── error-handler.ts  - withErrorHandler middleware
│   └── errors.ts         - Custom error types
├── services/
│   ├── agent.service.ts  ← Main service
│   ├── conversation.service.ts
│   ├── task.service.ts
│   └── ...
├── validations/
│   └── schemas.ts        - All Zod schemas & envSchema
├── db/
│   ├── prisma.ts         - Prisma client
│   └── ...
├── types/
│   ├── json-fields.ts    - ConversationMessage types
│   └── ...
└── utils.ts, status-lifecycle.ts, etc.
```

---

## 7. Key Takeaways

### What Exists:
✅ Docker Compose setup (prod + dev)  
✅ 6 Agent API routes (stream, run, plan, team, generate-tasks, tasks)  
✅ AgentService with `createStream()` method  
✅ Zod validation schemas + environment schema  
✅ Multi-agent framework integration (`@jackchen_me/open-multi-agent`)  
✅ Conversation persistence  
✅ Agent roles: architect, developer, reviewer  

### What's Missing:
❌ `.env.example` file (needs to be created)  
❌ Anthropic API key support in config (schema defined but not used?)  

### Technology Stack:
- **Framework:** Next.js with App Router
- **Database:** PostgreSQL + Prisma ORM
- **Agents:** `@jackchen_me/open-multi-agent`
- **Validation:** Zod
- **API Model:** OpenAI (gpt-4o-mini default) + Anthropic support planned
- **Containerization:** Docker + Docker Compose


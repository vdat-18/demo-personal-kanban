## Context

The nextjs-kanban project has a working multi-agent system in TypeScript using `@jackchen_me/open-multi-agent` with 3 fixed agents and 6 database tools. The user wants Agno-style dynamic agent routing with rich tool support (PDF, web search, office docs). Since Agno is Python-only (`pip install agno`) with 120+ built-in tools and native `TeamMode.route`, we deploy it as a FastAPI microservice alongside the existing Next.js app rather than rebuilding these capabilities in TypeScript.

**Current architecture**: Next.js → `@jackchen_me/open-multi-agent` → 3 fixed agents → 6 DB tools
**Target architecture**: Next.js → Agno microservice (HTTP/SSE) → dynamic team → N agents → 120+ tools

The existing TypeScript agent system remains intact as a fallback.

## Goals / Non-Goals

**Goals:**
- Deploy Agno as a Python microservice that the Next.js app calls via HTTP
- Use `TeamMode.route` for an AI leader to dynamically select which agents handle each request
- Leverage Agno's built-in tools (PDF, web search, file ops, etc.) instead of building custom CLI wrappers
- Create custom Agno tools that bridge back to the kanban database for task/project operations
- Support SSE streaming from Agno through to the Next.js frontend
- Dockerize both services for consistent deployment

**Non-Goals:**
- Replacing the existing TypeScript agent system (it stays as fallback)
- Using Agno's AgentOS cloud features (self-hosted only)
- Building a Python web UI (all UI stays in Next.js)
- Migrating the database to Python (Prisma stays in Next.js; Agno tools call the Next.js API)
- Supporting every Agno tool from day one (start with core tools, expand as needed)

## Decisions

### 1. Agno as a Sidecar Microservice (not embedded Python)

**Decision:** Run Agno in a separate Docker container with FastAPI, communicating with Next.js via HTTP/SSE.

**Rationale:** Clean separation of concerns. The Python service owns agent intelligence; Next.js owns UI and database. No Python runtime needed in the Node.js container. Docker Compose makes local development simple.

**Alternatives considered:**
- *Python child process from Node.js (execa)*: Messy, hard to stream, cold-start per request
- *WebSocket bridge*: Over-engineered for request/response patterns; SSE is simpler
- *Rebuild in TypeScript*: Would lose 120+ Agno tools; months of work to replicate

### 2. TeamMode.route for Dynamic Agent Selection

**Decision:** Define a team of specialist agents, each with a clear `role` and specific tools. Use `TeamMode.route` so the AI team leader analyzes each request and picks the right agent(s).

**Agent roster (initial):**

| Agent | Role | Agno Tools |
|-------|------|------------|
| `researcher` | Web research and information gathering | `DuckDuckGoTools`, `NewspaperTools`, `WikipediaTools` |
| `doc-processor` | PDF and document analysis | `DoclingTools`, `FileTools`, `CsvToolkit` |
| `planner` | Task planning and project management | `KanbanTools` (custom) |
| `data-analyst` | Data analysis and visualization | `PandasTools`, `DuckDbTools`, `PythonTools` |
| `writer` | Content creation and document generation | `FileTools`, `PythonTools` |
| `developer` | Code execution and technical tasks | `PythonTools`, `ShellTools` |

**Rationale:** The team leader is the context analyzer — it reads the user's message and available agents' roles, then routes to the right one. No custom LLM call needed for analysis; Agno's route mode handles it natively.

### 3. Custom Kanban Tools via Agno's Tool API

**Decision:** Create custom Agno tools (`KanbanTools`) in Python that call back to the Next.js API for task CRUD operations.

```python
class KanbanTools(Toolkit):
    def __init__(self, api_base: str):
        self.api_base = api_base  # e.g., "http://nextjs:3000/api"

    def get_tasks(self, project_id: str, status: str = None) -> str:
        """Fetch tasks from the kanban board."""
        # Calls GET /api/tasks?projectId=...&status=...

    def create_task(self, title: str, description: str, ...) -> str:
        """Create a new task on the kanban board."""
        # Calls POST /api/tasks

    def update_task(self, task_id: str, ...) -> str:
        """Update a task."""
        # Calls PATCH /api/tasks/:id
```

**Rationale:** The kanban database stays in Prisma/PostgreSQL managed by Next.js. Agno agents don't need direct DB access — they call the existing Next.js API. This avoids dual database connections and keeps the schema in one place.

### 4. SSE Streaming Through Next.js Proxy

**Decision:** The Agno FastAPI service streams responses via SSE. Next.js has a thin proxy route (`/api/agents/smart-run`) that forwards the request to Agno and pipes the SSE stream back to the browser.

**Flow:**
```
Browser → POST /api/agents/smart-run (Next.js)
  → POST /run (Agno FastAPI)
  ← SSE stream (agent tokens, tool calls, results)
← SSE stream (proxied to browser)
```

**Rationale:** Keeps the frontend calling a single origin (Next.js). The proxy adds auth, logging, and fallback logic. If Agno is down, the proxy falls back to the existing TypeScript agent system.

### 5. Docker Compose for Local Development and Deployment

**Decision:** Add `docker-compose.yml` with three services: `nextjs` (existing app), `agno` (Python microservice), `db` (PostgreSQL, already exists).

```yaml
services:
  nextjs:
    build: ./nextjs-kanban
    ports: ["3000:3000"]
    environment:
      AGNO_SERVICE_URL: http://agno:8000
  agno:
    build: ./agno-service
    ports: ["8000:8000"]
    environment:
      NEXTJS_API_URL: http://nextjs:3000/api
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  db:
    image: postgres:16
```

**Rationale:** Docker Compose is already familiar in the project (the existing `.env.example` references `db:5432`). Adding the Agno service is just one more container.

### 6. Incremental Tool Expansion

**Decision:** Start with 6 core Agno tool categories. Expand based on user needs. Adding new tools = adding to the agent definition in Python, no infra changes.

**Phase 1 tools:** DuckDuckGo search, Docling (PDF), File operations, CSV/Pandas, Python execution, Shell execution, Custom Kanban tools.

**Phase 2 (future):** Gmail, Google Sheets, Slack, GitHub, Jira, etc.

## Risks / Trade-offs

- **[Added infrastructure complexity]** → Two services instead of one. Mitigation: Docker Compose abstracts this. Health checks ensure the Agno service is up. Fallback to TypeScript agents if Agno is unreachable.
- **[Python dependency for the team]** → Developers need Python knowledge for agent customization. Mitigation: The Python code is minimal (agent definitions + custom tools). The bulk of the app stays TypeScript.
- **[Network latency between services]** → HTTP calls between Next.js and Agno add ~1-5ms per hop. Mitigation: Both run in the same Docker network. SSE streaming means the user sees tokens as they arrive, masking any initial latency.
- **[Agno version pinning]** → Agno is actively developed; breaking changes possible. Mitigation: Pin exact version in `requirements.txt`. Test before upgrading.
- **[Database access pattern]** → Agno tools call Next.js API (not direct DB). This adds a hop for task operations. Mitigation: The kanban API already exists and is tested. For read-heavy operations, we can add a direct read-only Prisma connection in Python via `psycopg2` if latency matters.

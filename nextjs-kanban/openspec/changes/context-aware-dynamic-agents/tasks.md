## 1. Agno Service Setup

- [x] 1.1 Create `agno-service/` directory alongside `nextjs-kanban/` with Python project structure: `pyproject.toml`, `requirements.txt`, `Dockerfile`, `src/` directory
- [x] 1.2 Set up `requirements.txt` with pinned versions: `agno`, `fastapi`, `uvicorn`, `httpx`, plus tool extras (`agno[duckduckgo]`, `agno[docling]`, `agno[pandas]`)
- [x] 1.3 Create `Dockerfile` for the Agno service: Python 3.11 base, install dependencies, expose port 8000, run with uvicorn
- [x] 1.4 Create `src/config.py`: load environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXTJS_API_URL`, `AGENT_MODEL`, `PORT`) with defaults

## 2. Custom Kanban Tools

- [x] 2.1 Create `src/tools/kanban.py`: implement `KanbanTools(Toolkit)` with `api_base` from env var `NEXTJS_API_URL`
- [x] 2.2 Implement `get_tasks(project_id, status)` — calls `GET /api/tasks` on Next.js, returns formatted task list string
- [x] 2.3 Implement `create_task(title, description, project_id, priority, status)` — calls `POST /api/tasks`, returns created task
- [x] 2.4 Implement `update_task(task_id, title, description, status, priority)` — calls `PATCH /api/tasks/:id`, returns updated task
- [x] 2.5 Implement `delete_task(task_id)` — calls `DELETE /api/tasks/:id`, returns confirmation
- [x] 2.6 Implement `get_projects()` and `create_project(name, description)` — calls project API endpoints
- [x] 2.7 Add error handling: catch `httpx` exceptions, return descriptive error strings instead of raising (so agents can reason about failures)

## 3. Agent Definitions & Team

- [x] 3.1 Create `src/agents/definitions.py`: define specialist agents with Agno `Agent()` — each with name, role, model, and tools
- [x] 3.2 Define `researcher` agent: role="Web research and information gathering", tools=[DuckDuckGoTools(), WikipediaTools()]
- [x] 3.3 Define `doc-processor` agent: role="PDF and document analysis", tools=[DoclingTools(), FileTools(), CsvToolkit()]
- [x] 3.4 Define `planner` agent: role="Task planning and project management for kanban boards", tools=[KanbanTools()]
- [x] 3.5 Define `data-analyst` agent: role="Data analysis and visualization", tools=[PandasTools(), DuckDbTools(), PythonTools()]
- [x] 3.6 Define `writer` agent: role="Content creation and document generation", tools=[FileTools(), PythonTools()]
- [x] 3.7 Define `developer` agent: role="Code execution and technical tasks", tools=[PythonTools(), ShellTools()]
- [x] 3.8 Create `src/agents/team.py`: assemble the Team with `TeamMode.route`, all agents as members, configurable leader model

## 4. FastAPI Application

- [x] 4.1 Create `src/app.py`: FastAPI app with Agno `AgentOS`, health check endpoint, CORS middleware for Next.js origin
- [x] 4.2 Create `POST /run` endpoint: accepts `{ message, stream?, files?, project_id?, domain? }`, runs the team, returns JSON or SSE stream
- [x] 4.3 Implement SSE streaming: use FastAPI `StreamingResponse` with `text/event-stream` content type, emit token events as agents generate output
- [x] 4.4 Add response metadata: include `agents_used`, `tools_used`, and `routing_reason` in final response/event
- [x] 4.5 Add `GET /health` endpoint: returns service status, loaded agent count, available tools list
- [x] 4.6 Create `src/main.py` entrypoint: configure uvicorn with host/port from config

## 5. Docker Compose

- [x] 5.1 Create/update `docker-compose.yml` in the project root: add `agno` service alongside existing `nextjs` and `db` services
- [x] 5.2 Configure networking: both services on same Docker network, `AGNO_SERVICE_URL=http://agno:8000` for Next.js, `NEXTJS_API_URL=http://nextjs:3000/api` for Agno
- [x] 5.3 Add `.env.example` entries for Agno: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AGENT_MODEL`
- [ ] 5.4 Test `docker-compose up` starts both services and they can communicate

## 6. Next.js Integration

- [x] 6.1 Create `lib/agno-client.ts`: `smartRun(request)` and `smartRunStream(request)` functions using native `fetch`, with `AGNO_SERVICE_URL` from env
- [x] 6.2 Add `AgnoServiceError` class with structured error codes (`CONNECTION_FAILED`, `TIMEOUT`, `INVALID_RESPONSE`)
- [x] 6.3 Create `app/api/agents/smart-run/route.ts`: POST handler that proxies to Agno service, supports both JSON and SSE streaming modes
- [x] 6.4 Add fallback logic in the proxy route: if Agno service is unreachable, fall back to `AgentService.createStream()` with the architect role, set `X-Agent-Fallback: true` header
- [x] 6.5 Add `AGNO_SERVICE_URL` to `lib/validations/schemas.ts` `envSchema` with default `http://localhost:8000`
- [x] 6.6 Verify existing routes (`/api/agents/run`, `/stream`, `/plan`) are completely unchanged — zero modifications to existing files

## 7. Testing & Verification

- [ ] 7.1 Test Agno service standalone: start the FastAPI app, send curl requests to `/run` with different message types, verify correct agent routing
- [ ] 7.2 Test KanbanTools: mock the Next.js API, verify all CRUD operations produce correct HTTP calls and handle errors
- [ ] 7.3 Test SSE streaming: send a stream request, verify tokens arrive incrementally and metadata event comes at the end
- [ ] 7.4 Test Next.js proxy: start both services, send requests to `/api/agents/smart-run`, verify end-to-end flow
- [ ] 7.5 Test fallback: stop the Agno service, send request to `/api/agents/smart-run`, verify it falls back to TypeScript agent system
- [ ] 7.6 Test adding a new agent: add a simple test agent to the team, verify the leader can route to it without any other changes

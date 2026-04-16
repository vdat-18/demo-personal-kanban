## Why

The current agent system uses a fixed mapping of 3 agents (architect, developer, reviewer) with statically assigned tools in TypeScript. Every request activates the same agents regardless of context. When a task requires external capabilities (PDF parsing, web research, office document generation, Excel analysis), the system cannot help because those tools don't exist. Rather than rebuilding these capabilities from scratch in TypeScript, we adopt **Agno** — a Python-based multi-agent framework with 120+ built-in tools and native dynamic agent routing (`TeamMode.route`). Agno runs as a Python/FastAPI microservice alongside the existing Next.js app, providing context-aware agent orchestration out of the box.

## What Changes

- **Agno Python Microservice**: A new FastAPI service powered by Agno's `AgentOS` runtime. It handles all dynamic agent logic: context-aware routing, tool selection, and execution. Deployed alongside the Next.js app via Docker Compose.
- **Dynamic Agent Team with Agno `TeamMode.route`**: An AI team leader analyzes each request and routes it to the right specialist agent(s). Agents are defined with specific roles and tools — the leader picks only what's needed.
- **120+ Built-in Tools via Agno**: PDF processing (`docling`), web search (`duckduckgo`, `tavily`, `searxng`), office/Excel (`googlesheets`, `file`), file operations (`local_file_system`, `csv_toolkit`), email (`gmail`, `resend`), coding (`python`, `shell`), and many more — all available without custom CLI tool installation.
- **Next.js Integration Layer**: A thin TypeScript client in the existing Next.js app that calls the Agno microservice via HTTP/SSE. The existing agent routes (`/run`, `/stream`, `/plan`) remain unchanged.
- **Kanban-Aware Custom Tools**: Custom Agno tools that connect back to the Next.js Prisma database for task CRUD operations, bridging Agno's intelligence with the kanban data layer.

## Capabilities

### New Capabilities
- `agno-service`: The Python/FastAPI microservice running Agno's AgentOS runtime with dynamic team routing, agent definitions, and built-in tools.
- `agno-integration`: The TypeScript client layer in Next.js that communicates with the Agno service — request/response handling, SSE streaming, error fallback to existing agents.
- `kanban-tools`: Custom Agno tools (Python) that call back to the Next.js API for task/project CRUD, making the Agno agents kanban-aware.
- `agent-router`: The Agno Team with `TeamMode.route` that dynamically selects which specialist agents handle each request based on context.

### Modified Capabilities
<!-- No existing specs to modify — the Agno service is additive. Existing TS agent system stays intact as fallback. -->

## Impact

- **Infrastructure**: New Python microservice added to the deployment. Docker Compose orchestrates both Next.js and Agno services. Python 3.11+ required in the Agno container.
- **Code (Python, new)**: `agno-service/` directory with agent definitions, custom kanban tools, team configuration, and FastAPI app.
- **Code (TypeScript, minimal)**: New `lib/agno-client.ts` for HTTP/SSE communication. New route `POST /api/agents/smart-run` that proxies to the Agno service.
- **Dependencies (Python)**: `agno`, `fastapi`, `uvicorn`, plus Agno tool extras (`agno[duckduckgo]`, `agno[docling]`, etc.).
- **Dependencies (TypeScript)**: No new npm packages — uses native `fetch` and `EventSource` for SSE.
- **Existing system**: Untouched. All current routes, agents, and tools remain as-is. The Agno service is a parallel path, not a replacement.

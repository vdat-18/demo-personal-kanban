## ADDED Requirements

### Requirement: Next.js proxy route forwards requests to Agno service
The Next.js app SHALL expose `POST /api/agents/smart-run` that proxies requests to the Agno microservice. The proxy MUST forward the request body and stream SSE responses back to the browser.

#### Scenario: Successful proxy with streaming
- **WHEN** the browser sends `POST /api/agents/smart-run` with `{ message: "find recent AI news", stream: true }`
- **THEN** the Next.js route forwards the request to the Agno service and pipes the SSE stream back to the browser

#### Scenario: Successful proxy without streaming
- **WHEN** the browser sends `POST /api/agents/smart-run` with `{ message: "list my tasks" }`
- **THEN** the Next.js route forwards to Agno, waits for the response, and returns the JSON result

#### Scenario: Agno service is unreachable
- **WHEN** the Next.js proxy cannot connect to the Agno service (connection refused or timeout)
- **THEN** the route falls back to the existing TypeScript agent system (`AgentService.createStream`) and includes a header `X-Agent-Fallback: true`

### Requirement: Agno client module handles HTTP/SSE communication
A TypeScript module `lib/agno-client.ts` SHALL provide functions for communicating with the Agno microservice: `smartRun(request)` for JSON responses and `smartRunStream(request)` for SSE streaming. The module MUST handle connection errors and return structured error responses.

#### Scenario: Agno client sends request and parses JSON response
- **WHEN** `smartRun({ message: "list tasks" })` is called
- **THEN** the client sends a POST to `${AGNO_SERVICE_URL}/run`, parses the JSON response, and returns `{ result: string, agentsUsed: string[], toolsUsed: string[] }`

#### Scenario: Agno client handles SSE stream
- **WHEN** `smartRunStream({ message: "research AI trends", stream: true })` is called
- **THEN** the client returns a `ReadableStream` that emits SSE events from the Agno service

#### Scenario: Agno client handles network error
- **WHEN** the Agno service is unreachable
- **THEN** the client throws an `AgnoServiceError` with `{ code: "CONNECTION_FAILED", message: "..." }` that the proxy route can catch for fallback

### Requirement: Integration preserves existing agent system
All existing API routes (`/api/agents/run`, `/api/agents/stream`, `/api/agents/plan`, `/api/agents/generate-tasks`) SHALL remain unchanged. The Agno integration MUST NOT modify any existing TypeScript agent files.

#### Scenario: Existing route still works
- **WHEN** the browser sends `POST /api/agents/stream` with `{ role: "architect", userMessage: "plan my sprint" }`
- **THEN** the existing TypeScript agent system handles the request exactly as before

#### Scenario: No import changes in existing files
- **WHEN** the Agno integration is deployed
- **THEN** `lib/agents/orchestrator.ts`, `lib/agents/configs.ts`, and `lib/services/agent.service.ts` have zero modifications

### Requirement: Environment configuration for Agno service URL
The Next.js app SHALL read `AGNO_SERVICE_URL` from environment variables to locate the Agno microservice. The variable MUST have a default value of `http://localhost:8000` for local development.

#### Scenario: Custom Agno service URL
- **WHEN** `AGNO_SERVICE_URL=http://agno:8000` is set in the environment
- **THEN** the Agno client sends all requests to `http://agno:8000`

#### Scenario: Default URL for local development
- **WHEN** `AGNO_SERVICE_URL` is not set
- **THEN** the Agno client defaults to `http://localhost:8000`

## ADDED Requirements

### Requirement: Agno FastAPI service starts and serves agent endpoints
The Agno service SHALL expose a FastAPI application via `AgentOS.get_app()` that accepts HTTP requests for agent execution. The service MUST start on a configurable port (default 8000) and respond to health checks.

#### Scenario: Service startup
- **WHEN** the Agno Docker container starts
- **THEN** the FastAPI app is running on port 8000 and `GET /health` returns `200 OK`

#### Scenario: Service configuration via environment variables
- **WHEN** the service starts with `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `NEXTJS_API_URL` environment variables
- **THEN** the Agno agents are configured with the provided LLM API keys and kanban tools point to the correct Next.js API base URL

### Requirement: Agent team is defined with specialist agents and tools
The Agno service SHALL define a Team with `TeamMode.route` containing specialist agents. Each agent MUST have a descriptive `name`, `role`, assigned Agno tools, and a model configuration.

#### Scenario: Team includes all Phase 1 agents
- **WHEN** the Agno service initializes
- **THEN** the team contains at least: researcher (DuckDuckGoTools), doc-processor (DoclingTools, FileTools), planner (KanbanTools), data-analyst (PandasTools), writer (FileTools), and developer (PythonTools, ShellTools)

#### Scenario: Each agent has a clear role description
- **WHEN** the team leader receives a request
- **THEN** it can read each agent's `role` field to determine which agent best handles the request

### Requirement: Team leader dynamically routes requests to appropriate agents
The Agno Team in `TeamMode.route` SHALL use the AI leader to analyze incoming requests and route them to the most appropriate specialist agent(s) based on the request content and agent roles.

#### Scenario: PDF processing request
- **WHEN** a user sends "summarize this PDF report" with a file reference
- **THEN** the team leader routes the request to the `doc-processor` agent

#### Scenario: Web research request
- **WHEN** a user sends "find recent articles about AI agent frameworks"
- **THEN** the team leader routes the request to the `researcher` agent

#### Scenario: Kanban task request
- **WHEN** a user sends "create tasks from these action items: ..."
- **THEN** the team leader routes the request to the `planner` agent with KanbanTools

#### Scenario: Compound request requiring multiple capabilities
- **WHEN** a user sends "search for competitor info and create a comparison task"
- **THEN** the team leader engages the `researcher` agent first, then routes to the `planner` agent

### Requirement: Agno service supports SSE streaming responses
The Agno service SHALL support Server-Sent Events (SSE) streaming for real-time token delivery to the client. The stream MUST emit agent output tokens as they are generated.

#### Scenario: Streamed response
- **WHEN** a client sends a request with `stream: true`
- **THEN** the Agno service returns a `text/event-stream` response with tokens streamed as they are produced by the agent

#### Scenario: Non-streamed response
- **WHEN** a client sends a request without `stream: true`
- **THEN** the Agno service returns the complete response as a JSON body after the agent finishes

### Requirement: Adding new agents requires only configuration changes
New specialist agents MUST be addable by defining a new `Agent()` instance with role and tools, and adding it to the team's `members` list. No changes to routing logic, FastAPI endpoints, or infrastructure SHALL be required.

#### Scenario: Adding an email agent
- **WHEN** a developer adds `Agent(name="emailer", role="Send and manage emails", tools=[GmailTools()])` to the team members
- **THEN** the team leader can route email-related requests to this new agent without any other code changes

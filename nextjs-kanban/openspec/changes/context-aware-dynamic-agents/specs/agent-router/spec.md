## ADDED Requirements

### Requirement: Agent team routes requests dynamically based on content
The Agno Team configured with `TeamMode.route` SHALL have an AI leader that examines each incoming request and decides which specialist agent(s) to activate. The leader MUST consider the request message content, any file references, and the available agents' roles.

#### Scenario: Simple data query routes to planner
- **WHEN** a user sends "what tasks are overdue?"
- **THEN** the team leader routes to the `planner` agent which uses KanbanTools to query tasks

#### Scenario: Research request routes to researcher
- **WHEN** a user sends "find the latest trends in AI agent frameworks"
- **THEN** the team leader routes to the `researcher` agent which uses DuckDuckGoTools

#### Scenario: Document request routes to doc-processor
- **WHEN** a user sends "analyze this PDF and extract key findings" with a file reference
- **THEN** the team leader routes to the `doc-processor` agent which uses DoclingTools

#### Scenario: Code request routes to developer
- **WHEN** a user sends "write a Python script to process this CSV data"
- **THEN** the team leader routes to the `developer` agent which uses PythonTools

### Requirement: Router supports request with file attachments
The router endpoint SHALL accept file references (file path or URL) in the request body. The team leader MUST consider file type when routing to determine which agent can handle the file.

#### Scenario: PDF file attachment
- **WHEN** the request includes `files: [{ name: "report.pdf", path: "/uploads/report.pdf" }]`
- **THEN** the team leader recognizes PDF processing is needed and routes to the `doc-processor` agent

#### Scenario: CSV file attachment
- **WHEN** the request includes `files: [{ name: "data.csv", path: "/uploads/data.csv" }]`
- **THEN** the team leader routes to the `data-analyst` agent with PandasTools

### Requirement: Router endpoint accepts structured request format
The router's HTTP endpoint SHALL accept a JSON request body with: `message` (required), `stream` (optional boolean), `files` (optional array), `project_id` (optional string), and `domain` (optional string).

#### Scenario: Minimal request
- **WHEN** a POST is sent with `{ "message": "hello" }`
- **THEN** the router accepts the request and routes it to an appropriate agent

#### Scenario: Full request with all fields
- **WHEN** a POST is sent with `{ "message": "analyze this", "stream": true, "files": [...], "project_id": "uuid", "domain": "SOFTWARE_ENGINEERING" }`
- **THEN** the router uses all fields to inform the team leader's routing decision and agent context

### Requirement: Router provides observability via response metadata
Each response from the router SHALL include metadata about which agent(s) handled the request and which tools were invoked, enabling debugging and monitoring.

#### Scenario: Response includes agent metadata
- **WHEN** the `researcher` agent handles a request using DuckDuckGoTools
- **THEN** the response includes `{ "agents_used": ["researcher"], "tools_used": ["duckduckgo_search"], "routing_reason": "User requested web research" }`

#### Scenario: Streaming response includes metadata event
- **WHEN** a streamed request completes
- **THEN** the final SSE event is `{ "type": "metadata", "data": { "agents_used": [...], "tools_used": [...] } }`

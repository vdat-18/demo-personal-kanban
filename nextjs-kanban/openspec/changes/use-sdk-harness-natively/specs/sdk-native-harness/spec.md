## ADDED Requirements

### Requirement: Agent configs declare tools natively
Each `AgentConfig` in `lib/agents/configs.ts` SHALL include a `tools` array using the SDK-native format (built-in name strings and/or custom `ToolDefinition` objects). No separate registry or filter function SHALL be used to assign tools to agents.

#### Scenario: Architect config has correct tools
- **WHEN** the `architect` AgentConfig is read
- **THEN** its `tools` array contains only `db_query` and `project_create` tool references

#### Scenario: Developer config has correct tools
- **WHEN** the `developer` AgentConfig is read
- **THEN** its `tools` array contains `db_query`, `task_create`, `task_update`, `task_delete`, and `project_create` tool references

#### Scenario: Reviewer config has correct tools
- **WHEN** the `reviewer` AgentConfig is read
- **THEN** its `tools` array contains only `db_query` tool reference

### Requirement: onProgress is forwarded to the SDK
The orchestrator functions `runAgent`, `runTeam`, and `runTasks` SHALL accept an `onProgress` callback and pass it to `OrchestratorConfig.onProgress` when constructing the `OpenMultiAgent` instance for that call.

#### Scenario: Progress events reach the stream route
- **WHEN** `runAgent` is called with an `onProgress` callback
- **THEN** each `OrchestratorEvent` emitted by the SDK is forwarded to that callback

#### Scenario: No onProgress is safe
- **WHEN** `runAgent` is called without an `onProgress` callback
- **THEN** the orchestrator constructs without `onProgress` and runs to completion without error

### Requirement: No singleton orchestrator
The `OpenMultiAgent` instance SHALL be constructed fresh on each invocation of `runAgent`, `runTeam`, or `runTasks`. No module-level mutable instance SHALL be retained between calls.

#### Scenario: Concurrent requests are isolated
- **WHEN** two `runAgent` calls execute concurrently with different `onProgress` callbacks
- **THEN** each call's progress events are delivered only to its own callback

### Requirement: registry.ts is removed
The file `lib/agents/registry.ts` SHALL be deleted. No code in the codebase SHALL import from it.

#### Scenario: No import of registry
- **WHEN** the codebase is scanned for imports of `./registry` or `lib/agents/registry`
- **THEN** no import is found

## REMOVED Requirements

### Requirement: Singleton orchestrator reset
**Reason**: The singleton pattern is removed in favour of per-request construction. `resetOrchestrator()` had no callers outside of tests and is no longer meaningful.
**Migration**: Remove calls to `resetOrchestrator()`. If test isolation is needed, simply rely on per-request construction — each call creates a fresh instance.

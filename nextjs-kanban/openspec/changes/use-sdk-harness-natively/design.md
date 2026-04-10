## Context

The harness lives in three files:

- **`lib/agents/configs.ts`** — defines `AgentConfig` objects using the SDK type. Currently includes `systemPrompt` but no `tools` array; tool assignment is done externally.
- **`lib/agents/registry.ts`** — custom logic that filters `allTools` per agent name. This is not part of the SDK; it's our own invention and is never actually called by anything — `orchestrator.ts` never imports it.
- **`lib/agents/orchestrator.ts`** — wraps `OpenMultiAgent` with a singleton. `runAgent`, `runTeam`, and `runTasks` all accept `onProgress` as a parameter but never forward it to the SDK. The SDK exposes `OrchestratorConfig.onProgress` at construction time, which we never use.
- **`app/api/agents/stream/route.ts`** — creates an `onProgress` closure and passes it to `runAgent(...)` — but since `orchestrator.ts` drops it, no progress events ever reach the SSE stream.

The SDK's `AgentConfig` already supports `tools: string[]` where strings are either built-in names (`'bash'`, `'file_read'`, etc.) or custom `ToolDefinition` objects registered via `ToolRegistry`. Tool-to-agent assignment should live on the config, not in a separate registry file.

## Goals / Non-Goals

**Goals:**
- Wire `OrchestratorConfig.onProgress` so the stream route receives live progress events
- Move tool assignment into each `AgentConfig.tools` — the SDK already supports this
- Delete `registry.ts` — it's dead code implementing something the SDK does natively
- Keep the `runAgent` / `runTeam` / `runTasks` public API signatures stable so no route handler needs to change (except stream)

**Non-Goals:**
- Changing the custom tool implementations in `lib/agents/tools/index.ts`
- Changing any FE code or hook interfaces
- Using `beforeRun`/`afterRun` hooks in this change (separate concern)
- Enabling streaming at the LLM token level (the SDK's `Agent.stream()`) — current SSE model is task-level progress events, which is sufficient

## Decisions

### Decision 1: Orchestrator per-request vs. singleton

**Current**: A module-level singleton `orchestratorInstance` is reused across all requests. `onProgress` can't be per-request on a singleton because it's set at construction time.

**Decision**: Drop the singleton. Construct a new `OpenMultiAgent` on each `runAgent` / `runTeam` / `runTasks` call, passing `onProgress` in the constructor config.

**Alternatives considered**:
- Keep singleton, re-create only when `onProgress` differs — complex, error-prone with concurrent requests.
- Use `OrchestratorConfig` as a factory — same outcome, more indirection.

**Rationale**: `OpenMultiAgent` construction is cheap (no I/O). Per-request instances are safe for concurrent SSR/serverless execution and eliminate shared mutable state.

### Decision 2: Tool assignment — config vs. registry

**Current**: `registry.ts` filters `allTools` by agent name at call time. It's never invoked.

**Decision**: Declare `tools` directly on each `AgentConfig` in `configs.ts`. Use built-in tool name strings where applicable; attach custom `defineTool` instances for DB tools.

**Alternatives considered**:
- Keep `registry.ts` and actually call it — adds indirection with no SDK alignment benefit.
- Dynamic tool injection at call time via `beforeRun` hook — more flexible but adds complexity not needed here.

**Rationale**: SDK-idiomatic. Tool list is static per role, so co-locating it with the config is clearer and removes a layer.

### Decision 3: onProgress forwarding in stream route

**Current**: `stream/route.ts` passes `onProgress` as the third arg to `runAgent()`; `orchestrator.ts` ignores it.

**Decision**: `runAgent` (and `runTeam`, `runTasks`) accept `onProgress` and pass it into the `OpenMultiAgent` constructor for that call.

**Rationale**: Minimal change to public API; callers don't need to change. The SDK emits `OrchestratorEvent` objects — the route's `emit` adapter maps them to SSE frames.

## Risks / Trade-offs

- **[Risk] Per-request orchestrator construction** → if `OpenMultiAgent` constructor becomes expensive in a future SDK version, this could add latency. Mitigation: benchmark; re-introduce a factory pattern only if needed.
- **[Risk] OrchestratorEvent shape differs from current progress payload** → the route currently emits `{ type: 'progress', ...event }`. The SDK's `OrchestratorEvent` may have different fields than what the FE `useAgentStream` hook expects. Mitigation: inspect `OrchestratorEvent` type at implementation time and map to the existing shape if needed.
- **[Trade-off] Dead `resetOrchestrator()` export** → with no singleton, `resetOrchestrator` becomes a no-op. It can be removed or kept as a stub for backwards compat with any test that imports it.

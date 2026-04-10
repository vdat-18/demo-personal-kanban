## Why

The current harness (`lib/agents/orchestrator.ts`, `registry.ts`, `tools/`) wraps `@jackchen_me/open-multi-agent` but re-invents what the SDK already provides: `onProgress` callbacks are accepted but silently dropped, tool-to-agent filtering is custom-coded instead of using the SDK's `AgentConfig.tools` array, and lifecycle hooks (`beforeRun`/`afterRun`) go unused. This leaves us maintaining dead wrapper code while missing real SDK features like progress streaming and agent lifecycle interception.

## What Changes

- **Remove** `lib/agents/registry.ts` — tool-to-agent filtering replaced by per-agent `tools` arrays in `AgentConfig`
- **Rewrite** `lib/agents/configs.ts` — each `AgentConfig` declares its own `tools` list using the SDK's built-in tool names (`'bash'`, `'file_read'`, etc.) plus references to our custom `defineTool` instances
- **Rewrite** `lib/agents/orchestrator.ts` — wire `onProgress` into `OrchestratorConfig` at construction time so the stream route receives live events; remove the dead singleton pattern; remove wrapper functions that silently drop the callback
- **Update** `app/api/agents/stream/route.ts` — pass `onProgress` via orchestrator construction rather than as a dropped argument to `runAgent`
- **Keep** `lib/agents/tools/index.ts` unchanged — custom `defineTool` definitions stay as-is, they're the only truly custom logic

## Capabilities

### New Capabilities

- `sdk-native-harness`: The agent harness is configured and wired exclusively through SDK-native APIs (`OrchestratorConfig.onProgress`, per-agent `tools` in `AgentConfig`, `beforeRun`/`afterRun` hooks), with no custom wrapper logic duplicating SDK behavior

### Modified Capabilities

<!-- No existing openspec/specs/ — no delta specs required -->

## Impact

- **Deleted**: `lib/agents/registry.ts`
- **Rewritten**: `lib/agents/orchestrator.ts`, `lib/agents/configs.ts`
- **Updated**: `app/api/agents/stream/route.ts` (onProgress wiring)
- **Unchanged**: `lib/agents/tools/index.ts`, all API route handlers (other than stream), all FE code
- **No new dependencies** — `@jackchen_me/open-multi-agent` is already installed

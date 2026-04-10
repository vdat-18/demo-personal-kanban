## Why

Agent prompt logic is currently split across two files — `configs.ts` (system prompts per role) and `prompts.ts` (dynamic prompt builders). This separation means anyone adding or modifying an agent must coordinate changes across both files, and the relationship between a role's static system prompt and its dynamic context-assembly is not obvious. Consolidating into a single file makes the prompt surface area easier to reason about, maintain, and extend (e.g., adding new agent personas like Marketing agents).

## What Changes

- Merge `lib/agents/configs.ts` and `lib/agents/prompts.ts` into a single `lib/agents/prompts.ts` file that owns all prompt-related concerns: role labels, system prompts, and dynamic prompt builders.
- `lib/agents/configs.ts` becomes a thin re-export of agent config objects (name, model, provider, tools) with **no** inline `systemPrompt` strings — those move into the consolidated prompts file.
- Agent configs will reference prompt functions instead of carrying raw prompt strings, keeping the config focused on model/tool wiring.
- Update all import sites (`orchestrator.ts`, route handlers, hooks) to pull prompt-related symbols from the single source.

## Capabilities

### New Capabilities
- `unified-prompt-module`: A single-file prompt module that co-locates role definitions (system prompts, labels) with dynamic prompt builders (`buildChatPrompt`, `buildPlanPrompt`, `buildGenerateTasksPrompt`), exposing a clean public API.

### Modified Capabilities
<!-- No existing spec-level requirements are changing — this is a structural refactor. -->

## Impact

- **Code**: `lib/agents/configs.ts`, `lib/agents/prompts.ts`, `lib/agents/orchestrator.ts`, and 4 route handler files (`app/api/agents/stream/route.ts`, `app/api/agents/plan/route.ts`, `app/api/agents/generate-tasks/route.ts`, `app/api/planning-threads/[id]/messages/route.ts`).
- **APIs**: No external API changes — all prompt assembly remains server-side.
- **Dependencies**: No new dependencies. `@jackchen_me/open-multi-agent` types (`AgentConfig`) remain the same.
- **Risk**: Low — purely internal restructuring with no behavioral changes. All existing prompt output remains identical.

## Context

The kanban app's agent system currently has prompt logic split across two files:

- **`lib/agents/configs.ts`** — Defines `AgentConfig` objects per role (architect, developer, reviewer) containing `name`, `model`, `provider`, `tools`, and long inline `systemPrompt` strings. Also exports `AgentRole` type and lookup helpers.
- **`lib/agents/prompts.ts`** — Dynamic prompt builders (`buildChatPrompt`, `buildPlanPrompt`, `buildGenerateTasksPrompt`) that fetch DB context and assemble full prompts. Also defines `ROLE_LABEL` mapping.

Consumers:
- `orchestrator.ts` imports from `configs.ts` (agent wiring)
- 4 route handlers import from `prompts.ts` (prompt building)
- `auto-mode/constants.ts` and `hooks/useAgentStream.ts` import `AgentRole` type from `configs.ts`

The `@jackchen_me/open-multi-agent` SDK expects `AgentConfig` objects with a `systemPrompt` field, so configs must still carry prompt strings — but they don't need to be *defined* inline.

## Goals / Non-Goals

**Goals:**
- Single file (`lib/agents/prompts.ts`) owns all prompt text: system prompts, role labels, and dynamic builders
- `configs.ts` becomes a thin wiring file (model, provider, tools) that pulls system prompts from `prompts.ts`
- No behavioral changes — every prompt output remains byte-identical
- Make it trivial to add new agent personas (e.g., Marketing agents) by editing one file

**Non-Goals:**
- Changing the prompt content itself (no rewording, no new instructions)
- Restructuring the `AgentConfig` type or the SDK interface
- Moving DB-fetching logic out of prompt builders
- Changing the route handler implementations beyond updating imports

## Decisions

### 1. Consolidation direction: prompts.ts absorbs configs.ts prompt strings (not the reverse)

**Rationale**: `prompts.ts` already owns dynamic prompt assembly and `ROLE_LABEL`. It's the natural home for all prompt-related text. Moving system prompts *into* `configs.ts` would make configs bloated and couple config wiring to prompt content.

**Alternative considered**: Merging everything into configs.ts — rejected because configs should stay focused on model/tool wiring.

### 2. configs.ts remains as a separate file for non-prompt config

**Rationale**: `orchestrator.ts` and type consumers (`auto-mode/constants.ts`, `useAgentStream.ts`) only need the `AgentRole` type and config objects (model, provider, tools). Keeping `configs.ts` as a thin wiring file avoids pulling DB imports (`getTask`, `getProject`) into modules that don't need them.

**Alternative considered**: Merging configs.ts entirely into prompts.ts — rejected due to unnecessary coupling of DB-dependent prompt code into pure-config consumers.

### 3. System prompts exported as constants from prompts.ts, consumed by configs.ts

**Rationale**: `configs.ts` will import `SYSTEM_PROMPTS` (a `Record<AgentRole, string>`) from `prompts.ts` and spread it into each `AgentConfig`. This keeps the data flow one-directional: prompts.ts → configs.ts → orchestrator.ts.

**Alternative considered**: Having configs.ts call a function like `getSystemPrompt(role)` — rejected as unnecessary indirection for static strings.

## Risks / Trade-offs

- **[Circular dependency]** → `configs.ts` will import from `prompts.ts`, and `prompts.ts` already imports `AgentRole` type from `configs.ts`. Mitigation: The `AgentRole` type import is type-only (`import type`), so no runtime circular dependency. Verify with `tsc --noEmit`.
- **[Larger single file]** → `prompts.ts` grows from ~170 lines to ~250 lines. Mitigation: Still well within manageable size; clear section comments maintain readability.
- **[Import churn]** → Several files import from `configs.ts` for the `AgentRole` type; these don't need to change since `configs.ts` still exists. Only prompt-related imports need updating. Mitigation: Limited to the 4 route handler files that currently import prompt builders — no change needed.

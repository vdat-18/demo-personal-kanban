## ADDED Requirements

### Requirement: Single-file system prompt ownership
The `lib/agents/prompts.ts` file SHALL be the single source of truth for all agent prompt text, including system prompts for each role, role labels, and dynamic prompt builders.

#### Scenario: System prompts defined in prompts.ts
- **WHEN** a developer looks for the system prompt for any agent role (architect, developer, reviewer)
- **THEN** the full text of each system prompt SHALL be defined as an exported constant in `lib/agents/prompts.ts`

#### Scenario: Role labels co-located with system prompts
- **WHEN** a developer looks for the human-readable label for any agent role
- **THEN** the `ROLE_LABEL` mapping SHALL remain in `lib/agents/prompts.ts` alongside the system prompts

### Requirement: Configs consumes prompts, not the reverse
The `lib/agents/configs.ts` file SHALL import system prompt strings from `prompts.ts` and assign them to each `AgentConfig.systemPrompt` field. Configs SHALL NOT define prompt text inline.

#### Scenario: AgentConfig references imported prompt
- **WHEN** the `agentConfigs` record is constructed in `configs.ts`
- **THEN** each entry's `systemPrompt` field SHALL be populated from the `SYSTEM_PROMPTS` export of `prompts.ts`

#### Scenario: No inline prompt strings in configs
- **WHEN** a developer reads `configs.ts`
- **THEN** there SHALL be zero multi-line prompt string literals in the file

### Requirement: Prompt output byte-identical
All prompt builder functions (`buildChatPrompt`, `buildPlanPrompt`, `buildGenerateTasksPrompt`) SHALL produce identical output before and after the refactor for any given input.

#### Scenario: buildChatPrompt output unchanged
- **WHEN** `buildChatPrompt` is called with role `"developer"`, message `"hello"`, and a valid task ID
- **THEN** the returned string SHALL be identical to what the pre-refactor code produces

#### Scenario: buildPlanPrompt output unchanged
- **WHEN** `buildPlanPrompt` is called with a message, valid project ID, and conversation history
- **THEN** the returned string SHALL be identical to what the pre-refactor code produces

#### Scenario: buildGenerateTasksPrompt output unchanged
- **WHEN** `buildGenerateTasksPrompt` is called with a message array and valid project ID
- **THEN** the returned string SHALL be identical to what the pre-refactor code produces

### Requirement: No circular runtime dependency
The import relationship between `prompts.ts` and `configs.ts` SHALL NOT create a circular runtime dependency. Type-only imports are permitted.

#### Scenario: Type-only import from configs in prompts
- **WHEN** `prompts.ts` imports `AgentRole` from `configs.ts`
- **THEN** the import SHALL use `import type` syntax to avoid runtime circular dependency

#### Scenario: Runtime import from prompts in configs
- **WHEN** `configs.ts` imports `SYSTEM_PROMPTS` from `prompts.ts`
- **THEN** this SHALL be the only runtime import direction between the two files

### Requirement: Public API preserved
All existing public exports from both files SHALL remain available. No consumer file SHALL require import path changes beyond what is necessary for the consolidation.

#### Scenario: AgentRole type still importable from configs
- **WHEN** external modules import `AgentRole` from `@/lib/agents/configs`
- **THEN** the import SHALL continue to work without changes

#### Scenario: Prompt builders still importable from prompts
- **WHEN** route handlers import `buildChatPrompt`, `buildPlanPrompt`, or `buildGenerateTasksPrompt` from `@/lib/agents/prompts`
- **THEN** the imports SHALL continue to work without changes

#### Scenario: getAgentConfig still importable from configs
- **WHEN** any module imports `getAgentConfig` or `agentConfigs` from `@/lib/agents/configs`
- **THEN** the imports SHALL continue to work without changes

## 1. Extract system prompts into prompts.ts

- [x] 1.1 Add `SYSTEM_PROMPTS: Record<AgentRole, string>` export to `lib/agents/prompts.ts` containing the three system prompt strings (architect, developer, reviewer) copied verbatim from `configs.ts`
- [x] 1.2 Verify the `import type { AgentRole } from './configs'` in `prompts.ts` uses `import type` syntax (already the case — confirm no change needed)

## 2. Slim down configs.ts

- [x] 2.1 Remove inline `systemPrompt` string literals from each `AgentConfig` entry in `configs.ts`
- [x] 2.2 Add `import { SYSTEM_PROMPTS } from './prompts'` to `configs.ts`
- [x] 2.3 Assign `systemPrompt: SYSTEM_PROMPTS[role]` for each role in the `agentConfigs` record

## 3. Verify no circular runtime dependency

- [x] 3.1 Confirm `prompts.ts → configs.ts` import is type-only and `configs.ts → prompts.ts` is the only runtime import direction
- [x] 3.2 Run `npx tsc --noEmit` and verify zero errors

## 4. Verify public API preservation

- [x] 4.1 Confirm all existing exports from `configs.ts` (`AgentRole`, `agentConfigs`, `getAgentConfig`, `getAvailableAgents`) remain unchanged
- [x] 4.2 Confirm all existing exports from `prompts.ts` (`buildChatPrompt`, `buildPlanPrompt`, `buildGenerateTasksPrompt`, `ConversationMessage`) remain unchanged
- [x] 4.3 Confirm no import changes needed in consumer files: `orchestrator.ts`, route handlers, `auto-mode/constants.ts`, `useAgentStream.ts`

## 5. Smoke test

- [x] 5.1 Start the dev server (`npm run dev`) and verify no runtime errors on the agent chat, planning, and task-generation flows

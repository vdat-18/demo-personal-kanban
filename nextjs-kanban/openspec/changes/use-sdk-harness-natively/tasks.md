## 1. Clean up registry

- [x] 1.1 Delete `lib/agents/registry.ts`
- [x] 1.2 Verify no file in the codebase imports from `registry.ts` (search for `./registry` and `lib/agents/registry`)

## 2. Update agent configs

- [x] 2.1 In `lib/agents/configs.ts`, import the five custom tool instances from `lib/agents/tools/index.ts`
- [x] 2.2 Add `tools` array to the `architect` AgentConfig containing `dbQueryTool` and `projectCreateTool`
- [x] 2.3 Add `tools` array to the `developer` AgentConfig containing `dbQueryTool`, `taskCreateTool`, `taskUpdateTool`, `taskDeleteTool`, and `projectCreateTool`
- [x] 2.4 Add `tools` array to the `reviewer` AgentConfig containing only `dbQueryTool`

## 3. Rewrite orchestrator

- [x] 3.1 Remove the singleton variables (`orchestratorInstance`, `toolRegistry`, `toolExecutor`) and the `getOrchestrator()` / `resetOrchestrator()` exports from `lib/agents/orchestrator.ts`
- [x] 3.2 Remove the `getToolRegistry()` and `getToolExecutor()` helper functions (no longer needed — tools are on configs)
- [x] 3.3 Update `runAgent` to construct a fresh `OpenMultiAgent({ defaultModel, defaultProvider, onProgress })` on each call, using `onProgress` from the function argument
- [x] 3.4 Update `runTeam` to construct a fresh `OpenMultiAgent` on each call with `onProgress` wired in
- [x] 3.5 Update `runTasks` to construct a fresh `OpenMultiAgent` on each call with `onProgress` wired in

## 4. Wire progress in the stream route

- [x] 4.1 In `app/api/agents/stream/route.ts`, confirm `onProgress` is passed as the third argument to `runAgent` — verify it now actually reaches the SDK via the orchestrator (no code change needed if signature already matches; just validate the wire-up works end-to-end)

## 5. Verify

- [x] 5.1 Run `npx tsc --noEmit` and confirm zero type errors
- [x] 5.2 Start the dev server and open the chat route (`/chat/[id]`); send a message and confirm streaming progress events appear in the UI (the animated breadcrumb pills during agent execution)

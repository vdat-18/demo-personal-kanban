# Tasks: Live Agent Cards

## Task 1: Extend getTasks() to include last conversation per task

- [ ] Add `includeLastConversation?: boolean` option to `getTasks()` in `lib/db/tasks.ts`
- [ ] When enabled, use Prisma `include` with `conversations: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, messages: true, tokenUsage: true } }`
- [ ] Return `lastConversation` as the first element of the conversations array (or null)
- [ ] Verify no N+1 queries via Prisma query logging

**Implements:** REQ-5

## Task 2: Update GET /api/tasks to pass through conversation include option

- [ ] Accept `includeLastConversation` query parameter in the tasks API route
- [ ] Pass the option through to `getTasks()`
- [ ] Update the React Query hook that fetches tasks to pass `includeLastConversation=true` on Mission Control pages

**Implements:** REQ-5

## Task 3: Extract TaskCard component from MissionControlClient

- [ ] Create `components/mission-control/TaskCard.tsx`
- [ ] Define props interface: `{ task: TaskWithProject; lastConversation: Conversation | null; isStreaming: boolean }`
- [ ] Move inline card JSX from `MissionControlClient.tsx` into `TaskCard`
- [ ] Replace inline JSX in `MissionControlClient` with `<TaskCard />` usage
- [ ] Verify existing card appearance is unchanged

**Implements:** REQ-4

## Task 4: Add last conversation snippet display to TaskCard

- [ ] Parse `lastConversation.messages` JSON array and extract the last message
- [ ] Apply truncation logic: 80 char limit with "…" suffix
- [ ] Prefix user messages with "You: "
- [ ] Render snippet below the description area on the card
- [ ] Handle edge cases: null conversation, empty messages array

**Implements:** REQ-1

## Task 5: Add token usage badge to TaskCard

- [ ] Compute total tokens from `lastConversation.tokenUsage` (input + output)
- [ ] Render a badge showing the total token count (e.g., "↗ 1,234 tokens")
- [ ] Hide badge when tokenUsage is null, zero, or no conversations exist
- [ ] Style consistently with existing priority and agent hint badges

**Implements:** REQ-2

## Task 6: Add streaming indicator using Zustand activeStreamingTaskIds store

- [ ] Add `activeStreamingTaskIds: Set<string>` state to `lib/stores/uiStore.ts`
- [ ] Add `addStreamingTask(id: string)` and `removeStreamingTask(id: string)` actions
- [ ] In `TaskCard`, read from `activeStreamingTaskIds` to determine `isStreaming`
- [ ] Render pulsing dot animation + "Agent working..." text when streaming
- [ ] Add CSS/Tailwind animation for the pulsing dot

**Implements:** REQ-3

## Task 7: Update useAgentStream to register/deregister active streaming task IDs

- [ ] On stream start, call `addStreamingTask(taskId)` from the Zustand store
- [ ] On stream completion, call `removeStreamingTask(taskId)`
- [ ] On stream error, call `removeStreamingTask(taskId)` in the error/finally handler
- [ ] Verify indicator appears and disappears correctly during agent runs

**Implements:** REQ-3

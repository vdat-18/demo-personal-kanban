# Spec: Live Agent Cards

## Requirements

### REQ-1: Task cards display last conversation snippet

**ADDED**

Task cards on Mission Control SHALL display a truncated snippet of the most recent conversation message. The snippet SHALL be limited to 80 characters with an ellipsis appended when truncated.

**WHEN** a task has at least one conversation with messages
**AND** the last message in the most recent conversation is from the assistant
**THEN** the card displays the assistant message content, truncated to 80 characters with "…" if it exceeds the limit.

**WHEN** a task has at least one conversation with messages
**AND** the last message in the most recent conversation is from the user
**THEN** the card displays "You: {content}", truncated to 80 characters with "…" if the combined string exceeds the limit.

**WHEN** a task has no conversations
**THEN** the card does not render a snippet area.

**WHEN** a task's most recent conversation has an empty messages array
**THEN** the card does not render a snippet area.

---

### REQ-2: Task cards display token usage

**ADDED**

Cards with conversations SHALL show a token usage badge displaying total tokens consumed across all conversations for that task.

**WHEN** a task has one or more conversations with tokenUsage data
**THEN** the card displays a badge showing the total token count (sum of input + output tokens across all conversations).

**WHEN** a task has conversations but all tokenUsage fields are null or zero
**THEN** the card does not display a token usage badge.

**WHEN** a task has no conversations
**THEN** the card does not display a token usage badge.

---

### REQ-3: Task cards show streaming indicator

**ADDED**

When an agent is actively streaming for a task, the corresponding card SHALL display a pulsing visual indicator.

**WHEN** an agent stream is active for a task (task ID is in the Zustand `activeStreamingTaskIds` set)
**THEN** the card displays a pulsing animated dot and the text "Agent working...".

**WHEN** the agent stream completes or errors for a task
**THEN** the pulsing indicator is removed from the card (task ID removed from `activeStreamingTaskIds`).

**WHEN** no agent stream is active for a task
**THEN** the card does not display any streaming indicator.

---

### REQ-4: TaskCard extracted as reusable component

**ADDED**

Card rendering SHALL be extracted from `MissionControlClient.tsx` into a standalone `TaskCard` component.

**WHEN** MissionControlClient renders task cards in the kanban columns
**THEN** it uses the `TaskCard` component at `components/mission-control/TaskCard.tsx`.

**WHEN** TaskCard receives `task`, `lastConversation` (nullable), and `isStreaming` props
**THEN** it renders the card with title, description snippet, priority badge, agent hint badge, last conversation snippet (if present), token usage badge (if applicable), and streaming indicator (if active).

**WHEN** TaskCard receives `lastConversation` as null and `isStreaming` as false
**THEN** it renders identically to the current inline card (backward compatible).

---

### REQ-5: Optimized task list query

**ADDED**

The tasks API SHALL support including the most recent conversation per task in a single query, avoiding N+1 query patterns.

**WHEN** `getTasks()` is called with the `includeLastConversation` option set to true
**THEN** it returns each task with its most recent conversation (ordered by `createdAt` descending, limited to 1), including the `messages` and `tokenUsage` fields.

**WHEN** `getTasks()` is called without the `includeLastConversation` option
**THEN** it returns tasks without conversation data (existing behavior, backward compatible).

**WHEN** a task has no conversations and `includeLastConversation` is true
**THEN** the `lastConversation` field on the returned task is null.
